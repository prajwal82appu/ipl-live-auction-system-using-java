// ==========================================================================
// IPL MEGA AUCTION 2026 - APPLICATION & SIMULATION ENGINE
// ==========================================================================

class IPLAuctionEngine {
  constructor() {
    this.mode = '4teams'; // '4teams' or '10teams'
    this.userTeam = null; // null for spectator/auctioneer, or 'CSK', 'RCB', etc.
    this.soundMuted = false;
    this.speed = 1; // 1x, 2x, 5x, 999 (instant)

    this.teams = {};
    this.players = [];
    this.queue = [];
    this.soldPlayers = [];
    this.unsoldPlayers = [];
    this.auctionLog = []; // all bids for current player

    this.activePlayer = null;
    this.currentBid = 0.0;
    this.highestBidder = null;
    this.bidCount = 0;
    this.lastSoldInfo = null;

    this.timer = null;
    this.timeLeft = 8;
    this.maxTime = 8;
    this.isPaused = false;
    this.isAutoRunning = false;
    this.pendingRTM = null;

    this.initConfetti();
  }

  init() {
    this.setupTeams();
    this.setupQueue();
    this.setupUI();
    this.updateStatsRibbon();
    this.renderFranchisePaddles();
    this.renderQueuePreview();
    this.renderRosters();
    this.renderPowerRatings();
    this.renderCatalog();
    this.renderLeaderboard();
  }

  setupTeams() {
    this.teams = {};
    const teamKeys = this.mode === '4teams'
      ? ['CSK', 'RCB', 'MI', 'KKR']
      : ['CSK', 'RCB', 'MI', 'KKR', 'SRH', 'GT', 'RR', 'DC', 'LSG', 'PBKS'];

    const squadCap = this.mode === '4teams' ? 11 : 15;
    const startingPurse = this.mode === '4teams' ? 100.0 : 120.0;

    teamKeys.forEach(code => {
      const def = FRANCHISE_DEFS[code];
      this.teams[code] = {
        ...def,
        purse: startingPurse,
        startingPurse: startingPurse,
        squadLimit: squadCap,
        squad: [],
        spent: 0.0,
        rtmLeft: def.rtmCount,
        roleCounts: { BATTER: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKETKEEPER: 0 }
      };
    });
  }

