#!/usr/bin/env node
/**
 * ============================================================================
 * IPL MEGA AUCTION 2026 - FULL CONSOLE / TERMINAL SYSTEM
 * Rich, Interactive, ANSI-Colored CLI Auction Platform
 * ============================================================================
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Load player & franchise data
const dataModule = require('./web/data.js');
const { INITIAL_PLAYERS, FRANCHISE_DEFS, AUCTION_SETTINGS } = dataModule;

// ANSI Colors and Styles
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright Foreground
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgDark: '\x1b[40m',
  bgYellow: '\x1b[43m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[0f');
}

function printHeader() {
  console.log(`${C.brightYellow}======================================================================================${C.reset}`);
  console.log(`${C.bold}${C.brightCyan}           🏏  IPL MEGA AUCTION 2026 - INTERACTIVE CONSOLE SYSTEM  🏏${C.reset}`);
  console.log(`${C.dim}           Official Player Auction Simulation & Management Engine (Terminal Edition)${C.reset}`);
  console.log(`${C.brightYellow}======================================================================================${C.reset}\n`);
}

class ConsoleAuctionApp {
  constructor() {
    this.mode = '4teams'; // Fixed to 4 teams: CSK, RCB, MI, KKR
    this.userTeam = null; // null for spectator/auctioneer or franchise code
    this.simSpeed = 'normal'; // 'fast', 'normal', 'instant'
    this.teams = {};
    this.players = [];
    this.queue = [];
    this.soldPlayers = [];
    this.unsoldPlayers = [];
    this.history = [];
    this.round = 1;
    this.bidIncrement = AUCTION_SETTINGS.bidIncrement || 0.5;
    this.isInitialized = false;
  }

  initAuction() {
    this.teams = {};
    const teamKeys = ['CSK', 'RCB', 'MI', 'KKR']; // Fixed 4 franchises

    const squadCap = 11;         // Exactly 11 players per team
    const startingPurse = 100.0; // Rs.100 Cr purse per team

    teamKeys.forEach(code => {
      const def = FRANCHISE_DEFS[code];
      this.teams[code] = {
        code: def.code,
        name: def.name,
        badge: def.badge || '🏏',
        tagline: def.tagline || '',
        startingPurse: startingPurse,
        purse: startingPurse,
        squadLimit: squadCap,
        maxOverseas: def.maxOverseas || 4,
        squad: [],
        spent: 0.0,
        rtmLeft: def.rtmCount || 2,
        roleCounts: { BATTER: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKETKEEPER: 0 },
        overseasCount: 0
      };
    });

    // Deep copy players
    this.players = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
    this.queue = [...this.players];
    this.shuffle(this.queue);
    this.soldPlayers = [];
    this.unsoldPlayers = [];
    this.history = [];
    this.round = 1;
    this.isInitialized = true;
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  canTeamBid(teamCode, player, amount) {
    const t = this.teams[teamCode];
    if (!t) return { ok: false, reason: 'Unknown franchise' };
    if (t.squad.length >= t.squadLimit) return { ok: false, reason: 'Squad limit reached' };
    if (player.isOverseas && t.overseasCount >= t.maxOverseas) return { ok: false, reason: 'Overseas quota full' };

    // Remaining slots reserve (must keep at least 0.5 Cr per remaining empty slot)
    const emptySlots = t.squadLimit - t.squad.length - 1;
    const reserveNeeded = Math.max(0, emptySlots * 0.5);
    if (t.purse - amount < reserveNeeded) {
      return { ok: false, reason: `Purse insufficient! Need ₹${reserveNeeded.toFixed(2)} Cr reserve for remaining ${emptySlots} slots` };
    }
    return { ok: true };
  }

  getTeamWillingness(teamCode, player) {
    const t = this.teams[teamCode];
    if (!t) return 0;
    const check = this.canTeamBid(teamCode, player, player.basePrice);
    if (!check.ok) return 0;

    let interestScore = 0.5;
    // Boost interest if role is scarce
    const roleCount = t.roleCounts[player.role] || 0;
    if (roleCount === 0) interestScore += 0.8;
    else if (roleCount < 2) interestScore += 0.4;

    // Boost if rating is high
    interestScore += (player.rating || 80) / 100;

    // Tier multiplier
    let maxMultiplier = 2.0;
    if (player.tier === 'Marquee') maxMultiplier = 6.5;
    else if (player.tier === 'Gold') maxMultiplier = 4.2;
    else if (player.tier === 'Silver') maxMultiplier = 2.8;

    // Purse factor
    const purseFactor = (t.purse / t.startingPurse);
    const maxBid = player.basePrice * (1 + (Math.random() * maxMultiplier * interestScore * purseFactor));
    return Math.min(t.purse - 2.0, maxBid);
  }

  async runInteractiveAuction() {
    clearScreen();
    printHeader();
    console.log(`${C.bold}${C.brightGreen}--- INTERACTIVE LIVE AUCTION ROOM ---${C.reset}\n`);

    if (!this.isInitialized) {
      this.initAuction();
    }

    console.log(`${C.brightCyan}Choose Auction Mode:${C.reset}`);
    console.log(`  [${C.bold}1${C.reset}] 🎮 ${C.bold}ALL 4 TEAMS MANUAL BIDDING${C.reset} (Recommended: Bid manually for CSK, RCB, MI, KKR with custom prices)`);
    console.log(`  [${C.bold}2${C.reset}] 🦁 ${C.bold}Single Franchise Mode${C.reset}     (Manage 1 team, AI manages the other 3)`);
    console.log(`  [${C.bold}3${C.reset}] 🎙️  ${C.bold}Spectator / Auto Simulation${C.reset} (Watch AI bid automatically)\n`);

    const modeChoice = await askQuestion(`${C.brightYellow}Enter mode (1-3, default 1): ${C.reset}`);
    const m = modeChoice.trim();

    if (m === '2') {
      console.log(`\n${C.cyan}Select your Franchise to manage:${C.reset}`);
      const teamCodes = Object.keys(this.teams);
      teamCodes.forEach((code, idx) => {
        const t = this.teams[code];
        console.log(`  [${C.bold}${idx + 1}${C.reset}] ${t.badge} ${C.bold}${t.code}${C.reset} - ${t.name} (Purse: ₹${t.purse.toFixed(2)} Cr)`);
      });
      const choice = await askQuestion(`\n${C.brightYellow}Enter choice (1-${teamCodes.length}): ${C.reset}`);
      const num = parseInt(choice.trim());
      if (num > 0 && num <= teamCodes.length) {
        this.userTeam = teamCodes[num - 1];
        console.log(`\n${C.green}✓ You are now managing: ${C.bold}${this.teams[this.userTeam].name} (${this.userTeam})${C.reset}\n`);
      } else {
        this.userTeam = 'CSK';
        console.log(`\n${C.green}✓ Defaulted to managing CSK${C.reset}\n`);
      }
    } else if (m === '3') {
      this.userTeam = null;
      console.log(`\n${C.cyan}✓ Mode set to Spectator / Auto Simulation${C.reset}\n`);
    } else {
      this.userTeam = 'ALL_MANUAL';
      console.log(`\n${C.brightGreen}✓ MODE SET: ALL 4 TEAMS MANUAL BIDDING (CSK, RCB, MI, KKR with custom price amounts)${C.reset}\n`);
    }
    await sleep(800);

    let lotNumber = this.soldPlayers.length + this.unsoldPlayers.length;

    while (this.queue.length > 0 || (this.round === 1 && this.unsoldPlayers.length > 0)) {
      if (this.queue.length === 0 && this.round === 1) {
        clearScreen();
        printHeader();
        console.log(`${C.bold}${C.brightMagenta}======================================================${C.reset}`);
        console.log(`${C.bold}${C.brightYellow}   ROUND 1 FINISHED! STARTING ACCELERATED ROUND 2     ${C.reset}`);
        console.log(`${C.dim}   Unsold players return for a second opportunity     ${C.reset}`);
        console.log(`${C.bold}${C.brightMagenta}======================================================${C.reset}\n`);
        this.round = 2;
        this.queue = [...this.unsoldPlayers];
        this.unsoldPlayers = [];
        this.shuffle(this.queue);
        await askQuestion(`${C.brightYellow}Press ENTER to start Round 2...${C.reset}`);
      }

      if (this.queue.length === 0) break;

      const player = this.queue.shift();
      lotNumber++;
      await this.auctionSinglePlayerInteractive(player, lotNumber);

      // Check if user wants to continue or return to menu
      console.log(`\n${C.dim}--------------------------------------------------------------------------------------${C.reset}`);
      const nextAction = await askQuestion(`${C.brightCyan}[ENTER] Next Lot | [v] View Sold Players (${this.soldPlayers.length}) | [s] Squads & Standings | [a] Auto-Simulate | [m] Menu: ${C.reset}`);
      const act = nextAction.trim().toLowerCase();
      if (act === 'v') {
        clearScreen();
        printHeader();
        this.displaySoldPlayersTable();
        await askQuestion(`\n${C.brightYellow}Press ENTER to resume auction...${C.reset}`);
      } else if (act === 's') {
        await this.displayFranchiseDashboard();
        await askQuestion(`${C.brightYellow}Press ENTER to resume auction...${C.reset}`);
      } else if (act === 'a') {
        await this.runFullSimulation(true);
        break;
      } else if (act === 'm') {
        break;
      }
    }

    clearScreen();
    printHeader();
    console.log(`${C.bold}${C.brightGreen}🎉 AUCTION COMPLETED! ALL SQUADS FINALIZED 🎉${C.reset}\n`);
    await this.displayLeaderboard();
    await askQuestion(`\n${C.brightYellow}Press ENTER to return to Main Menu...${C.reset}`);
  }

  async auctionSinglePlayerInteractive(player, lotNumber) {
    let currentBid = 0.0;
    let highestBidder = null;
    let bidHistory = [];
    let isBiddingOpen = true;
    let statusMsg = '';

    const isOvs = player.isOverseas ? `${C.brightMagenta}[OVERSEAS ✈️]${C.reset}` : `${C.brightGreen}[INDIAN 🇮🇳]${C.reset}`;
    const tierBadge = `${C.bgYellow}${C.black} ${player.tier || 'Standard'} ${C.reset}`;

    // Calculate AI max prices if in AI modes
    const aiMaxBids = {};
    if (this.userTeam !== 'ALL_MANUAL') {
      Object.keys(this.teams).forEach(code => {
        if (code !== this.userTeam) {
          aiMaxBids[code] = this.getTeamWillingness(code, player);
        }
      });
    }

    while (isBiddingOpen) {
      clearScreen();
      printHeader();

      console.log(`╭────────────────────────────────────────────────────────────────────────────────────╮`);
      console.log(`│ ${C.bold}${C.brightCyan}LOT #${lotNumber.toString().padStart(3, '0')}${C.reset}  │ ${C.bold}${C.brightWhite}${player.name.padEnd(25)}${C.reset} │ Age: ${(player.age || 26).toString().padEnd(2)} │ Role: ${C.bold}${player.role.padEnd(12)}${C.reset} │ ${tierBadge} │`);
      console.log(`├────────────────────────────────────────────────────────────────────────────────────┤`);
      console.log(`│ Country: ${player.country.padEnd(12)} ${isOvs.padEnd(20)} │ Base Price: ${C.bold}${C.brightYellow}₹${player.basePrice.toFixed(2)} Cr${C.reset} │ Rating: ${C.brightGreen}⭐ ${player.rating || 80}/100${C.reset} │`);

      if (player.stats) {
        const s = player.stats;
        const runsPart = `🏏 Runs: ${C.bold}${C.brightYellow}${s.runs ?? 0}${C.reset}`;
        const sixesPart = `💥 6s: ${C.bold}${C.brightYellow}${s.sixes ?? 0}${C.reset}`;
        const foursPart = `🎯 4s: ${C.bold}${C.brightYellow}${s.fours ?? 0}${C.reset}`;
        const srPart = `⚡ SR: ${C.bold}${s.sr ?? '-'}${C.reset}`;
        const wktsPart = `🎳 Wkts: ${C.bold}${C.brightGreen}${s.wickets ?? 0}${C.reset}`;
        const avgPart = `📊 Avg: ${s.avg ?? '-'}`;
        const econPart = s.econ ? ` | 📉 Econ: ${s.econ}` : '';
        const speedPart = s.speed ? ` | 🚀 ${s.speed}` : '';
        const stCtPart = s.stumpings !== undefined ? ` | 🧤 St: ${s.stumpings} Ct: ${s.catches}` : '';

        console.log(`├────────────────────────────────────────────────────────────────────────────────────┤`);
        console.log(`│ Stats: ${runsPart}  ${sixesPart}  ${foursPart}  ${srPart}  ${wktsPart}  ${avgPart}${econPart}${speedPart}${stCtPart}`);
      }
      console.log(`╰────────────────────────────────────────────────────────────────────────────────────╯\n`);

      // Display all 4 Franchises Status
      console.log(`  ${C.bold}${C.brightCyan}─── ALL 4 FRANCHISES STATUS & PURSE ───${C.reset}`);
      Object.keys(this.teams).forEach((code, idx) => {
        const t = this.teams[code];
        const isLeader = code === highestBidder;
        const isFull = t.squad.length >= t.squadLimit;
        const ovsFull = player.isOverseas && t.overseasCount >= t.maxOverseas;
        const slotsLeft = t.squadLimit - t.squad.length - 1;
        const reserve = Math.max(0, slotsLeft * 0.5);
        const maxBid = Math.max(0, +(t.purse - reserve).toFixed(2));

        let statusText = `${C.brightGreen}ELIGIBLE${C.reset}`;
        if (isLeader) statusText = `${C.bgYellow}${C.bold}${C.black} HIGHEST BIDDER 👑 ${C.reset}`;
        else if (isFull) statusText = `${C.red}SQUAD FULL (11/11)${C.reset}`;
        else if (ovsFull) statusText = `${C.red}OVS FULL (4/4)${C.reset}`;
        else if (maxBid < (highestBidder === null ? player.basePrice : currentBid + 0.01)) statusText = `${C.dim}NO PURSE${C.reset}`;

        console.log(`  [${C.bold}${idx + 1}${C.reset}] [${C.bold}${code}${C.reset}] ${t.badge} ${C.bold}${t.name.padEnd(28)}${C.reset} Purse: ${C.brightGreen}₹${t.purse.toFixed(2).padStart(6)} Cr${C.reset} | Squad: ${C.brightYellow}${t.squad.length}/${t.squadLimit}${C.reset} | OVS: ${t.overseasCount}/${t.maxOverseas} | Max Bid: ₹${maxBid.toFixed(2)} Cr | ${statusText}`);
      });
      console.log(`  ${C.dim}──────────────────────────────────────────────────────────────────────────────────────${C.reset}`);

      // Current bid status
      if (highestBidder) {
        const hbTeam = this.teams[highestBidder];
        console.log(`\n  🔥 ${C.bold}Current Highest Bid: ${C.brightYellow}₹${currentBid.toFixed(2)} Cr${C.reset} held by ${hbTeam.badge} ${C.bold}${hbTeam.code} (${hbTeam.name})${C.reset}`);
      } else {
        console.log(`\n  ⏳ ${C.dim}No bids placed yet. Opening Base Price: ${C.bold}${C.brightYellow}₹${player.basePrice.toFixed(2)} Cr${C.reset}`);
      }

      // Progression log
      if (bidHistory.length > 0) {
        console.log(`\n  ${C.dim}─── Bidding Progression ───${C.reset}`);
        bidHistory.forEach((b, i) => {
          const t = this.teams[b.team];
          console.log(`   ${C.dim}#${i + 1}${C.reset} ${t.badge} ${C.bold}${b.team}${C.reset} bid ${C.bold}${C.brightYellow}₹${b.amount.toFixed(2)} Cr${C.reset}`);
        });
      }

      if (statusMsg) {
        console.log(`\n  ${statusMsg}`);
        statusMsg = '';
      }

      // --- BRANCH A: ALL 4 TEAMS MANUAL BIDDING MODE ---
      if (this.userTeam === 'ALL_MANUAL') {
        const nextMin = highestBidder === null ? player.basePrice : +(currentBid + this.bidIncrement).toFixed(2);
        console.log(`\n  ${C.bold}${C.brightYellow}MANUAL BIDDING COMMANDS:${C.reset}`);
        console.log(`  • ${C.bold}Direct Bid & Price:${C.reset}  ${C.brightCyan}CSK 14.5${C.reset} | ${C.brightCyan}1 14.5${C.reset} | ${C.brightCyan}RCB 16${C.reset} | ${C.brightCyan}MI 18.5${C.reset} | ${C.brightCyan}KKR 20${C.reset}`);
        console.log(`  • ${C.bold}Team Prompt:${C.reset}         Enter ${C.brightCyan}CSK / RCB / MI / KKR${C.reset} or ${C.brightCyan}1 / 2 / 3 / 4${C.reset} -> then enter price`);
        console.log(`  • ${C.bold}Hammer Down / Sell:${C.reset}  Type ${C.brightGreen}SELL${C.reset} or ${C.brightGreen}S${C.reset} (sells to highest bidder at current manual price)`);
        console.log(`  • ${C.bold}Mark Unsold:${C.reset}         Type ${C.red}UNSOLD${C.reset} or ${C.red}U${C.reset} (marks player unsold)`);
        console.log(`  • ${C.bold}Rosters & Undo:${C.reset}      Type ${C.cyan}SQUADS${C.reset} (view rosters) | ${C.cyan}UNDO${C.reset} (revert last bid)`);

        const input = await askQuestion(`\n  ${C.brightYellow}🎙️  Manual Auctioneer > ${C.reset}`);
        const trimmed = input.trim();
        if (!trimmed) continue;

        const parts = trimmed.split(/\s+/);
        const rawCmd = parts[0].toUpperCase();
        const explicitAmt = parts[1];

        if (rawCmd === 'SELL' || rawCmd === 'S' || rawCmd === 'HAMMER' || rawCmd === 'H' || rawCmd === 'SOLD') {
          if (!highestBidder) {
            statusMsg = `${C.red}❌ No bids placed yet! Type UNSOLD or U to mark player unsold.${C.reset}`;
            continue;
          }
          isBiddingOpen = false;
          break;
        }

        if (rawCmd === 'UNSOLD' || rawCmd === 'U' || rawCmd === 'SKIP' || rawCmd === 'K' || rawCmd === 'PASS' || rawCmd === 'P') {
          highestBidder = null;
          isBiddingOpen = false;
          break;
        }

        if (rawCmd === 'SQUADS' || rawCmd === 'SQUAD' || rawCmd === 'D') {
          await this.displayFranchiseDashboard();
          await askQuestion(`\n${C.brightYellow}Press ENTER to resume bidding...${C.reset}`);
          continue;
        }

        if (rawCmd === 'UNDO' || rawCmd === 'RESET') {
          if (bidHistory.length === 0) {
            statusMsg = `${C.yellow}⚠️ No bids to undo.${C.reset}`;
          } else {
            bidHistory.pop();
            if (bidHistory.length === 0) {
              currentBid = 0.0;
              highestBidder = null;
            } else {
              const prev = bidHistory[bidHistory.length - 1];
              currentBid = prev.amount;
              highestBidder = prev.team;
            }
            statusMsg = `${C.brightGreen}✓ Last bid undone!${C.reset}`;
          }
          continue;
        }

        let targetTeam = null;
        if (rawCmd === '1' || rawCmd === 'CSK') targetTeam = 'CSK';
        else if (rawCmd === '2' || rawCmd === 'RCB') targetTeam = 'RCB';
        else if (rawCmd === '3' || rawCmd === 'MI') targetTeam = 'MI';
        else if (rawCmd === '4' || rawCmd === 'KKR') targetTeam = 'KKR';

        if (!targetTeam) {
          statusMsg = `${C.red}❌ Unknown command '${trimmed}'. Type CSK, RCB, MI, KKR, 1-4, SELL, or UNSOLD.${C.reset}`;
          continue;
        }

        let chosenAmount = null;
        if (explicitAmt !== undefined) {
          const p = parseFloat(explicitAmt);
          if (isNaN(p)) {
            statusMsg = `${C.red}❌ Invalid price '${explicitAmt}'. Example: 'CSK 14.50'${C.reset}`;
            continue;
          }
          chosenAmount = p;
        } else {
          const t = this.teams[targetTeam];
          const empty = t.squadLimit - t.squad.length - 1;
          const res = Math.max(0, empty * 0.5);
          const maxAllowed = +(t.purse - res).toFixed(2);
          const defMin = highestBidder === null ? player.basePrice : +(currentBid + this.bidIncrement).toFixed(2);

          const priceAns = await askQuestion(`  💰 ${t.badge} ${C.bold}Enter manual price in ₹ Cr for ${t.name}${C.reset} [Default: ₹${defMin.toFixed(2)} Cr, Max: ₹${maxAllowed.toFixed(2)} Cr]: `);
          const cPrice = priceAns.trim();
          if (!cPrice) {
            chosenAmount = defMin;
          } else {
            const p = parseFloat(cPrice);
            if (isNaN(p)) {
              statusMsg = `${C.red}❌ Invalid price entered.${C.reset}`;
              continue;
            }
            chosenAmount = p;
          }
        }

        // Validate Manual Bid
        chosenAmount = +(Number(chosenAmount).toFixed(2));
        if (targetTeam === highestBidder) {
          statusMsg = `${C.red}❌ ${targetTeam} is already the highest bidder!${C.reset}`;
          continue;
        }
        if (chosenAmount < player.basePrice) {
          statusMsg = `${C.red}❌ Bid ₹${chosenAmount.toFixed(2)} Cr is below base price ₹${player.basePrice.toFixed(2)} Cr.${C.reset}`;
          continue;
        }
        if (highestBidder !== null && chosenAmount <= currentBid) {
          statusMsg = `${C.red}❌ Bid ₹${chosenAmount.toFixed(2)} Cr must be higher than current bid ₹${currentBid.toFixed(2)} Cr.${C.reset}`;
          continue;
        }

        const can = this.canTeamBid(targetTeam, player, chosenAmount);
        if (!can.ok) {
          statusMsg = `${C.red}❌ ${can.reason}${C.reset}`;
          continue;
        }

        currentBid = chosenAmount;
        highestBidder = targetTeam;
        bidHistory.push({ team: targetTeam, amount: currentBid });
        statusMsg = `${C.brightGreen}⚡ BID ACCEPTED! ${this.teams[targetTeam].badge} ${this.teams[targetTeam].name} manually bids ₹${currentBid.toFixed(2)} Cr!${C.reset}`;
        continue;
      }

      // --- BRANCH B: SINGLE FRANCHISE OR SPECTATOR (AI) ---
      const nextBidAmount = highestBidder === null ? player.basePrice : +(currentBid + this.bidIncrement).toFixed(2);
      let userEligible = false;
      if (this.userTeam) {
        const canUser = this.canTeamBid(this.userTeam, player, nextBidAmount);
        userEligible = canUser.ok && this.userTeam !== highestBidder;
      }

      const interestedAIs = Object.keys(this.teams).filter(code => {
        if (code === this.userTeam || code === highestBidder) return false;
        const canBid = this.canTeamBid(code, player, nextBidAmount);
        return canBid.ok && (aiMaxBids[code] >= nextBidAmount);
      });

      if (this.userTeam && userEligible) {
        const uTeam = this.teams[this.userTeam];
        console.log(`\n  👉 ${uTeam.badge} ${C.bold}${uTeam.name}${C.reset} (Your Purse: ₹${uTeam.purse.toFixed(2)} Cr | Squad: ${uTeam.squad.length}/${uTeam.squadLimit}):`);
        console.log(`     [${C.bold}b${C.reset}] Bid ${C.brightYellow}₹${nextBidAmount.toFixed(2)} Cr${C.reset}  |  [${C.bold}p${C.reset}] Pass / Skip`);

        const ans = await askQuestion(`     ${C.brightCyan}Your action (b/p): ${C.reset}`);
        const clean = ans.trim().toLowerCase();

        if (clean === 'b') {
          currentBid = nextBidAmount;
          highestBidder = this.userTeam;
          bidHistory.push({ team: this.userTeam, amount: currentBid });
          console.log(`     ${C.brightGreen}⚡ BID PLACED! ${uTeam.code} bids ₹${currentBid.toFixed(2)} Cr!${C.reset}\n`);
          await sleep(600);
          continue;
        }
      }

      if (interestedAIs.length > 0) {
        const aiCode = interestedAIs[Math.floor(Math.random() * interestedAIs.length)];
        const aiTeam = this.teams[aiCode];
        currentBid = nextBidAmount;
        highestBidder = aiCode;
        bidHistory.push({ team: aiCode, amount: currentBid });
        console.log(`  ⚡ ${aiTeam.badge} ${C.bold}${C.brightCyan}${aiTeam.code}${C.reset} raises paddle: ${C.bold}${C.brightYellow}₹${currentBid.toFixed(2)} Cr!${C.reset}`);
        await sleep(500);
      } else {
        isBiddingOpen = false;
      }
    }

    // --- SALE FINALIZATION ---
    clearScreen();
    printHeader();

    if (highestBidder === null) {
      console.log(`\n  🔨 ${C.red}${C.bold}GOING ONCE... GOING TWICE... UNSOLD!${C.reset}`);
      player.sold = false;
      player.soldTo = '-';
      player.finalPrice = 0.0;
      this.unsoldPlayers.push(player);
      this.history.push({
        lot: lotNumber,
        player: player.name,
        role: player.role,
        round: this.round,
        sold: false,
        winner: '-',
        price: 0.0
      });
    } else {
      const winTeam = this.teams[highestBidder];
      console.log(`\n  🔨 ${C.brightGreen}${C.bold}GOING ONCE... GOING TWICE... SOLD TO ${winTeam.badge} ${winTeam.code} (${winTeam.name}) FOR ₹${currentBid.toFixed(2)} Cr!${C.reset} 🏏🎉`);

      winTeam.purse = +(winTeam.purse - currentBid).toFixed(2);
      winTeam.spent = +(winTeam.spent + currentBid).toFixed(2);
      winTeam.squad.push({ ...player, finalPrice: currentBid });
      winTeam.roleCounts[player.role] = (winTeam.roleCounts[player.role] || 0) + 1;
      if (player.isOverseas) winTeam.overseasCount++;

      player.sold = true;
      player.soldTo = winTeam.code;
      player.finalPrice = currentBid;
      this.soldPlayers.push(player);
      this.history.push({
        lot: lotNumber,
        player: player.name,
        role: player.role,
        round: this.round,
        sold: true,
        winner: winTeam.code,
        price: currentBid
      });
    }

    // Immediately display the updated Sold Players Table
    this.displaySoldPlayersTable();
  }

  async runFullSimulation(silent = false) {
    if (!silent) {
      clearScreen();
      printHeader();
      console.log(`${C.bold}${C.brightGreen}--- AUTOMATED FULL MEGA AUCTION SIMULATION ---${C.reset}\n`);
    }

    if (!this.isInitialized) {
      this.initAuction();
    }

    let lot = this.soldPlayers.length + this.unsoldPlayers.length;
    console.log(`${C.cyan}Simulating remaining ${this.queue.length} players across ${Object.keys(this.teams).length} franchises...${C.reset}\n`);

    while (this.queue.length > 0 || (this.round === 1 && this.unsoldPlayers.length > 0)) {
      if (this.queue.length === 0 && this.round === 1) {
        console.log(`\n${C.bold}${C.brightMagenta}>>> ROUND 1 FINISHED -> PROCEEDING TO ACCELERATED ROUND 2 <<<${C.reset}\n`);
        this.round = 2;
        this.queue = [...this.unsoldPlayers];
        this.unsoldPlayers = [];
        this.shuffle(this.queue);
      }

      if (this.queue.length === 0) break;

      const player = this.queue.shift();
      lot++;

      // Sim bidding
      let currentBid = 0.0;
      let highestBidder = null;

      const aiMaxBids = {};
      Object.keys(this.teams).forEach(code => {
        aiMaxBids[code] = this.getTeamWillingness(code, player);
      });

      while (true) {
        const nextAmount = highestBidder === null ? player.basePrice : +(currentBid + this.bidIncrement).toFixed(2);
        const eligible = Object.keys(this.teams).filter(code => {
          if (code === highestBidder) return false;
          const canBid = this.canTeamBid(code, player, nextAmount);
          return canBid.ok && aiMaxBids[code] >= nextAmount;
        });

        if (eligible.length === 0) break;
        const bidder = eligible[Math.floor(Math.random() * eligible.length)];
        currentBid = nextAmount;
        highestBidder = bidder;
      }

      if (highestBidder) {
        const team = this.teams[highestBidder];
        team.purse -= currentBid;
        team.spent += currentBid;
        team.squad.push({ ...player, finalPrice: currentBid });
        team.roleCounts[player.role] = (team.roleCounts[player.role] || 0) + 1;
        if (player.isOverseas) team.overseasCount++;

        player.sold = true;
        player.soldTo = team.code;
        player.finalPrice = currentBid;
        this.soldPlayers.push(player);
        this.history.push({
          lot: lot,
          player: player.name,
          role: player.role,
          round: this.round,
          sold: true,
          winner: team.code,
          price: currentBid
        });

        console.log(`Lot ${lot.toString().padStart(3, ' ')}: ${player.name.padEnd(24)} (${player.role.padEnd(12)}) -> ${C.brightGreen}SOLD${C.reset} to ${C.bold}${team.code.padEnd(4)}${C.reset} for ${C.brightYellow}₹${currentBid.toFixed(2).padStart(5, ' ')} Cr${C.reset}`);
      } else {
        player.sold = false;
        player.soldTo = '-';
        player.finalPrice = 0.0;
        this.unsoldPlayers.push(player);
        this.history.push({
          lot: lot,
          player: player.name,
          role: player.role,
          round: this.round,
          sold: false,
          winner: '-',
          price: 0.0
        });
        console.log(`Lot ${lot.toString().padStart(3, ' ')}: ${player.name.padEnd(24)} (${player.role.padEnd(12)}) -> ${C.dim}UNSOLD${C.reset}`);
      }

      if (this.simSpeed === 'normal') {
        await sleep(40);
      }
    }

    console.log(`\n${C.bold}${C.brightGreen}✓ Simulation Finished successfully!${C.reset}\n`);
    if (!silent) {
      await this.displayLeaderboard();
      await askQuestion(`\n${C.brightYellow}Press ENTER to return to Main Menu...${C.reset}`);
    }
  }

  async displayFranchiseDashboard() {
    clearScreen();
    printHeader();
    console.log(`${C.bold}${C.brightCyan}══════════════════════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}${C.brightCyan}                         FRANCHISE SQUADS & PURSE DASHBOARD                           ${C.reset}`);
    console.log(`${C.bold}${C.brightCyan}══════════════════════════════════════════════════════════════════════════════════════${C.reset}\n`);

    if (!this.isInitialized) {
      this.initAuction();
    }

    const teamCodes = Object.keys(this.teams);
    for (const code of teamCodes) {
      const t = this.teams[code];
      const squadPct = Math.round((t.squad.length / t.squadLimit) * 100);
      console.log(`${t.badge} ${C.bold}${C.brightYellow}${t.name} (${t.code})${C.reset} - ${C.dim}${t.tagline}${C.reset}`);
      console.log(`   Purse Left: ${C.bold}${C.brightGreen}₹${t.purse.toFixed(2)} Cr${C.reset} / ₹${t.startingPurse.toFixed(2)} Cr  |  Spent: ₹${t.spent.toFixed(2)} Cr`);
      console.log(`   Squad: ${C.bold}${t.squad.length}/${t.squadLimit}${C.reset} (${squadPct}%)  |  Overseas: ${C.bold}${t.overseasCount}/${t.maxOverseas}${C.reset}  |  Roles: 🏏BAT:${t.roleCounts.BATTER || 0}  🎯BOWL:${t.roleCounts.BOWLER || 0}  ⚡AR:${t.roleCounts.ALL_ROUNDER || 0}  🧤WK:${t.roleCounts.WICKETKEEPER || 0}`);

      if (t.squad.length > 0) {
        console.log(`   ${C.underline}Squad Roster:${C.reset}`);
        t.squad.forEach((p, idx) => {
          const ovs = p.isOverseas ? '✈️ ' : '🇮🇳 ';
          console.log(`     ${(idx + 1).toString().padStart(2, ' ')}. ${ovs}${p.name.padEnd(22)} | ${p.role.padEnd(12)} | ₹${p.finalPrice.toFixed(2)} Cr`);
        });
      } else {
        console.log(`   ${C.dim}(No players signed yet)${C.reset}`);
      }
      console.log(`──────────────────────────────────────────────────────────────────────────────────────`);
    }
  }

  async searchPlayerDatabase() {
    clearScreen();
    printHeader();
    console.log(`${C.bold}${C.brightCyan}--- PLAYER POOL & SCOUTING CATALOG ---${C.reset}\n`);

    console.log(`  [1] View Available Player Pool (Waiting in Queue: ${this.queue.length} players)`);
    console.log(`  [2] View Sold Players by Team (${this.soldPlayers.length} signed players)`);
    console.log(`  [3] Search Player by Name, Role, or Country\n`);

    const opt = await askQuestion(`${C.brightYellow}Select option (1-3, or press ENTER to search): ${C.reset}`);
    const choice = opt.trim();

    let matches = [];
    if (choice === '2') {
      this.displaySoldPlayersTable();
      await askQuestion(`\n${C.brightYellow}Press ENTER to continue...${C.reset}`);
      return;
    } else if (choice === '1') {
      // Strictly Available/Unsold Players in the pool
      matches = this.isInitialized ? this.queue : INITIAL_PLAYERS;
      console.log(`\n${C.bold}--- AVAILABLE PLAYER POOL (${matches.length} Players Waiting) ---${C.reset}\n`);
    } else {
      const query = choice === '3' ? await askQuestion(`${C.brightYellow}Enter search term: ${C.reset}`) : opt;
      const q = (query || '').trim().toLowerCase();
      const pool = this.isInitialized ? this.players : INITIAL_PLAYERS;
      matches = pool.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        (p.pastTeam && p.pastTeam.toLowerCase().includes(q))
      );
      console.log(`\nFound ${C.bold}${matches.length}${C.reset} matching players:\n`);
    }

    console.log(`  ${'ID'.padEnd(5)} ${'Player Name'.padEnd(20)} ${'Role'.padEnd(13)} ${'Country'.padEnd(12)} ${'Runs'.padStart(6)} ${'Wkts'.padStart(5)} ${'6s'.padStart(4)} ${'4s'.padStart(5)} ${'SR'.padStart(6)} ${'Base'.padStart(9)} ${'Rating'.padStart(7)}  ${'Status'}`);
    console.log(`  ${'─'.repeat(108)}`);

    matches.slice(0, 40).forEach(p => {
      const s = p.stats || {};
      let statusStr = `${C.brightGreen}Available in Pool${C.reset}`;
      if (p.sold) statusStr = `${C.brightYellow}Sold: ${p.soldTo} (₹${p.finalPrice.toFixed(2)} Cr)${C.reset}`;
      else if (p.soldTo === 'UNSOLD' || p.soldTo === '-') statusStr = `${C.dim}Unsold Pool${C.reset}`;

      const runsStr = String(s.runs ?? 0).padStart(6);
      const wktsStr = String(s.wickets ?? 0).padStart(5);
      const sixStr = String(s.sixes ?? 0).padStart(4);
      const fourStr = String(s.fours ?? 0).padStart(5);
      const srStr = String(s.sr ?? '-').padStart(6);
      const baseStr = `₹${p.basePrice.toFixed(2)} Cr`.padStart(9);
      const ratingStr = `⭐${p.rating || 80}`.padStart(7);

      console.log(`  ${p.id.padEnd(5)} ${p.name.padEnd(20)} ${p.role.padEnd(13)} ${p.country.padEnd(12)} ${C.brightYellow}${runsStr}${C.reset} ${C.brightGreen}${wktsStr}${C.reset} ${sixStr} ${fourStr} ${srStr} ${baseStr} ${ratingStr}  ${statusStr}`);
    });

    if (matches.length > 40) {
      console.log(`  ${C.dim}... and ${matches.length - 40} more players.${C.reset}`);
    }

    await askQuestion(`\n${C.brightYellow}Press ENTER to continue...${C.reset}`);
  }

  displaySoldPlayersTable() {
    console.log(`\n${C.bold}${C.brightYellow}════════════════════════════════════════════════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}${C.brightYellow}                             🏏 OFFICIAL SOLD PLAYERS LEDGER (${this.soldPlayers.length} Signed) 🏏                            ${C.reset}`);
    console.log(`${C.bold}${C.brightYellow}════════════════════════════════════════════════════════════════════════════════════════════════════════════════${C.reset}\n`);

    if (this.soldPlayers.length === 0) {
      console.log(`  ${C.dim}No players have been sold yet. The ledger will update as soon as the first player is signed.${C.reset}\n`);
      return;
    }

    console.log(`  ${'#'.padEnd(4)} ${'Player Name'.padEnd(20)} ${'Role'.padEnd(13)} ${'Team Acquired'.padEnd(28)} ${'Final Price'.padStart(12)}  ${'Runs'.padStart(6)} ${'Wkts'.padStart(5)} ${'6s'.padStart(4)} ${'4s'.padStart(5)} ${'SR'.padStart(6)}`);
    console.log(`  ${'─'.repeat(108)}`);

    let totalSpent = 0;
    this.soldPlayers.forEach((p, idx) => {
      const s = p.stats || {};
      const team = this.teams[p.soldTo] || { name: p.soldTo, badge: '🏏' };
      const teamDisplay = `${team.badge} ${C.bold}${p.soldTo}${C.reset} (${team.name.slice(0, 18)})`;
      const priceStr = `₹${p.finalPrice.toFixed(2)} Cr`;
      totalSpent += p.finalPrice;

      const runsStr = String(s.runs ?? 0).padStart(6);
      const wktsStr = String(s.wickets ?? 0).padStart(5);
      const sixStr = String(s.sixes ?? 0).padStart(4);
      const fourStr = String(s.fours ?? 0).padStart(5);
      const srStr = String(s.sr ?? '-').padStart(6);

      console.log(`  ${(idx + 1).toString().padStart(2, ' ')}.  ${C.bold}${p.name.padEnd(20)}${C.reset} ${p.role.padEnd(13)} ${teamDisplay.padEnd(38)} ${C.bold}${C.brightYellow}${priceStr.padStart(12)}${C.reset}  ${runsStr} ${wktsStr} ${sixStr} ${fourStr} ${srStr}`);
    });

    console.log(`  ${'─'.repeat(108)}`);
    console.log(`  📊 ${C.bold}Total Spent: ${C.brightYellow}₹${totalSpent.toFixed(2)} Cr${C.reset} across ${this.soldPlayers.length} signed player(s)  |  Unsold in Pool: ${this.unsoldPlayers.length}\n`);
  }

  async displayLeaderboard() {
    console.log(`\n${C.bold}${C.brightYellow}══════════════════════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}${C.brightYellow}                       TOP 10 MOST EXPENSIVE BUYS OF THE AUCTION                      ${C.reset}`);
    console.log(`${C.bold}${C.brightYellow}══════════════════════════════════════════════════════════════════════════════════════${C.reset}\n`);

    const topBuys = [...this.soldPlayers].sort((a, b) => b.finalPrice - a.finalPrice).slice(0, 10);
    if (topBuys.length === 0) {
      console.log(`  ${C.dim}No players sold yet.${C.reset}`);
    } else {
      topBuys.forEach((p, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        console.log(`  ${medal.padEnd(4)} ${C.bold}${p.name.padEnd(24)}${C.reset} | ${p.role.padEnd(12)} | Sold to: ${C.bold}${C.brightCyan}${p.soldTo.padEnd(5)}${C.reset} | Price: ${C.bold}${C.brightYellow}₹${p.finalPrice.toFixed(2)} Cr${C.reset}`);
      });
    }

    console.log(`\n${C.bold}${C.brightCyan}──────────────────────────────────────────────────────────────────────────────────────${C.reset}`);
    console.log(`${C.bold}${C.brightCyan}                            FRANCHISE SPENDING STANDINGS                              ${C.reset}`);
    console.log(`${C.bold}${C.brightCyan}──────────────────────────────────────────────────────────────────────────────────────${C.reset}\n`);

    const sortedTeams = Object.values(this.teams).sort((a, b) => b.spent - a.spent);
    sortedTeams.forEach((t, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2, ' ')}. ${t.badge} ${C.bold}${t.code.padEnd(6)}${C.reset} Spent: ${C.bold}₹${t.spent.toFixed(2).padStart(6, ' ')} Cr${C.reset} | Remaining Purse: ${C.brightGreen}₹${t.purse.toFixed(2).padStart(6, ' ')} Cr${C.reset} | Squad: ${t.squad.length}/${t.squadLimit}`);
    });
  }

  async exportReports() {
    clearScreen();
    printHeader();
    console.log(`${C.bold}${C.brightGreen}--- EXPORT AUCTION DATA & REPORTS ---${C.reset}\n`);

    if (!this.isInitialized || this.history.length === 0) {
      console.log(`${C.yellow}No auction records to export yet. Please run an auction or simulation first.${C.reset}\n`);
      await askQuestion(`Press ENTER to continue...`);
      return;
    }

    const outDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // 1. History CSV
    const csvLines = ['Lot,Player,Role,Round,Status,Winner,FinalPriceCr'];
    this.history.forEach(h => {
      csvLines.push(`${h.lot},"${h.player}",${h.role},${h.round},${h.sold ? 'SOLD' : 'UNSOLD'},${h.winner},${h.price.toFixed(2)}`);
    });
    const csvPath = path.join(outDir, 'auction_history.csv');
    fs.writeFileSync(csvPath, csvLines.join('\n'));

    // 2. Full Text Report
    const reportLines = [
      '================================================================================',
      '                        IPL MEGA AUCTION 2026 - FINAL REPORT',
      '================================================================================\n',
      `Total Lots Auctioned: ${this.history.length}`,
      `Total Players Sold:   ${this.soldPlayers.length}`,
      `Total Players Unsold: ${this.unsoldPlayers.length}\n`,
      '--------------------------------------------------------------------------------',
      'FRANCHISE ROSTERS & FINANCIALS',
      '--------------------------------------------------------------------------------'
    ];

    Object.values(this.teams).forEach(t => {
      reportLines.push(`\n[${t.code}] ${t.name}`);
      reportLines.push(`Spent: Rs.${t.spent.toFixed(2)} Cr | Purse Left: Rs.${t.purse.toFixed(2)} Cr | Squad: ${t.squad.length}/${t.squadLimit} | Overseas: ${t.overseasCount}/${t.maxOverseas}`);
      reportLines.push('Squad Roster:');
      t.squad.forEach((p, i) => {
        reportLines.push(`  ${(i + 1).toString().padStart(2, ' ')}. ${p.name.padEnd(24)} | ${p.role.padEnd(12)} | Rs.${p.finalPrice.toFixed(2)} Cr`);
      });
    });

    const reportPath = path.join(outDir, 'final_report.txt');
    fs.writeFileSync(reportPath, reportLines.join('\n'));

    console.log(`${C.brightGreen}✓ Reports successfully generated!${C.reset}`);
    console.log(`  📄 CSV History:  ${csvPath}`);
    console.log(`  📄 Text Report:  ${reportPath}\n`);

    await askQuestion(`Press ENTER to return to Main Menu...`);
  }

  async configureSettings() {
    clearScreen();
    printHeader();
    console.log(`${C.bold}${C.brightYellow}--- AUCTION ENGINE SETTINGS ---${C.reset}\n`);

    console.log(`  League Format  : ${C.bold}${C.brightCyan}4 Franchises — CSK | RCB | MI | KKR${C.reset}`);
    console.log(`  Squad Cap      : ${C.bold}11 Players per Team${C.reset}`);
    console.log(`  Starting Purse : ${C.bold}₹100.00 Cr per Franchise${C.reset}`);
    console.log(`  Overseas Cap   : ${C.bold}4 per Team${C.reset}`);
    console.log(`  Bid Increment  : ${C.bold}₹${this.bidIncrement.toFixed(2)} Cr${C.reset}`);
    console.log(`  Sim Speed      : ${C.bold}${this.simSpeed.toUpperCase()}${C.reset}\n`);

    console.log(`  [1] Toggle Simulation Speed (Current: ${C.bold}${this.simSpeed.toUpperCase()}${C.reset})`);
    console.log(`  [2] Reset Auction State (clears all squads & bids)\n`);

    const opt = await askQuestion(`${C.brightCyan}Select option (1-2, or ENTER to return): ${C.reset}`);
    if (opt.trim() === '1') {
      this.simSpeed = this.simSpeed === 'normal' ? 'fast' : this.simSpeed === 'fast' ? 'instant' : 'normal';
      console.log(`\n${C.green}✓ Simulation speed set to ${this.simSpeed.toUpperCase()}.${C.reset}`);
    } else if (opt.trim() === '2') {
      this.initAuction();
      console.log(`\n${C.green}✓ Auction state has been reset! All squads cleared.${C.reset}`);
    }
    await sleep(1000);
  }

  async start() {
    this.initAuction();

    while (true) {
      clearScreen();
      printHeader();

      const lotProgress = `${this.soldPlayers.length + this.unsoldPlayers.length}/${this.players.length}`;
      const teamsReady = Object.values(this.teams).filter(t => t.squad.length === 11).length;

      console.log(`  📊 ${C.bold}${C.brightCyan}4 Franchises: CSK | RCB | MI | KKR${C.reset}  |  11 Players/Team  |  ₹100 Cr Purse`);
      console.log(`  ⚡ Lots Done: ${C.bold}${lotProgress}${C.reset} | Sold: ${C.brightGreen}${this.soldPlayers.length}${C.reset} | Unsold: ${C.brightRed}${this.unsoldPlayers.length}${C.reset} | Full Squads: ${C.brightYellow}${teamsReady}/4${C.reset}\n`);

      console.log(`  ${C.bold}${C.brightCyan}[1]${C.reset} 🏏  ${C.bold}Interactive Live Auction${C.reset}  (Manage a franchise or bid live as auctioneer)`);
      console.log(`  ${C.bold}${C.brightCyan}[2]${C.reset} ⚡  ${C.bold}Full Auto Simulation${C.reset}     (Run complete auction simulation with live console output)`);
      console.log(`  ${C.bold}${C.brightCyan}[3]${C.reset} 👥  ${C.bold}Franchise Squads & Purse${C.reset} (View all team rosters, purses & overseas quotas)`);
      console.log(`  ${C.bold}${C.brightCyan}[4]${C.reset} 🔍  ${C.bold}Player Database & Search${C.reset} (Search by role, country, tier, or stats)`);
      console.log(`  ${C.bold}${C.brightCyan}[5]${C.reset} 🏆  ${C.bold}Auction Standings & Top Buys${C.reset}`);
      console.log(`  ${C.bold}${C.brightCyan}[6]${C.reset} 💾  ${C.bold}Export Reports (CSV / Text)${C.reset}`);
      console.log(`  ${C.bold}${C.brightCyan}[7]${C.reset} ⚙️   ${C.bold}Auction Settings & Reset${C.reset}`);
      console.log(`  ${C.bold}${C.brightCyan}[0]${C.reset} 🚪  ${C.bold}Exit${C.reset}\n`);

      const choice = await askQuestion(`${C.brightYellow}Enter your choice (0-7): ${C.reset}`);
      const trimmed = choice.trim();

      switch (trimmed) {
        case '1':
          await this.runInteractiveAuction();
          break;
        case '2':
          await this.runFullSimulation();
          break;
        case '3':
          await this.displayFranchiseDashboard();
          await askQuestion(`\n${C.brightYellow}Press ENTER to return...${C.reset}`);
          break;
        case '4':
          await this.searchPlayerDatabase();
          break;
        case '5':
          clearScreen();
          printHeader();
          await this.displayLeaderboard();
          await askQuestion(`\n${C.brightYellow}Press ENTER to return...${C.reset}`);
          break;
        case '6':
          await this.exportReports();
          break;
        case '7':
          await this.configureSettings();
          break;
        case '0':
        case 'exit':
        case 'q':
          clearScreen();
          console.log(`\n${C.brightCyan}Thank you for using IPL Mega Auction Console System! 🏏${C.reset}\n`);
          rl.close();
          process.exit(0);
          return;
        default:
          console.log(`${C.red}Invalid option. Please try again.${C.reset}`);
          await sleep(800);
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const app = new ConsoleAuctionApp();
  app.start().catch(err => {
    console.error('Auction system error:', err);
    rl.close();
  });
}

module.exports = ConsoleAuctionApp;