  setupQueue() {
    // Clone players and shuffle
    this.players = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
    this.queue = [...this.players];
    this.shuffle(this.queue);
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // ==========================================================================
  // AUCTION FLOW & ACTIONS
  // ==========================================================================

  nextPlayer(playerToLoad = null) {
    if (this.activePlayer) {
      this.logFeed(`Finish bidding for ${this.activePlayer.name} first!`, 'warn');
      return;
    }

    if (playerToLoad) {
      const idx = this.queue.findIndex(p => p.id === playerToLoad.id);
      if (idx !== -1) {
        this.activePlayer = this.queue.splice(idx, 1)[0];
      } else {
        this.activePlayer = playerToLoad;
      }
    } else {
      if (this.queue.length === 0) {
        this.logFeed('All players in the queue have been presented!', 'sold');
        alert('Auction complete! All available players have been processed.');
        return;
      }
      this.activePlayer = this.queue.shift();
    }

    this.currentBid = 0.0;
    this.highestBidder = null;
    this.bidCount = 0;
    this.lastSoldInfo = null;
    this.auctionLog = [];

    this.renderActivePlayer();
    this.renderQueuePreview();
    this.updateBidButtons();

    window.soundEngine.playGavel();
    this.animateGavel();
    this.logFeed(`🏏 On the block: <strong>${this.activePlayer.name}</strong> (${this.activePlayer.role}) Base: ₹${this.activePlayer.basePrice.toFixed(2)} Cr`, 'info');

    this.resetTimer(8, 'Waiting for Opening Bid...');

    // Trigger AI decision if in auto mode or if AI wants to open
    if (this.isAutoRunning) {
      setTimeout(() => this.aiBidCheck(), 500 / this.speed);
    } else {
      setTimeout(() => this.aiBidCheck(), 1200);
    }
  }

  placeBid(teamCode, customAmount = null) {
    if (!this.activePlayer) {
      this.logFeed('No player on the auction block!', 'warn');
      return false;
    }

    const team = this.teams[teamCode];
    if (!team) return false;

    // Check if team is full
    if (team.squad.length >= team.squadLimit) {
      if (teamCode === this.userTeam) alert(`${team.name} squad is already full (${team.squadLimit}/${team.squadLimit})!`);
      return false;
    }

    // Determine bid amount
    let bidAmount;
    if (customAmount) {
      bidAmount = customAmount;
    } else {
      if (this.currentBid === 0) {
        bidAmount = this.activePlayer.basePrice;
      } else {
        bidAmount = Math.round((this.currentBid + AUCTION_SETTINGS.bidIncrement) * 100) / 100;
      }
    }

    // Check if same bidder is trying to outbid itself
    if (this.highestBidder === teamCode) {
      return false;
    }

    // Check financial constraint
    const emptySlots = team.squadLimit - team.squad.length;
    const remainingPurseAfter = team.purse - bidAmount;
    const requiredReserve = (emptySlots - 1) * AUCTION_SETTINGS.minPlayerBase;

    if (remainingPurseAfter < requiredReserve) {
      if (teamCode === this.userTeam) {
        alert(`Cannot bid ₹${bidAmount.toFixed(2)} Cr! You need to reserve ₹${requiredReserve.toFixed(2)} Cr for remaining ${emptySlots - 1} slots.`);
      }
      return false;
    }

    // Bid Accepted!
    this.currentBid = bidAmount;
    this.highestBidder = teamCode;
    this.bidCount++;

    const logEntry = {
      team: teamCode,
      amount: bidAmount,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    this.auctionLog.push(logEntry);

    // Audio & visuals
    window.soundEngine.playBid();
    this.animateGavel();
    this.logFeed(`💰 <strong>${team.name}</strong> bids <strong>₹${bidAmount.toFixed(2)} Cr</strong>`, 'bid');

    this.updateBidDisplay();
    this.renderFranchisePaddles();
    this.updateBidButtons();

    // Reset countdown timer
    this.resetTimer(6, `${team.name} leading at ₹${bidAmount.toFixed(2)} Cr`);

    // Let AI reconsider
    if (this.isAutoRunning) {
      setTimeout(() => this.aiBidCheck(), 400 / this.speed);
    } else {
      setTimeout(() => this.aiBidCheck(), Math.random() * 800 + 800);
    }

    return true;
  }

  aiBidCheck() {
    if (!this.activePlayer || this.pendingRTM) return;

    // Filter available bidders
    const candidateTeams = Object.keys(this.teams).filter(code => {
      if (code === this.highestBidder) return false;
      if (code === this.userTeam) return false; // user bids manually

      const t = this.teams[code];
      if (t.squad.length >= t.squadLimit) return false;

      const nextPrice = this.currentBid === 0 ? this.activePlayer.basePrice : this.currentBid + AUCTION_SETTINGS.bidIncrement;
      const emptySlots = t.squadLimit - t.squad.length;
      if (t.purse - nextPrice < (emptySlots - 1) * AUCTION_SETTINGS.minPlayerBase) return false;

      // AI Valuation Strategy
      const valuation = this.calculateAiValuation(t, this.activePlayer);
      return nextPrice <= valuation;
    });

    if (candidateTeams.length > 0) {
      // Pick a candidate with probability weighted by interest
      const chosen = candidateTeams[Math.floor(Math.random() * candidateTeams.length)];
      this.placeBid(chosen);
    }
  }

  calculateAiValuation(team, player) {
    const base = player.basePrice;
    const rating = player.rating; // 70 to 95
    const isMarquee = player.tier === 'Marquee';

    // Need factor: Does team have unfilled role requirement?
    const roleNeeded = team.roleCounts[player.role] < team.minRoles[player.role];
    let needMultiplier = roleNeeded ? 1.4 : 0.95;

    // Purse abundance factor
    const avgPursePerSlot = team.purse / Math.max(1, (team.squadLimit - team.squad.length));
    const budgetFactor = avgPursePerSlot / 8.0;

    let maxWilling = base * (rating / 75.0) * needMultiplier * (0.9 + Math.random() * 0.4);

    if (isMarquee) {
      maxWilling = Math.max(maxWilling, base * 3.5 + Math.random() * 6.0);
    }

    // Cap to realistic percentage of purse
    const maxAllowable = team.purse - ((team.squadLimit - team.squad.length - 1) * AUCTION_SETTINGS.minPlayerBase);
    return Math.min(maxWilling, maxAllowable * 0.45);
  }

  sellCurrentPlayer() {
    if (!this.activePlayer) return;

    if (!this.highestBidder) {
      this.skipCurrentPlayer();
      return;
    }

    clearInterval(this.timer);

    // Check Right to Match (RTM) rule!
    const pastTeamCode = this.activePlayer.pastTeam;
    const pastTeam = this.teams[pastTeamCode];

    if (pastTeam &&
      pastTeamCode !== this.highestBidder &&
      pastTeam.rtmLeft > 0 &&
      pastTeam.squad.length < pastTeam.squadLimit) {

      const emptySlots = pastTeam.squadLimit - pastTeam.squad.length;
      if (pastTeam.purse - this.currentBid >= (emptySlots - 1) * AUCTION_SETTINGS.minPlayerBase) {
        // Trigger RTM Opportunity!
        this.triggerRTMOpportunity(pastTeamCode);
        return;
      }
    }

    // Finalize Sale directly
    this.finalizeSale(this.highestBidder);
  }

  triggerRTMOpportunity(pastTeamCode) {
    const pastTeam = this.teams[pastTeamCode];
    this.pendingRTM = {
      teamCode: pastTeamCode,
      player: this.activePlayer,
      price: this.currentBid
    };

    window.soundEngine.playRTM();
    this.logFeed(`⚡ <strong>RTM ALERT!</strong> ${pastTeam.name} has the option to match ₹${this.currentBid.toFixed(2)} Cr for ${this.activePlayer.name}!`, 'rtm');

    if (pastTeamCode === this.userTeam) {
      // Show interactive RTM modal to user
      this.showRTMModal(pastTeamCode);
    } else {
      // AI evaluates RTM
      setTimeout(() => {
        const wantsRTM = this.activePlayer.rating >= 85 || this.activePlayer.tier === 'Marquee' || Math.random() > 0.45;
        if (wantsRTM) {
          this.executeRTM(true);
        } else {
          this.executeRTM(false);
        }
      }, 1500 / this.speed);
    }
  }

  showRTMModal(teamCode) {
    const modal = document.getElementById('rtm-modal');
    const msg = document.getElementById('rtm-modal-desc');
    const team = this.teams[teamCode];

    msg.innerHTML = `Do you want to use an <strong>RTM Card</strong> (${team.rtmLeft} left) to buy back <strong>${this.activePlayer.name}</strong> for <strong>₹${this.currentBid.toFixed(2)} Cr</strong>?`;
    modal.classList.add('active');
  }

  executeRTM(useMatch) {
    const modal = document.getElementById('rtm-modal');
    if (modal) modal.classList.remove('active');

    if (!this.pendingRTM) return;

    const { teamCode, price } = this.pendingRTM;
    const team = this.teams[teamCode];
    this.pendingRTM = null;

    if (useMatch) {
      team.rtmLeft--;
      this.highestBidder = teamCode;
      this.logFeed(`🔥 <strong>RTM EXERCISED!</strong> ${team.name} matched the bid of ₹${price.toFixed(2)} Cr!`, 'rtm');
      this.finalizeSale(teamCode, true);
    } else {
      this.logFeed(`❌ ${team.name} declined to use their RTM card.`, 'info');
      this.finalizeSale(this.highestBidder, false);
    }
  }

  finalizeSale(winnerCode, usedRTM = false) {
    const winner = this.teams[winnerCode];
    const player = this.activePlayer;
    const finalPrice = this.currentBid;

    // Deduct purse and add to squad
    winner.purse = Math.round((winner.purse - finalPrice) * 100) / 100;
    winner.spent = Math.round((winner.spent + finalPrice) * 100) / 100;
    player.sold = true;
    player.finalPrice = finalPrice;
    player.soldTo = winnerCode;
    winner.squad.push(player);
    winner.roleCounts[player.role]++;

    this.soldPlayers.push(player);

    // Audio and confetti
    window.soundEngine.playSold();
    this.triggerConfetti();
    this.logFeed(`🎉 <strong>SOLD!</strong> ${player.name} to <strong>${winner.name}</strong> for <strong>₹${finalPrice.toFixed(2)} Cr</strong>! 🔨`, 'sold');

    // UI Updates
    this.lastSoldInfo = {
      player: player,
      winner: winner,
      teamCode: winnerCode,
      finalPrice: finalPrice
    };
    this.activePlayer = null;
    this.highestBidder = null;
    this.currentBid = 0.0;

    this.renderActivePlayer();
    this.updateStatsRibbon();
    this.renderFranchisePaddles();
    this.renderRosters();
    this.renderPowerRatings();
    this.renderLeaderboard();
    this.renderCatalog();
    this.updateBidButtons();

    // Check if auction is completed
    this.checkAuctionCompletion();

    // Auto run next player if active
    if (this.isAutoRunning) {
      setTimeout(() => this.nextPlayer(), 1200 / this.speed);
    }
  }

  skipCurrentPlayer() {
    if (!this.activePlayer) return;

    clearInterval(this.timer);
    const player = this.activePlayer;
    player.sold = false;
    player.soldTo = 'UNSOLD';
    player.finalPrice = 0.0;
    this.unsoldPlayers.push(player);

    window.soundEngine.playUnsold();
    this.logFeed(`⚠️ <strong>UNSOLD:</strong> ${player.name} finds no buyers at base price ₹${player.basePrice.toFixed(2)} Cr.`, 'unsold');

    this.activePlayer = null;
    this.highestBidder = null;
    this.currentBid = 0.0;

    this.renderActivePlayer();
    this.updateStatsRibbon();
    this.renderFranchisePaddles();
    this.renderLeaderboard();
    this.renderCatalog();
    this.updateBidButtons();

    if (this.isAutoRunning) {
      setTimeout(() => this.nextPlayer(), 1000 / this.speed);
    }
  }

  // ==========================================================================
  // COUNTDOWN TIMER & GAVEL ANIMATION
  // ==========================================================================

  resetTimer(seconds, calloutText = '') {
    clearInterval(this.timer);
    this.timeLeft = seconds;
    this.maxTime = seconds;
    this.updateTimerDisplay(calloutText);

    const stepMs = 1000 / this.speed;
    this.timer = setInterval(() => {
      if (this.isPaused || this.pendingRTM) return;

      this.timeLeft--;
      if (this.timeLeft >= 1 && this.timeLeft <= 3) {
        window.soundEngine.playWarning();
      } else if (this.timeLeft > 3) {
        window.soundEngine.playTick();
      }

      this.updateTimerDisplay(calloutText);

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.sellCurrentPlayer();
      }
    }, stepMs);
  }

  updateTimerDisplay(calloutText) {
    const numEl = document.getElementById('timer-seconds-num');
    const circleEl = document.getElementById('timer-progress-ring');
    const calloutEl = document.getElementById('timer-callout-text');

    if (numEl) numEl.textContent = this.timeLeft;
    if (calloutEl && calloutText) calloutEl.textContent = calloutText;

    if (circleEl) {
      const circumference = 163.36; // 2 * PI * 26
      const offset = circumference - (this.timeLeft / this.maxTime) * circumference;
      circleEl.style.strokeDashoffset = offset;

      if (this.timeLeft <= 3) {
        circleEl.classList.add('urgent');
      } else {
        circleEl.classList.remove('urgent');
      }
    }
  }

  animateGavel() {
    const wrap = document.getElementById('gavel-anim-wrap');
    if (!wrap) return;
    wrap.classList.remove('strike');
    void wrap.offsetWidth; // re-trigger reflow
    wrap.classList.add('strike');
  }

  // ==========================================================================
  // UI RENDERING
  // ==========================================================================

  setupUI() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        const el = document.getElementById(target);
        if (el) el.classList.add('active');
      });
    });

    // Mode Toggle (4 Teams vs 10 Teams)
    const mode4 = document.getElementById('mode-4teams');
    const mode10 = document.getElementById('mode-10teams');
    if (mode4 && mode10) {
      mode4.addEventListener('click', () => this.switchMode('4teams'));
      mode10.addEventListener('click', () => this.switchMode('10teams'));
    }

    // User Team Picker
    const userTeamSelect = document.getElementById('user-team-select');
    if (userTeamSelect) {
      userTeamSelect.addEventListener('change', (e) => {
        this.userTeam = e.target.value === 'NONE' ? null : e.target.value;
        this.renderFranchisePaddles();
        this.logFeed(this.userTeam ? `🎮 You are now managing <strong>${this.teams[this.userTeam].name}</strong>!` : 'Spectator / Neutral Auctioneer Mode active.', 'info');
      });
    }

    // Sound Toggle
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.soundMuted = !this.soundMuted;
        window.soundEngine.setMuted(this.soundMuted);
        soundBtn.innerHTML = this.soundMuted ? '🔇 Audio Off' : '🔊 Audio On';
        soundBtn.classList.toggle('active', !this.soundMuted);
      });
    }

    // Primary Action Buttons
    const btnNext = document.getElementById('btn-next-player');
    const btnSell = document.getElementById('btn-sell-player');
    const btnSkip = document.getElementById('btn-skip-player');

    if (btnNext) btnNext.addEventListener('click', () => this.nextPlayer());
    if (btnSell) btnSell.addEventListener('click', () => this.sellCurrentPlayer());
    if (btnSkip) btnSkip.addEventListener('click', () => this.skipCurrentPlayer());

    // Auto Simulation Buttons
    const btnAuto = document.getElementById('btn-auto-auction');
    if (btnAuto) {
      btnAuto.addEventListener('click', () => {
        this.isAutoRunning = !this.isAutoRunning;
        btnAuto.innerHTML = this.isAutoRunning ? '⏸ Pause Auto' : '⚡ Auto Auction';
        btnAuto.classList.toggle('active', this.isAutoRunning);
        if (this.isAutoRunning && !this.activePlayer) {
          this.nextPlayer();
        }
      });
    }

    // Speed Controls
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.speed = parseFloat(btn.dataset.speed);
      });
    });

    // Custom Increments
    document.querySelectorAll('.inc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const inc = parseFloat(btn.dataset.inc);
        if (this.userTeam) {
          const target = this.currentBid === 0 ? this.activePlayer.basePrice : this.currentBid + inc;
          this.placeBid(this.userTeam, Math.round(target * 100) / 100);
        } else {
          // If spectator, raise by increment with default or current leader
          alert('Select a franchise to play as in the top-right to bid directly, or click a team paddle!');
        }
      });
    });

    // RTM Modal Buttons
    const rtmYes = document.getElementById('btn-rtm-match');
    const rtmNo = document.getElementById('btn-rtm-pass');
    if (rtmYes) rtmYes.addEventListener('click', () => this.executeRTM(true));
    if (rtmNo) rtmNo.addEventListener('click', () => this.executeRTM(false));

    // Catalog Search & Filter
    const searchInp = document.getElementById('catalog-search-input');
    const roleSel = document.getElementById('catalog-role-filter');
    const statusSel = document.getElementById('catalog-status-filter');
    if (searchInp) searchInp.addEventListener('input', () => this.renderCatalog());
    if (roleSel) roleSel.addEventListener('change', () => this.renderCatalog());
    if (statusSel) statusSel.addEventListener('change', () => this.renderCatalog());

    // Export CSV
    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportCsv());

    // Re-Auction Unsold Pool
    const reAuctionBtn = document.getElementById('btn-reauction-unsold');
    if (reAuctionBtn) reAuctionBtn.addEventListener('click', () => this.reAuctionUnsold());

    // Final Rosters Modal Buttons
    const btnFinal = document.getElementById('btn-final-results');
    if (btnFinal) btnFinal.addEventListener('click', () => this.showFinalAuctionResults());

    const btnCloseFinal = document.getElementById('btn-close-final-modal');
    if (btnCloseFinal) btnCloseFinal.addEventListener('click', () => {
      document.getElementById('final-results-modal')?.classList.remove('active');
    });
  }

  switchMode(newMode) {
    if (this.mode === newMode) return;
    if (confirm('Switching modes will reset the current auction. Proceed?')) {
      this.mode = newMode;
      document.getElementById('mode-4teams').classList.toggle('active', newMode === '4teams');
      document.getElementById('mode-10teams').classList.toggle('active', newMode === '10teams');

      // Update team selector dropdown
      const sel = document.getElementById('user-team-select');
      if (sel) {
        sel.innerHTML = '<option value="NONE">Spectator / Neutral</option>';
        const keys = newMode === '4teams' ? ['CSK', 'RCB', 'MI', 'KKR'] : ['CSK', 'RCB', 'MI', 'KKR', 'SRH', 'GT', 'RR', 'DC', 'LSG', 'PBKS'];
        keys.forEach(k => {
          sel.innerHTML += `<option value="${k}">${FRANCHISE_DEFS[k].name}</option>`;
        });
      }
      this.init();
    }
  }

  updateStatsRibbon() {
    const total = INITIAL_PLAYERS.length;
    const sold = this.soldPlayers.length;
    const unsold = this.unsoldPlayers.length;
    const remaining = this.queue.length + (this.activePlayer ? 1 : 0);

    const totalSpent = Object.values(this.teams).reduce((sum, t) => sum + t.spent, 0);
    const avgPrice = sold > 0 ? (totalSpent / sold) : 0;

    document.getElementById('stat-total-players').textContent = total;
    document.getElementById('stat-sold-players').textContent = sold;
    document.getElementById('stat-unsold-players').textContent = unsold;
    document.getElementById('stat-remaining-players').textContent = remaining;
    document.getElementById('stat-total-spent').textContent = `₹${
      totalSpent.toFixed(2)} Cr`;
    document.getElementById('stat-avg-price').textContent = `₹${avgPrice.toFixed(2)} Cr`;

    const catalogTabBtn = document.getElementById('tab-btn-catalog');
    if (catalogTabBtn) {
      catalogTabBtn.textContent = `🔍 Player Pool (${remaining})`;
    }
  }

  renderFranchisePaddles() {
    const container = document.getElementById('franchise-paddles-container');
    if (!container) return;

    container.innerHTML = '';
    Object.values(this.teams).forEach(team => {
      const isLeader = this.highestBidder === team.code;
      const isUser = this.userTeam === team.code;
      const isFull = team.squad.length >= team.squadLimit;

      const card = document.createElement('div');
      card.className = `team-paddle-card ${isLeader ? 'is-highest-bidder' : ''} ${isUser ? 'is-user-team' : ''}`;

      const nextBidAmount = this.currentBid === 0
        ? (this.activePlayer ? this.activePlayer.basePrice : 0.5)
        : Math.round((this.currentBid + AUCTION_SETTINGS.bidIncrement) * 100) / 100;

      card.innerHTML = `
        <div class="paddle-top-row">
          <div class="paddle-team-id">
            <div class="team-badge-circle" style="background: ${team.primary}; color: ${team.text};">
              ${team.badge}
            </div>
            <div class="team-name-info">
              <div class="code-line">
                <span>${team.code}</span>
                ${isUser ? '<span class="user-tag">YOU</span>' : ''}
                ${isLeader ? '👑' : ''}
              </div>
              <div class="motto">${team.tagline}</div>
            </div>
          </div>
          <div class="paddle-purse">
            <div class="purse-val">₹${team.purse.toFixed(2)} Cr</div>
            <div class="slots-val">Squad: ${team.squad.length}/${team.squadLimit} | RTM: ${team.rtmLeft}</div>
          </div>
        </div>
        <div class="paddle-role-pills">
          <div class="role-pill ${team.roleCounts.BATTER >= team.minRoles.BATTER ? 'met' : ''}">BAT ${team.roleCounts.BATTER}/${team.minRoles.BATTER}</div>
          <div class="role-pill ${team.roleCounts.BOWLER >= team.minRoles.BOWLER ? 'met' : ''}">BOWL ${team.roleCounts.BOWLER}/${team.minRoles.BOWLER}</div>
          <div class="role-pill ${team.roleCounts.ALL_ROUNDER >= team.minRoles.ALL_ROUNDER ? 'met' : ''}">AR ${team.roleCounts.ALL_ROUNDER}/${team.minRoles.ALL_ROUNDER}</div>
          <div class="role-pill ${team.roleCounts.WICKETKEEPER >= team.minRoles.WICKETKEEPER ? 'met' : ''}">WK ${team.roleCounts.WICKETKEEPER}/${team.minRoles.WICKETKEEPER}</div>
        </div>
        <div class="paddle-bidding-controls" style="display: flex; gap: 6px; margin-top: 8px;">
          <button class="bid-action-btn" id="paddle-btn-${team.code}" 
            style="flex: 1; background: ${team.primary}; color: ${team.text};" 
            ${(!this.activePlayer || isLeader || isFull) ? 'disabled' : ''}>
            ${isLeader ? '👑 LEADING' : (isFull ? 'SQUAD FULL' : `BID ₹${nextBidAmount.toFixed(2)} Cr`)}
          </button>
          <div class="manual-bid-group" style="display: flex; gap: 4px; align-items: center;">
            <input type="number" id="manual-input-${team.code}" step="0.25" min="${nextBidAmount}" placeholder="₹ Cr" 
              style="width: 65px; height: 32px; background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.25); border-radius: 6px; color: #fbbf24; font-weight: 700; font-size: 0.78rem; text-align: center; padding: 2px 4px;"
              ${(!this.activePlayer || isLeader || isFull) ? 'disabled' : ''}>
            <button id="manual-btn-${team.code}" class="manual-bid-submit-btn" 
              style="height: 32px; padding: 0 10px; background: ${team.primary}; color: ${team.text}; border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; font-weight: 700; font-size: 0.75rem; cursor: pointer;"
              ${(!this.activePlayer || isLeader || isFull) ? 'disabled' : ''}>
              Set
            </button>
          </div>
        </div>

        <!-- Acquired Squad Preview List -->
        <div class="paddle-squad-preview">
          <div class="paddle-squad-header">
            <span>Acquired Squad (${team.squad.length}/${team.squadLimit})</span>
            <span style="font-size: 0.68rem; color: var(--accent-gold);">Spent: ₹${team.spent.toFixed(2)} Cr</span>
          </div>
          <div class="paddle-squad-chips">
            ${team.squad.length === 0
          ? '<div style="font-size: 0.72rem; color: var(--text-dim); padding: 4px; text-align: center;">No players acquired yet</div>'
          : team.squad.map(p => {
            const isNewlySold = this.lastSoldInfo && this.lastSoldInfo.player.id === p.id;
            const roleIcon = p.role === 'BATTER' ? '🏏' : (p.role === 'BOWLER' ? '🎯' : (p.role === 'ALL_ROUNDER' ? '⚡' : '🧤'));
            return `
                    <div class="squad-mini-chip ${isNewlySold ? 'newly-acquired' : ''}">
                      <div class="chip-name" title="${p.name} (${p.role})">
                        <span>${roleIcon}</span> <span>${p.name}</span>
                      </div>
                      <div class="chip-price">₹${p.finalPrice.toFixed(2)} Cr</div>
                    </div>
                  `;
          }).join('')}
          </div>
        </div>
      `;

      card.querySelector(`#paddle-btn-${team.code}`).addEventListener('click', (e) => {
        e.stopPropagation();
        this.placeBid(team.code);
      });

      const manualBtn = card.querySelector(`#manual-btn-${team.code}`);
      const manualInput = card.querySelector(`#manual-input-${team.code}`);
      if (manualBtn && manualInput) {
        manualBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = parseFloat(manualInput.value);
          if (!isNaN(val) && val > 0) {
            if (this.currentBid > 0 && val <= this.currentBid) {
              alert(`Manual bid must be higher than current bid ₹${this.currentBid.toFixed(2)} Cr`);
              return;
            }
            if (this.activePlayer && val < this.activePlayer.basePrice) {
              alert(`Manual bid must be at least player base price ₹${this.activePlayer.basePrice.toFixed(2)} Cr`);
              return;
            }
            this.placeBid(team.code, val);
          } else {
            alert('Please enter a valid price in ₹ Cr (e.g. 14.50)');
          }
        });

        manualInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            manualBtn.click();
          }
        });
      }

      container.appendChild(card);
    });
  }

  renderActivePlayer() {
    const card = document.getElementById('player-spotlight-container');
    if (!card) return;

    if (!this.activePlayer) {
      if (this.lastSoldInfo) {
        const ls = this.lastSoldInfo;
        const winnerTeam = this.teams[ls.teamCode];
        const roleIcon = ls.player.role === 'BATTER' ? '🏏' : (ls.player.role === 'BOWLER' ? '🎯' : (ls.player.role === 'ALL_ROUNDER' ? '⚡' : '🧤'));
        card.innerHTML = `
          <div class="sold-announcement-card" style="border-color: ${winnerTeam.primary};">
            <div class="sold-ribbon-tag" style="background: ${winnerTeam.primary}; color: ${winnerTeam.text};">
              ✓ SOLD & ASSIGNED TO SQUAD
            </div>
            <div class="sold-team-destination">
              ${winnerTeam.badge} ${winnerTeam.name}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">
              Player is officially in <strong>${winnerTeam.code}</strong> squad (${winnerTeam.squad.length}/${winnerTeam.squadLimit} slots filled). They are off the auction block.
            </div>

            <div class="sold-player-profile">
              <div style="font-size: 2.4rem;">${roleIcon}</div>
              <div style="text-align: left;">
                <div class="sold-player-name">${ls.player.name} ${ls.player.flag}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${ls.player.role.replace('_', ' ')} • Age: ${ls.player.age} • Rating: ${ls.player.rating}/100</div>
              </div>
              <div style="margin-left: auto; text-align: right;">
                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Winning Bid</div>
                <div class="sold-final-amount">₹${ls.finalPrice.toFixed(2)} Cr</div>
              </div>
            </div>

            <div class="sold-actions-row">
              <button id="btn-sold-continue" class="btn-primary-action" style="max-width: 320px; padding: 12px 24px;">
                ▶ Auction Next Player (${this.queue.length} in Queue)
              </button>
            </div>
          </div>
        `;

        card.querySelector('#btn-sold-continue')?.addEventListener('click', () => {
          this.nextPlayer();
        });

        this.updateBidDisplay();
        return;
      }

      card.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-dim);">
          <div style="font-size: 3rem; margin-bottom: 10px;">🏏</div>
          <h3 style="color: var(--text-muted); font-size: 1.3rem;">No Player on the Auction Block</h3>
          <p style="font-size: 0.88rem; margin-top: 6px;">Click <strong>Next Player</strong> or select any player from the catalog to start bidding.</p>
        </div>
      `;
      this.updateBidDisplay();
      return;
    }

    const p = this.activePlayer;
    const roleClass = `role-${p.role.toLowerCase().replace('_', '')}`;
    const tierClass = `tier-${p.tier.toLowerCase()}`;

    let statItemsHtml = '';
    if (p.role === 'BATTER') {
      statItemsHtml = `
        <div class="stat-box"><div class="stat-name">Runs</div><div class="stat-val" style="color: var(--accent-gold);">${p.stats.runs}</div></div>
        <div class="stat-box"><div class="stat-name">Strike Rate</div><div class="stat-val" style="color: var(--accent-cyan);">${p.stats.sr}</div></div>
        <div class="stat-box"><div class="stat-name">T20 Sixes</div><div class="stat-val">${p.stats.sixes}</div></div>
        <div class="stat-box"><div class="stat-name">T20 Fours</div><div class="stat-val">${p.stats.fours}</div></div>
      `;
    } else if (p.role === 'BOWLER') {
      statItemsHtml = `
        <div class="stat-box"><div class="stat-name">Wickets</div><div class="stat-val" style="color: var(--accent-green);">${p.stats.wickets}</div></div>
        <div class="stat-box"><div class="stat-name">Economy</div><div class="stat-val" style="color: var(--accent-cyan);">${p.stats.econ}</div></div>
        <div class="stat-box"><div class="stat-name">Top Speed</div><div class="stat-val" style="color: var(--accent-gold);">${p.stats.speed}</div></div>
        <div class="stat-box"><div class="stat-name">Bowling Avg</div><div class="stat-val">${p.stats.avg || 24.5}</div></div>
      `;
    } else if (p.role === 'ALL_ROUNDER') {
      statItemsHtml = `
        <div class="stat-box"><div class="stat-name">Runs (SR)</div><div class="stat-val" style="color: var(--accent-gold);">${p.stats.runs} (${p.stats.sr})</div></div>
        <div class="stat-box"><div class="stat-name">6s & 4s</div><div class="stat-val">${p.stats.sixes} 6s / ${p.stats.fours} 4s</div></div>
        <div class="stat-box"><div class="stat-name">Wickets (Econ)</div><div class="stat-val" style="color: var(--accent-green);">${p.stats.wickets} (${p.stats.econ})</div></div>
        <div class="stat-box"><div class="stat-name">Top Speed</div><div class="stat-val">${p.stats.speed}</div></div>
      `;
    } else {
      statItemsHtml = `
        <div class="stat-box"><div class="stat-name">Runs</div><div class="stat-val" style="color: var(--accent-gold);">${p.stats.runs}</div></div>
        <div class="stat-box"><div class="stat-name">Strike Rate</div><div class="stat-val" style="color: var(--accent-cyan);">${p.stats.sr}</div></div>
        <div class="stat-box"><div class="stat-name">⚡ Stumpings</div><div class="stat-val" style="color: #C77DFF; font-weight: 800;">${p.stats.stumpings}</div></div>
        <div class="stat-box"><div class="stat-name">Catches / 6s</div><div class="stat-val">${p.stats.catches || 50} ct / ${p.stats.sixes} 6s</div></div>
      `;
    }

    card.innerHTML = `
      <div class="player-main-header">
        <div class="player-avatar-box">
          ${p.role === 'BATTER' ? '🏏' : (p.role === 'BOWLER' ? '🎯' : (p.role === 'ALL_ROUNDER' ? '⚡' : '🧤'))}
          <div class="player-country-flag">${p.flag}</div>
        </div>
        <div class="player-title-details">
          <div class="player-badges-row">
            <span class="badge-tag ${roleClass}">${p.role.replace('_', ' ')}</span>
            <span class="badge-tag ${tierClass}">★ ${p.tier}</span>
            <span class="badge-tag" style="background: rgba(255,255,255,0.08); color: #fff;">${p.country}</span>
            <span class="badge-tag" style="background: rgba(157, 78, 221, 0.15); color: #C77DFF;">RTM: ${p.pastTeam}</span>
          </div>
          <h2>${p.name}</h2>
          <div class="player-sub-meta">
            <span>Age: <strong>${p.age}</strong></span>
            <span>ID: <strong>${p.id}</strong></span>
            <span>Rating: <strong>${p.rating}/100</strong></span>
          </div>
        </div>
        <div class="player-base-badge">
          <div class="label">Base Price</div>
          <div class="amount">₹${p.basePrice.toFixed(2)} Cr</div>
        </div>
      </div>
      <div class="player-stats-grid">
        ${statItemsHtml}
      </div>
    `;

    this.updateBidDisplay();
  }

  updateBidDisplay() {
    const amountEl = document.getElementById('live-bid-amount');
    const leaderEl = document.getElementById('live-bid-leader');

    if (amountEl) {
      if (this.activePlayer) {
        amountEl.textContent = `₹${this.currentBid.toFixed(2)} Cr`;
      } else if (this.lastSoldInfo) {
        amountEl.textContent = `₹${this.lastSoldInfo.finalPrice.toFixed(2)} Cr`;
      } else {
        amountEl.textContent = '₹0.00 Cr';
      }
    }
    if (leaderEl) {
      if (this.activePlayer) {
        if (this.highestBidder) {
          const team = this.teams[this.highestBidder];
          leaderEl.innerHTML = `<span style="color: ${team.primary}">●</span> ${team.name} (${team.code})`;
        } else {
          leaderEl.textContent = 'Opening Price (No bids yet)';
        }
      } else if (this.lastSoldInfo) {
        const team = this.teams[this.lastSoldInfo.teamCode];
        leaderEl.innerHTML = `<span style="color: ${team.primary}">✓</span> SOLD TO ${team.name} (${team.code})`;
      } else {
        leaderEl.textContent = 'Waiting for player...';
      }
    }
  }

  updateBidButtons() {
    const btnNext = document.getElementById('btn-next-player');
    const btnSell = document.getElementById('btn-sell-player');
    const btnSkip = document.getElementById('btn-skip-player');

    if (btnNext) btnNext.disabled = !!this.activePlayer;
    if (btnSell) btnSell.disabled = !this.activePlayer || !this.highestBidder;
    if (btnSkip) btnSkip.disabled = !this.activePlayer;

    document.querySelectorAll('.inc-btn').forEach(btn => {
      btn.disabled = !this.activePlayer;
    });
  }

  renderQueuePreview() {
    const container = document.getElementById('upcoming-queue-container');
    if (!container) return;

    container.innerHTML = '';
    const nextFive = this.queue.slice(0, 5);

    if (nextFive.length === 0) {
      container.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-dim); text-align: center; padding: 10px;">Queue is empty</div>';
      return;
    }

    nextFive.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'queue-player-item';
      item.innerHTML = `
        <div class="name-row">
          <span style="color: var(--text-dim); font-size: 0.75rem;">#${idx + 1}</span>
          <span>${p.flag}</span>
          <span style="font-weight: 600;">${p.name}</span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">(${p.role[0]})</span>
        </div>
        <div class="base-price">₹${p.basePrice.toFixed(2)} Cr</div>
      `;
      container.appendChild(item);
    });
  }

  logFeed(message, type = 'info') {
    const box = document.getElementById('live-auction-feed');
    if (!box) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const item = document.createElement('div');
    item.className = `feed-item ${type}-event`;
    item.innerHTML = `
      <div>${message}</div>
      <div class="feed-time">${time}</div>
    `;

    box.insertBefore(item, box.firstChild);
    if (box.children.length > 50) {
      box.removeChild(box.lastChild);
    }
  }

  // ==========================================================================
  // TAB 2: ROSTERS
  // ==========================================================================

  renderRosters() {
    const container = document.getElementById('rosters-container');
    if (!container) return;

    container.innerHTML = '';
    Object.values(this.teams).forEach(team => {
      const card = document.createElement('div');
      card.className = 'roster-card';

      let rowsHtml = '';
      if (team.squad.length === 0) {
        rowsHtml = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 18px;">No players acquired yet</td></tr>`;
      } else {
        team.squad.forEach((p, i) => {
          rowsHtml += `
            <tr>
              <td style="color: var(--text-dim); width: 20px;">${i + 1}</td>
              <td><strong>${p.name}</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">${p.flag}</span></td>
              <td style="color: var(--text-muted);">${p.role.replace('_', ' ')}</td>
              <td class="player-price-col">₹${p.finalPrice.toFixed(2)} Cr</td>
            </tr>
          `;
        });
      }

      card.innerHTML = `
        <div class="roster-header">
          <div class="roster-team-title">
            <div class="team-badge-circle" style="background: ${team.primary}; color: ${team.text}; font-size: 1.1rem;">
              ${team.badge}
            </div>
            <div>
              <h3 style="font-family: var(--font-heading); font-size: 1.1rem;">${team.name}</h3>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${team.tagline}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--font-mono); font-weight: 800; font-size: 1.1rem; color: var(--accent-gold);">
              ₹${team.purse.toFixed(2)} Cr
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Remaining Purse</div>
          </div>
        </div>
        <div class="roster-stats-row">
          <div><div class="stat-l">Squad Size</div><div class="stat-v">${team.squad.length}/${team.squadLimit}</div></div>
          <div><div class="stat-l">Total Spent</div><div class="stat-v">₹${team.spent.toFixed(2)} Cr</div></div>
          <div><div class="stat-l">RTM Left</div><div class="stat-v">${team.rtmLeft}</div></div>
        </div>
        <div style="max-height: 280px; overflow-y: auto;">
          <table class="squad-table">
            <thead>
              <tr><th>#</th><th>Player</th><th>Role</th><th style="text-align: right;">Price</th></tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;

      container.appendChild(card);
    });
  }

  // ==========================================================================
  // TAB 3: TEAM STRENGTH RADAR & ANALYTICS
  // ==========================================================================

  renderPowerRatings() {
    const container = document.getElementById('ratings-container');
    if (!container) return;

    container.innerHTML = '';
    Object.values(this.teams).forEach(team => {
      // Calculate indices
      let batSum = 0, batCount = 0;
      let bowlSum = 0, bowlCount = 0;
      let allRoundSum = 0;

      team.squad.forEach(p => {
        if (p.role === 'BATTER' || p.role === 'WICKETKEEPER') {
          batSum += p.rating;
          batCount++;
        } else if (p.role === 'BOWLER') {
          bowlSum += p.rating;
          bowlCount++;
        } else if (p.role === 'ALL_ROUNDER') {
          batSum += p.rating * 0.7;
          bowlSum += p.rating * 0.7;
          allRoundSum += p.rating;
        }
      });

      const batIndex = batCount > 0 ? Math.min(99, Math.round(batSum / Math.max(4, batCount) * 1.1)) : 20;
      const bowlIndex = bowlCount > 0 ? Math.min(99, Math.round(bowlSum / Math.max(3, bowlCount) * 1.1)) : 20;
      const balanceIndex = Math.min(99, Math.round((team.roleCounts.BATTER * 15 + team.roleCounts.BOWLER * 15 + team.roleCounts.ALL_ROUNDER * 20 + team.roleCounts.WICKETKEEPER * 15)));
      const efficiencyIndex = Math.min(99, Math.round((team.squad.length / team.squadLimit) * 50 + (team.purse / team.startingPurse) * 50));
      const powerScore = Math.round((batIndex * 0.35 + bowlIndex * 0.35 + balanceIndex * 0.2 + efficiencyIndex * 0.1));

      const card = document.createElement('div');
      card.className = 'rating-meter-card';
      card.innerHTML = `
        <div class="rating-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="team-badge-circle" style="background: ${team.primary}; color: ${team.text};">
              ${team.badge}
            </div>
            <div>
              <div style="font-family: var(--font-heading); font-weight: 700; font-size: 1.05rem;">${team.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${team.squad.length}/${team.squadLimit} Players Acquired</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="power-index-score">${powerScore}</div>
            <div style="font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase;">Power Rating</div>
          </div>
        </div>
        <div class="strength-bar-group">
          <div class="strength-metric">
            <div class="strength-meta"><span>Batting Firepower</span><span>${batIndex}%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width: ${batIndex}%; background: #00D2FF;"></div></div>
          </div>
          <div class="strength-metric">
            <div class="strength-meta"><span>Bowling Venom</span><span>${bowlIndex}%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width: ${bowlIndex}%; background: #FF6B00;"></div></div>
          </div>
          <div class="strength-metric">
            <div class="strength-meta"><span>Squad Balance</span><span>${balanceIndex}%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width: ${balanceIndex}%; background: #00E676;"></div></div>
          </div>
          <div class="strength-metric">
            <div class="strength-meta"><span>Purse Efficiency</span><span>${efficiencyIndex}%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width: ${efficiencyIndex}%; background: #FFC72C;"></div></div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ==========================================================================
  // TAB 4: CATALOG & SEARCH
  // ==========================================================================

  renderCatalog() {
    const tbody = document.getElementById('catalog-table-body');
    if (!tbody) return;

    const search = (document.getElementById('catalog-search-input')?.value || '').toLowerCase();
    const roleFilter = document.getElementById('catalog-role-filter')?.value || 'ALL';
    const statusFilter = document.getElementById('catalog-status-filter')?.value || 'AVAILABLE';

    tbody.innerHTML = '';

    const filtered = this.players.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search) || p.country.toLowerCase().includes(search);
      const matchRole = roleFilter === 'ALL' || p.role === roleFilter;

      let matchStatus = true;
      if (statusFilter === 'AVAILABLE') {
        matchStatus = !p.sold && !this.unsoldPlayers.some(u => u.id === p.id);
      } else if (statusFilter === 'SOLD') {
        matchStatus = p.sold;
      } else if (statusFilter === 'UNSOLD') {
        matchStatus = this.unsoldPlayers.some(u => u.id === p.id);
      } else if (statusFilter === 'ALL') {
        matchStatus = true;
      }

      return matchSearch && matchRole && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 24px;">No players match the selected filter</td></tr>`;
      return;
    }

    filtered.forEach(p => {
      let statusBadge = '<span style="color: var(--accent-cyan); font-weight: 600;">Available (Waiting)</span>';
      let actionHtml = '';

      if (p.sold) {
        statusBadge = `<span style="color: var(--accent-green); font-weight: 700;">SOLD to ${p.soldTo} (₹${p.finalPrice.toFixed(2)} Cr)</span>`;
        actionHtml = `<span style="color: var(--accent-green); font-size: 0.78rem; font-weight: 700;">✓ In ${p.soldTo} Squad</span>`;
      } else if (this.unsoldPlayers.some(u => u.id === p.id)) {
        statusBadge = '<span style="color: var(--accent-red); font-weight: 700;">UNSOLD</span>';
        actionHtml = `<button class="icon-btn" style="padding: 4px 10px; font-size: 0.75rem;">Re-Auction</button>`;
      } else if (this.activePlayer && this.activePlayer.id === p.id) {
        statusBadge = '<span style="color: var(--accent-gold); font-weight: 700;">ON BLOCK</span>';
        actionHtml = `<span style="color: var(--accent-gold); font-size: 0.78rem; font-weight: 700;">Bidding Now</span>`;
      } else {
        actionHtml = `<button class="icon-btn" style="padding: 4px 10px; font-size: 0.75rem;">Auction Now</button>`;
      }

      let statsHtml = '';
      if (p.role === 'BATTER') {
        statsHtml = `
          <div class="stat-badges-cluster">
            <span class="stat-chip highlight-gold"><span class="k">Runs:</span><span class="v">${p.stats.runs}</span></span>
            <span class="stat-chip highlight-cyan"><span class="k">SR:</span><span class="v">${p.stats.sr}</span></span>
            <span class="stat-chip"><span class="k">6s:</span><span class="v">${p.stats.sixes}</span></span>
            <span class="stat-chip"><span class="k">4s:</span><span class="v">${p.stats.fours}</span></span>
          </div>
        `;
      } else if (p.role === 'BOWLER') {
        statsHtml = `
          <div class="stat-badges-cluster">
            <span class="stat-chip highlight-green"><span class="k">Wkts:</span><span class="v">${p.stats.wickets}</span></span>
            <span class="stat-chip highlight-cyan"><span class="k">Econ:</span><span class="v">${p.stats.econ}</span></span>
            <span class="stat-chip highlight-gold"><span class="k">Speed:</span><span class="v">${p.stats.speed}</span></span>
          </div>
        `;
      } else if (p.role === 'WICKETKEEPER') {
        statsHtml = `
          <div class="stat-badges-cluster">
            <span class="stat-chip highlight-gold"><span class="k">Runs:</span><span class="v">${p.stats.runs}</span></span>
            <span class="stat-chip highlight-cyan"><span class="k">SR:</span><span class="v">${p.stats.sr}</span></span>
            <span class="stat-chip highlight-purple"><span class="k">⚡ Stumpings:</span><span class="v">${p.stats.stumpings}</span></span>
            <span class="stat-chip"><span class="k">6s:</span><span class="v">${p.stats.sixes}</span></span>
            <span class="stat-chip"><span class="k">4s:</span><span class="v">${p.stats.fours}</span></span>
          </div>
        `;
      } else {
        // ALL_ROUNDER
        statsHtml = `
          <div class="stat-badges-cluster">
            <span class="stat-chip highlight-gold"><span class="k">Runs:</span><span class="v">${p.stats.runs}</span></span>
            <span class="stat-chip highlight-cyan"><span class="k">SR:</span><span class="v">${p.stats.sr}</span></span>
            <span class="stat-chip highlight-green"><span class="k">Wkts:</span><span class="v">${p.stats.wickets}</span></span>
            <span class="stat-chip"><span class="k">Econ:</span><span class="v">${p.stats.econ}</span></span>
            <span class="stat-chip"><span class="k">Speed:</span><span class="v">${p.stats.speed}</span></span>
            <span class="stat-chip"><span class="k">6s:</span><span class="v">${p.stats.sixes}</span></span>
            <span class="stat-chip"><span class="k">4s:</span><span class="v">${p.stats.fours}</span></span>
          </div>
        `;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: var(--font-mono); color: var(--text-dim);">${p.id}</td>
        <td><strong>${p.name}</strong> ${p.flag}</td>
        <td><span class="badge-tag role-${p.role.toLowerCase().replace('_', '')}">${p.role.replace('_', ' ')}</span></td>
        <td>${p.age}</td>
        <td>${statsHtml}</td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-gold);">₹${p.basePrice.toFixed(2)} Cr</td>
        <td>${statusBadge}</td>
        <td>${actionHtml}</td>
      `;

      const btn = tr.querySelector('button');
      if (btn) {
        btn.addEventListener('click', () => {
          this.nextPlayer(p);
          // switch to live tab
          document.querySelector('[data-tab="tab-arena"]')?.click();
        });
      }

      tbody.appendChild(tr);
    });
  }

  // ==========================================================================
  // TAB 5: LEADERBOARD & RECORDS
  // ==========================================================================

  renderLeaderboard() {
    const topBuysContainer = document.getElementById('top-buys-list');
    const stealsContainer = document.getElementById('top-steals-list');
    const unsoldContainer = document.getElementById('unsold-pool-list');

    // Top Buys
    if (topBuysContainer) {
      topBuysContainer.innerHTML = '';
      const topBuys = [...this.soldPlayers].sort((a, b) => b.finalPrice - a.finalPrice).slice(0, 5);

      if (topBuys.length === 0) {
        topBuysContainer.innerHTML = '<div style="color: var(--text-dim); padding: 12px; font-size: 0.85rem;">No players sold yet</div>';
      } else {
        topBuys.forEach((p, idx) => {
          const div = document.createElement('div');
          div.className = 'leader-item';
          div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="leader-rank-badge">#${idx + 1}</div>
              <div>
                <div style="font-weight: 700;">${p.name} ${p.flag}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${p.role.replace('_', ' ')} • Sold to ${p.soldTo}</div>
              </div>
            </div>
            <div style="font-family: var(--font-mono); font-weight: 800; font-size: 1.15rem; color: var(--accent-gold);">
              ₹${p.finalPrice.toFixed(2)} Cr
            </div>
          `;
          topBuysContainer.appendChild(div);
        });
      }
    }

    // Top Steals (High Rating, Low Final Price)
    if (stealsContainer) {
      stealsContainer.innerHTML = '';
      const steals = [...this.soldPlayers]
        .filter(p => p.rating >= 80)
        .sort((a, b) => a.finalPrice - b.finalPrice)
        .slice(0, 5);

      if (steals.length === 0) {
        stealsContainer.innerHTML = '<div style="color: var(--text-dim); padding: 12px; font-size: 0.85rem;">No bargain steals recorded yet</div>';
      } else {
        steals.forEach((p, idx) => {
          const div = document.createElement('div');
          div.className = 'leader-item';
          div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="leader-rank-badge" style="color: var(--accent-green);">#${idx + 1}</div>
              <div>
                <div style="font-weight: 700;">${p.name} ${p.flag}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Rating ${p.rating}/100 • Sold to ${p.soldTo}</div>
              </div>
            </div>
            <div style="font-family: var(--font-mono); font-weight: 800; font-size: 1.1rem; color: var(--accent-green);">
              ₹${p.finalPrice.toFixed(2)} Cr
            </div>
          `;
          stealsContainer.appendChild(div);
        });
      }
    }

    // Unsold Pool
    if (unsoldContainer) {
      unsoldContainer.innerHTML = '';
      if (this.unsoldPlayers.length === 0) {
        unsoldContainer.innerHTML = '<div style="color: var(--text-dim); padding: 12px; font-size: 0.85rem;">No unsold players</div>';
      } else {
        this.unsoldPlayers.forEach(p => {
          const div = document.createElement('div');
          div.className = 'leader-item';
          div.innerHTML = `
            <div>
              <div style="font-weight: 600;">${p.name} ${p.flag}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${p.role.replace('_', ' ')} • Base: ₹${p.basePrice.toFixed(2)} Cr</div>
            </div>
            <span style="font-size: 0.75rem; color: var(--accent-red); font-weight: 700;">UNSOLD</span>
          `;
          unsoldContainer.appendChild(div);
        });
      }
    }
  }

  reAuctionUnsold() {
    if (this.unsoldPlayers.length === 0) {
      alert('There are no unsold players in the pool!');
      return;
    }
    const count = this.unsoldPlayers.length;
    this.queue.push(...this.unsoldPlayers);
    this.unsoldPlayers = [];
    this.shuffle(this.queue);

    this.updateStatsRibbon();
    this.renderQueuePreview();
    this.renderLeaderboard();
    this.renderCatalog();
    this.logFeed(`🔄 Accelerated Round! Returned <strong>${count} unsold players</strong> to the queue!`, 'rtm');
    alert(`Accelerated Round Activated! ${count} players added back to the block.`);
  }

  // ==========================================================================
  // EXPORT CSV
  // ==========================================================================

  exportCsv() {
    let csv = 'PlayerID,Name,Role,Country,BasePrice(Cr),FinalPrice(Cr),Status,SoldTo\n';
    this.players.forEach(p => {
      let status = 'Waiting';
      let soldTo = '-';
      let price = '0.00';

      if (p.sold) {
        status = 'Sold';
        soldTo = p.soldTo;
        price = p.finalPrice.toFixed(2);
      } else if (this.unsoldPlayers.some(u => u.id === p.id)) {
        status = 'Unsold';
      }
      csv += `${p.id},"${p.name}",${p.role},${p.country},${p.basePrice.toFixed(2)},${price},${status},${soldTo}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IPL_Auction_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================================================
  // FINAL RESULTS & OFFICIAL TEAM ROSTERS (POST-AUCTION)
  // ==========================================================================

  checkAuctionCompletion() {
    const allFull = Object.values(this.teams).every(t => t.squad.length >= t.squadLimit);
    const queueEmpty = this.queue.length === 0 && !this.activePlayer;

    if (allFull || queueEmpty) {
      setTimeout(() => {
        window.soundEngine.playSold();
        this.triggerConfetti();
        this.showFinalAuctionResults();
      }, 1000);
    }
  }

  showFinalAuctionResults() {
    const modal = document.getElementById('final-results-modal');
    const container = document.getElementById('final-teams-rosters-content');
    if (!modal || !container) return;

    container.innerHTML = '';

    Object.values(this.teams).forEach(team => {
      const card = document.createElement('div');
      card.className = 'final-team-roster-card';
      card.style.borderTop = `4px solid ${team.primary}`;

      let playerRows = '';
      if (team.squad.length === 0) {
        playerRows = '<div style="color: var(--text-dim); padding: 16px; text-align: center; font-size: 0.85rem;">No players acquired yet</div>';
      } else {
        team.squad.forEach((p, idx) => {
          let statBrief = '';
          if (p.role === 'BATTER') {
            statBrief = `${p.stats.runs} Runs • SR ${p.stats.sr} • ${p.stats.sixes} 6s • ${p.stats.fours} 4s`;
          } else if (p.role === 'BOWLER') {
            statBrief = `${p.stats.wickets} Wkts • Econ ${p.stats.econ} • ${p.stats.speed}`;
          } else if (p.role === 'WICKETKEEPER') {
            statBrief = `${p.stats.runs} Runs • SR ${p.stats.sr} • ⚡ ${p.stats.stumpings} Stumpings • ${p.stats.sixes} 6s`;
          } else {
            statBrief = `${p.stats.runs} Runs (SR ${p.stats.sr}) • ${p.stats.wickets} Wkts (${p.stats.speed}) • ${p.stats.sixes} 6s`;
          }

          playerRows += `
            <div class="final-player-row">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: var(--text-dim); font-size: 0.75rem; width: 20px;">#${idx + 1}</span>
                <div>
                  <div style="font-weight: 700; color: var(--text-main); font-size: 0.85rem;">
                    ${p.name} ${p.flag} <span style="font-size: 0.7rem; font-weight: normal; color: var(--text-muted);">(${p.role.replace('_', ' ')})</span>
                  </div>
                  <div style="font-size: 0.72rem; color: var(--accent-cyan);">${statBrief}</div>
                </div>
              </div>
              <div style="font-family: var(--font-mono); font-weight: 800; color: var(--accent-gold); font-size: 0.95rem;">
                ₹${p.finalPrice.toFixed(2)} Cr
              </div>
            </div>
          `;
        });
      }

      card.innerHTML = `
        <div class="final-team-top">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="team-badge-circle" style="background: ${team.primary}; color: ${team.text}; font-size: 1.15rem;">
              ${team.badge}
            </div>
            <div>
              <div style="font-family: var(--font-heading); font-weight: 800; font-size: 1.15rem; color: #FFFFFF;">
                ${team.name}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${team.tagline}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--font-mono); font-weight: 800; color: var(--accent-gold); font-size: 1.15rem;">
              ₹${team.spent.toFixed(2)} Cr
            </div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">Purse Left: ₹${team.purse.toFixed(2)} Cr</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; font-size: 0.7rem; background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 4px; text-align: center;">
          <div>Squad: <strong>${team.squad.length}/${team.squadLimit}</strong></div>
          <div>Bat: <strong>${team.roleCounts.BATTER}/${team.minRoles.BATTER}</strong></div>
          <div>Bowl: <strong>${team.roleCounts.BOWLER}/${team.minRoles.BOWLER}</strong></div>
          <div>AR: <strong>${team.roleCounts.ALL_ROUNDER}/${team.minRoles.ALL_ROUNDER}</strong></div>
          <div>WK: <strong>${team.roleCounts.WICKETKEEPER}/${team.minRoles.WICKETKEEPER}</strong></div>
        </div>

        <div style="max-height: 280px; overflow-y: auto;">
          ${playerRows}
        </div>
      `;

      container.appendChild(card);
    });

    modal.classList.add('active');
  }

  // ==========================================================================
  // CONFETTI BURST
  // ==========================================================================

  initConfetti() {
    this.confettiCanvas = document.getElementById('confetti-canvas');
    if (this.confettiCanvas) {
      this.confettiCtx = this.confettiCanvas.getContext('2d');
      this.resizeConfetti();
      window.addEventListener('resize', () => this.resizeConfetti());
    }
    this.particles = [];
  }

  resizeConfetti() {
    if (!this.confettiCanvas) return;
    this.confettiCanvas.width = window.innerWidth;
    this.confettiCanvas.height = window.innerHeight;
  }

  triggerConfetti() {
    if (!this.confettiCanvas || !this.confettiCtx) return;
    const colors = ['#FFC72C', '#FF6B00', '#00D2FF', '#00E676', '#9D4EDD', '#FFFFFF'];

    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.45,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        alpha: 1.0
      });
    }

    if (!this.animatingConfetti) {
      this.animatingConfetti = true;
      this.animateConfettiLoop();
    }
  }

  animateConfettiLoop() {
    if (!this.confettiCtx) return;
    this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.rotation += p.rotationSpeed;
      p.alpha -= 0.015;

      this.confettiCtx.save();
      this.confettiCtx.translate(p.x, p.y);
      this.confettiCtx.rotate((p.rotation * Math.PI) / 180);
      this.confettiCtx.globalAlpha = Math.max(0, p.alpha);
      this.confettiCtx.fillStyle = p.color;
      this.confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.confettiCtx.restore();

      if (p.alpha <= 0 || p.y > window.innerHeight) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.animateConfettiLoop());
    } else {
      this.animatingConfetti = false;
      this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
    }
  }
}

// Instantiate engine when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.auctionEngine = new IPLAuctionEngine();
  window.auctionEngine.init();
});
