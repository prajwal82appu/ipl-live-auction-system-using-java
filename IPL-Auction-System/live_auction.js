#!/usr/bin/env node
/**
 * =========================================================================
 * IPL MEGA AUCTION 2026 - 4-TEAM MANUAL BIDDING CONSOLE AUCTION ENGINE
 * Full Manual Bidding & Custom Price Amount Entry for all 4 Franchises:
 * 🦁 CSK | 👑 RCB | 🌀 MI | ⚔️ KKR
 * =========================================================================
 */

const readline = require('readline');
const { INITIAL_PLAYERS, FRANCHISE_DEFS } = require('./web/data.js');

// ── ANSI Colors & Styling ────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', italic: '\x1b[3m', underline: '\x1b[4m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
  bRed: '\x1b[91m', bGreen: '\x1b[92m', bYellow: '\x1b[93m', bBlue: '\x1b[94m', bMagenta: '\x1b[95m', bCyan: '\x1b[96m', bWhite: '\x1b[97m',
  bgRed: '\x1b[41m', bgGreen: '\x1b[42m', bgYellow: '\x1b[43m', bgBlue: '\x1b[44m', bgMagenta: '\x1b[45m', bgCyan: '\x1b[46m', bgDark: '\x1b[40m'
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SEP  = '═'.repeat(78);
const DASH = '─'.repeat(78);

function cls() { process.stdout.write('\x1b[2J\x1b[0f'); }

function header() {
  console.log(`${C.bYellow}${SEP}${C.reset}`);
  console.log(`${C.bold}${C.bCyan}   🏏  IPL MEGA AUCTION 2026 - 4-TEAM MANUAL BIDDING CONSOLE  🏏${C.reset}`);
  console.log(`${C.dim}   Teams: CSK 🦁 | RCB 👑 | MI 🌀 | KKR ⚔️   |  11 Players/Squad  |  ₹100.00 Cr Purse${C.reset}`);
  console.log(`${C.bYellow}${SEP}${C.reset}`);
}

// ── SETUP & FRANCHISE ENGINE ──────────────────────────────────────────────
const TEAM_LIST = ['CSK', 'RCB', 'MI', 'KKR'];
const SQUAD_CAP = 11;
const MAX_OVS = 4;
const MIN_SLOT_RESERVE = 0.50; // ₹0.50 Cr per remaining empty slot
const DEFAULT_INCREMENT = 0.50;

const teams = {};
TEAM_LIST.forEach(code => {
  const d = FRANCHISE_DEFS[code];
  teams[code] = {
    code,
    name: d.name,
    badge: d.badge || '🏏',
    tagline: d.tagline || '',
    color: d.primary || '#eab308',
    purse: 100.0,
    startingPurse: 100.0,
    spent: 0.0,
    squad: [],
    overseas: 0,
    roles: { BATTER: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKETKEEPER: 0 }
  };
});

let pool = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
// Deterministic-safe shuffle
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}

let queue = [...pool];
let unsold = [];
let history = [];
let lotNum = 0;
let round = 1;

// ── ELIGIBILITY & VALIDATION RULES ────────────────────────────────────────
function getTeamMaxBid(code) {
  const t = teams[code];
  if (!t) return 0;
  if (t.squad.length >= SQUAD_CAP) return 0;
  const emptySlotsAfterThis = SQUAD_CAP - t.squad.length - 1;
  const reserve = Math.max(0, emptySlotsAfterThis * MIN_SLOT_RESERVE);
  return Math.max(0, +(t.purse - reserve).toFixed(2));
}

function validateManualBid(teamCode, player, amount, currentBid, highestBidder) {
  const t = teams[teamCode];
  if (!t) {
    return { ok: false, reason: `Unknown team code '${teamCode}'. Use CSK, RCB, MI, or KKR (or numbers 1-4).` };
  }
  if (teamCode === highestBidder) {
    return { ok: false, reason: `${t.badge} ${t.name} is already the highest bidder at ₹${currentBid.toFixed(2)} Cr!` };
  }
  if (t.squad.length >= SQUAD_CAP) {
    return { ok: false, reason: `${t.badge} ${t.name} squad is FULL (${SQUAD_CAP}/${SQUAD_CAP} players acquired).` };
  }
  if (player.isOverseas && t.overseas >= MAX_OVS) {
    return { ok: false, reason: `${t.badge} ${t.name} has filled its Overseas Quota (${MAX_OVS}/${MAX_OVS} overseas players).` };
  }

  const amt = +(Number(amount).toFixed(2));
  if (isNaN(amt) || amt <= 0) {
    return { ok: false, reason: `Invalid price amount '${amount}'. Please enter a valid positive number in ₹ Cr (e.g. 14.50).` };
  }

  // Price must be >= basePrice
  if (amt < player.basePrice) {
    return { ok: false, reason: `Bid ₹${amt.toFixed(2)} Cr is below player's base price of ₹${player.basePrice.toFixed(2)} Cr.` };
  }

  // Price must be strictly greater than current bid
  if (highestBidder !== null && amt <= currentBid) {
    return { ok: false, reason: `Bid ₹${amt.toFixed(2)} Cr must be higher than current highest bid ₹${currentBid.toFixed(2)} Cr.` };
  }

  // Purse reserve check
  const emptySlots = SQUAD_CAP - t.squad.length - 1;
  const reserveNeeded = Math.max(0, emptySlots * MIN_SLOT_RESERVE);
  const maxAllowable = +(t.purse - reserveNeeded).toFixed(2);

  if (amt > maxAllowable) {
    return {
      ok: false,
      reason: `Insufficient purse! ${t.name} has ₹${t.purse.toFixed(2)} Cr purse. Max allowable bid is ₹${maxAllowable.toFixed(2)} Cr (keeping ₹${reserveNeeded.toFixed(2)} Cr reserve for remaining ${emptySlots} slots).`
    };
  }

  return { ok: true, amount: amt };
}

// ── DISPLAY FORMATTERS ────────────────────────────────────────────────────
function roleEmoji(role) {
  return { BATTER: '🏏', BOWLER: '🎳', WICKETKEEPER: '🧤', ALL_ROUNDER: '⚡' }[role] || '🏏';
}
function roleLabel(role) {
  return { BATTER: 'BATTER', BOWLER: 'BOWLER', WICKETKEEPER: 'WICKET-KEEPER', ALL_ROUNDER: 'ALL-ROUNDER' }[role] || role;
}
function roleColor(role) {
  return { BATTER: C.bCyan, BOWLER: C.bRed, WICKETKEEPER: C.bMagenta, ALL_ROUNDER: C.bGreen }[role] || C.bWhite;
}

function showPlayerCard(p) {
  const WIDE = 74;
  const line = '═'.repeat(WIDE);
  const thin = '─'.repeat(WIDE);

  const tierColor = p.tier === 'Marquee' ? C.bYellow : p.tier === 'Gold' ? C.yellow : p.tier === 'Silver' ? C.bCyan : C.dim;
  const rCol = roleColor(p.role);
  const rEmoji = roleEmoji(p.role);
  const rLabel = roleLabel(p.role);
  const ovsLabel = p.isOverseas ? `${C.bMagenta}✈️  OVERSEAS PLAYER${C.reset}` : `${C.bGreen}🇮🇳  INDIAN PLAYER${C.reset}`;

  const s = p.stats || {};
  const runsPart = `🏏 Total Runs: ${C.bold}${C.bYellow}${s.runs ?? 0}${C.reset}`;
  const sixPart = `💥 6s: ${C.bold}${C.bYellow}${s.sixes ?? 0}${C.reset}`;
  const fourPart = `🎯 4s: ${C.bold}${C.bYellow}${s.fours ?? 0}${C.reset}`;
  const srPart = `⚡ SR: ${C.bold}${s.sr ?? '-'}${C.reset}`;
  const wktsPart = `🎳 Wickets: ${C.bold}${C.bGreen}${s.wickets ?? 0}${C.reset}`;
  const avgPart = `📊 Avg: ${s.avg ?? '-'}`;
  const econPart = s.econ ? ` | 📉 Econ: ${s.econ}` : '';
  const speedPart = s.speed ? ` | 🚀 Speed: ${s.speed}` : '';
  const stCtPart = s.stumpings !== undefined ? ` | 🧤 St: ${s.stumpings} Ct: ${s.catches}` : '';

  console.log(`\n  ${C.bgBlue}${C.bold}${C.bWhite}  LOT #${String(lotNum).padStart(3, '0')}  ${C.reset}  ${C.bold}${C.bWhite}${p.name}${C.reset}  ${ovsLabel}`);
  console.log(`  ${rCol}${C.bold}╔${line}╗${C.reset}`);
  console.log(`  ${rCol}║${C.reset}  ${rEmoji}  ${C.bold}ROLE        :${C.reset} ${rCol}${C.bold}${rLabel.padEnd(20)}${C.reset} │  🎖  ${C.bold}TIER   :${C.reset} ${tierColor}${C.bold}${(p.tier || 'Silver').padEnd(10)}${C.reset} ║`);
  console.log(`  ${rCol}║${C.reset}  🌍  ${C.bold}COUNTRY     :${C.reset} ${(p.flag + ' ' + p.country).padEnd(20)} │  ⭐  ${C.bold}RATING :${C.reset} ${C.bYellow}${p.rating || 80}/100${C.reset}      ║`);
  console.log(`  ${rCol}║${C.reset}  💰  ${C.bold}BASE PRICE  :${C.reset} ${C.bold}${C.bYellow}₹${p.basePrice.toFixed(2)} Cr${C.reset}             │  🎯  ${C.bold}AGE    :${C.reset} ${(p.age || 26).toString().padEnd(10)} ║`);
  console.log(`  ${rCol}╠${thin}╣${C.reset}`);
  console.log(`  ${rCol}║${C.reset}  📊  ${C.bold}CAREER STATS:${C.reset} ${runsPart} │ ${sixPart} │ ${fourPart} │ ${srPart}`);
  console.log(`  ${rCol}║${C.reset}                 ${wktsPart} │ ${avgPart}${econPart}${speedPart}${stCtPart}`);
  console.log(`  ${rCol}${C.bold}╚${line}╝${C.reset}\n`);
}

function showFranchiseBiddingTable(player, currentBid, highestBidder) {
  console.log(`  ${C.bold}${C.bCyan}─── ALL 4 FRANCHISES STATUS & PURSE ───${C.reset}`);
  TEAM_LIST.forEach((code, idx) => {
    const t = teams[code];
    const maxBid = getTeamMaxBid(code);
    const isLeader = code === highestBidder;
    const isFull = t.squad.length >= SQUAD_CAP;
    const ovsFull = player.isOverseas && t.overseas >= MAX_OVS;
    
    let statusBadge = `${C.bGreen}ELIGIBLE${C.reset}`;
    if (isLeader) statusBadge = `${C.bgYellow}${C.bold}${C.black} HIGHEST BIDDER 👑 ${C.reset}`;
    else if (isFull) statusBadge = `${C.red}SQUAD FULL (11/11)${C.reset}`;
    else if (ovsFull) statusBadge = `${C.red}OVS FULL (4/4)${C.reset}`;
    else if (maxBid < (highestBidder === null ? player.basePrice : currentBid + 0.01)) statusBadge = `${C.dim}OUT OF PURSE${C.reset}`;

    const numKey = `[${C.bold}${idx + 1}${C.reset}]`;
    const codeKey = `[${C.bold}${code}${C.reset}]`;
    console.log(`  ${numKey} ${codeKey} ${t.badge} ${C.bold}${t.name.padEnd(28)}${C.reset} Purse: ${C.bGreen}₹${t.purse.toFixed(2).padStart(6)} Cr${C.reset} | Squad: ${C.bYellow}${t.squad.length}/${SQUAD_CAP}${C.reset} | OVS: ${t.overseas}/${MAX_OVS} | Max Bid: ₹${maxBid.toFixed(2)} Cr | ${statusBadge}`);
  });
  console.log(`  ${C.dim}${DASH}${C.reset}`);
}

function showSquadsDashboard() {
  cls();
  header();
  console.log(`${C.bold}${C.bCyan}══════════════════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.bCyan}                         ALL 4 FRANCHISES SQUADS & ROSTERS                            ${C.reset}`);
  console.log(`${C.bold}${C.bCyan}══════════════════════════════════════════════════════════════════════════════════════${C.reset}\n`);

  TEAM_LIST.forEach(code => {
    const t = teams[code];
    console.log(`${t.badge} ${C.bold}${C.bYellow}${t.name} (${t.code})${C.reset} - ${C.dim}${t.tagline}${C.reset}`);
    console.log(`   Purse Left: ${C.bold}${C.bGreen}₹${t.purse.toFixed(2)} Cr${C.reset} / ₹${t.startingPurse.toFixed(2)} Cr  |  Spent: ₹${t.spent.toFixed(2)} Cr`);
    console.log(`   Squad: ${C.bold}${t.squad.length}/${SQUAD_CAP}${C.reset}  |  Overseas: ${C.bold}${t.overseas}/${MAX_OVS}${C.reset}  |  Roles: 🏏BAT:${t.roles.BATTER}  🎯BOWL:${t.roles.BOWLER}  ⚡AR:${t.roles.ALL_ROUNDER}  🧤WK:${t.roles.WICKETKEEPER}`);
    
    if (t.squad.length > 0) {
      console.log(`   ${C.underline}Squad Roster:${C.reset}`);
      t.squad.forEach((p, idx) => {
        const ovs = p.isOverseas ? '✈️ ' : '🇮🇳 ';
        console.log(`     ${(idx + 1).toString().padStart(2, ' ')}. ${ovs}${p.name.padEnd(24)} | ${p.role.padEnd(14)} | ₹${p.finalPrice.toFixed(2)} Cr`);
      });
    } else {
      console.log(`   ${C.dim}(No players acquired yet)${C.reset}`);
    }
    console.log(`──────────────────────────────────────────────────────────────────────────────────────`);
  });
}

// ── MANUAL BIDDING LOT LOGIC ──────────────────────────────────────────────
async function auctionPlayerManual(player) {
  let currentBid = 0.0;
  let highestBidder = null;
  let bidHistory = [];
  let isBiddingOpen = true;
  let statusMessage = '';

  while (isBiddingOpen) {
    cls();
    header();
    showPlayerCard(player);
    showFranchiseBiddingTable(player, currentBid, highestBidder);

    // Current bid state header
    if (highestBidder) {
      const hb = teams[highestBidder];
      console.log(`\n  🔥 ${C.bold}CURRENT HIGHEST BID: ${C.bYellow}₹${currentBid.toFixed(2)} Cr${C.reset} held by ${hb.badge} ${C.bold}${C.bCyan}${hb.name} (${hb.code})${C.reset}`);
    } else {
      console.log(`\n  ⏳ ${C.bold}OPENING STATUS: ${C.dim}No bids placed yet. Base Price: ${C.bold}${C.bYellow}₹${player.basePrice.toFixed(2)} Cr${C.reset}`);
    }

    // Bid history log for this player
    if (bidHistory.length > 0) {
      console.log(`\n  ${C.dim}─── Bidding Progression for this Player ───${C.reset}`);
      bidHistory.forEach((b, i) => {
        const t = teams[b.team];
        console.log(`   ${C.dim}#${i + 1}${C.reset} ${t.badge} ${C.bold}${b.team}${C.reset} bid ${C.bold}${C.bYellow}₹${b.amount.toFixed(2)} Cr${C.reset}`);
      });
    }

    // Display any error / status feedback
    if (statusMessage) {
      console.log(`\n  ${statusMessage}`);
      statusMessage = '';
    }

    // Next suggested minimum bid
    const minNextBid = highestBidder === null ? player.basePrice : +(currentBid + DEFAULT_INCREMENT).toFixed(2);

    console.log(`\n  ${C.bold}${C.bYellow}HOW TO BID MANUALLY:${C.reset}`);
    console.log(`  • ${C.bold}Direct Team & Price:${C.reset}  Type ${C.bCyan}CSK 14.5${C.reset} or ${C.bCyan}1 14.5${C.reset} | ${C.bCyan}RCB 16${C.reset} | ${C.bCyan}MI 18.5${C.reset} | ${C.bCyan}KKR 20${C.reset}`);
    console.log(`  • ${C.bold}Interactive Team Bid:${C.reset} Type team code (${C.bCyan}CSK / RCB / MI / KKR${C.reset} or ${C.bCyan}1 / 2 / 3 / 4${C.reset}) -> then enter price`);
    console.log(`  • ${C.bold}Hammer Down / Sell:${C.reset}   Type ${C.bGreen}SELL${C.reset} or ${C.bGreen}S${C.reset} (sells to highest bidder at current manual price)`);
    console.log(`  • ${C.bold}Mark Unsold:${C.reset}          Type ${C.bRed}UNSOLD${C.reset} or ${C.bRed}U${C.reset} (marks player unsold)`);
    console.log(`  • ${C.bold}Other Commands:${C.reset}       Type ${C.cyan}SQUADS${C.reset} (view rosters) | ${C.cyan}UNDO${C.reset} (revert last bid) | ${C.cyan}AUTO${C.reset} (auto-finish)`);

    const input = await ask(`\n  ${C.bold}${C.bYellow}🎙️  Auctioneer Command > ${C.reset}`);
    const trimmed = input.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    const rawCmd = parts[0].toUpperCase();
    const explicitAmount = parts[1];

    // Check for Auctioneer Action Commands
    if (rawCmd === 'SELL' || rawCmd === 'S' || rawCmd === 'HAMMER' || rawCmd === 'H' || rawCmd === 'SOLD') {
      if (!highestBidder) {
        statusMessage = `${C.bRed}❌ No bids have been placed yet! Use 'UNSOLD' or 'U' to pass this player.${C.reset}`;
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

    if (rawCmd === 'SQUADS' || rawCmd === 'SQUAD' || rawCmd === 'D' || rawCmd === 'ROSTERS') {
      showSquadsDashboard();
      await ask(`\n${C.bYellow}Press ENTER to return to active bidding lot...${C.reset}`);
      continue;
    }

    if (rawCmd === 'UNDO' || rawCmd === 'RESET') {
      if (bidHistory.length === 0) {
        statusMessage = `${C.yellow}⚠️ No bids to undo.${C.reset}`;
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
        statusMessage = `${C.bGreen}✓ Last bid undone successfully!${C.reset}`;
      }
      continue;
    }

    if (rawCmd === 'AUTO' || rawCmd === 'A') {
      console.log(`\n  ${C.dim}⚡ Simulating remaining bids automatically...${C.reset}`);
      while (true) {
        const next = highestBidder === null ? player.basePrice : +(currentBid + DEFAULT_INCREMENT).toFixed(2);
        const eligible = TEAM_LIST.filter(c => {
          if (c === highestBidder) return false;
          const v = validateManualBid(c, player, next, currentBid, highestBidder);
          return v.ok;
        });
        if (eligible.length === 0 || Math.random() > 0.85) break;
        const pick = eligible[Math.floor(Math.random() * eligible.length)];
        currentBid = next;
        highestBidder = pick;
        bidHistory.push({ team: pick, amount: currentBid });
        console.log(`    ${teams[pick].badge} ${C.bold}${pick}${C.reset} bids ${C.bYellow}₹${currentBid.toFixed(2)} Cr${C.reset}`);
        await sleep(350);
      }
      isBiddingOpen = false;
      break;
    }

    // Resolve team code (supports 1->CSK, 2->RCB, 3->MI, 4->KKR or direct name)
    let targetTeam = null;
    if (rawCmd === '1' || rawCmd === 'CSK') targetTeam = 'CSK';
    else if (rawCmd === '2' || rawCmd === 'RCB') targetTeam = 'RCB';
    else if (rawCmd === '3' || rawCmd === 'MI') targetTeam = 'MI';
    else if (rawCmd === '4' || rawCmd === 'KKR') targetTeam = 'KKR';

    if (!targetTeam) {
      statusMessage = `${C.bRed}❌ Unrecognized command '${trimmed}'. Enter team name (CSK, RCB, MI, KKR), numbers (1-4), or SELL/UNSOLD.${C.reset}`;
      continue;
    }

    // Determine bid amount
    let bidAmountToValidate = null;

    if (explicitAmount !== undefined) {
      // User entered direct amount like "CSK 14.5"
      const parsed = parseFloat(explicitAmount);
      if (isNaN(parsed)) {
        statusMessage = `${C.bRed}❌ Invalid price amount '${explicitAmount}'. Example: 'CSK 14.50'${C.reset}`;
        continue;
      }
      bidAmountToValidate = parsed;
    } else {
      // Prompt user to add price amount manually
      const t = teams[targetTeam];
      const maxBid = getTeamMaxBid(targetTeam);
      const suggested = highestBidder === null ? player.basePrice : +(currentBid + DEFAULT_INCREMENT).toFixed(2);

      const priceInput = await ask(`  💰 ${t.badge} ${C.bold}Enter manual price amount in ₹ Cr for ${t.name}${C.reset} [Default min: ₹${suggested.toFixed(2)} Cr, Max allowed: ₹${maxBid.toFixed(2)} Cr]: `);
      const cleanPrice = priceInput.trim();

      if (!cleanPrice) {
        // Use suggested minimum if user presses ENTER directly
        bidAmountToValidate = suggested;
      } else {
        const parsed = parseFloat(cleanPrice);
        if (isNaN(parsed)) {
          statusMessage = `${C.bRed}❌ Invalid amount '${cleanPrice}'. Please enter a numeric price in ₹ Cr.${C.reset}`;
          continue;
        }
        bidAmountToValidate = parsed;
      }
    }

    // Validate the manual bid
    const validation = validateManualBid(targetTeam, player, bidAmountToValidate, currentBid, highestBidder);
    if (!validation.ok) {
      statusMessage = `${C.bRed}❌ ${validation.reason}${C.reset}`;
      continue;
    }

    // Accept bid
    currentBid = validation.amount;
    highestBidder = targetTeam;
    bidHistory.push({ team: targetTeam, amount: currentBid });
    statusMessage = `${C.bGreen}⚡ BID ACCEPTED! ${teams[targetTeam].badge} ${C.bold}${teams[targetTeam].name}${C.reset} placed a manual bid of ${C.bold}${C.bYellow}₹${currentBid.toFixed(2)} Cr${C.reset}!`;
  }

  // ── FINAL SALE EXECUTION ────────────────────────────────────────────────
  cls();
  header();
  showPlayerCard(player);

  if (highestBidder && bidHistory.length > 0) {
    const winner = teams[highestBidder];
    winner.purse = +(winner.purse - currentBid).toFixed(2);
    winner.spent = +(winner.spent + currentBid).toFixed(2);
    winner.squad.push({ ...player, finalPrice: currentBid });
    winner.roles[player.role]++;
    if (player.isOverseas) winner.overseas++;

    player.sold = true;
    player.soldTo = winner.code;
    player.finalPrice = currentBid;

    history.push({
      lot: lotNum,
      name: player.name,
      role: player.role,
      country: player.country,
      team: winner.code,
      price: currentBid,
      round
    });

    console.log(`\n  ${C.bgGreen}${C.bold}${C.bWhite}  🎉 SOLD! 🔨  ${C.reset} ${winner.badge} ${C.bold}${C.bGreen}${winner.name} (${winner.code})${C.reset} acquires ${C.bold}${C.bWhite}${player.name}${C.reset} for ${C.bold}${C.bYellow}₹${currentBid.toFixed(2)} Cr${C.reset}!\n`);
  } else {
    player.sold = false;
    player.soldTo = '-';
    player.finalPrice = 0.0;
    history.push({
      lot: lotNum,
      name: player.name,
      role: player.role,
      country: player.country,
      team: '-',
      price: 0.0,
      round
    });
    unsold.push(player);
    console.log(`\n  ${C.bgRed}${C.bold}${C.bWhite}  ❌ UNSOLD! 🔨  ${C.reset} ${C.dim}${player.name} finds no buyer and returns to the unsold pool.${C.reset}\n`);
  }

  showFranchiseBiddingTable(player, currentBid, highestBidder);
  showSoldPlayersTable();
}

function showSoldPlayersTable() {
  const sold = history.filter(h => h.team !== '-');
  console.log(`\n${C.bYellow}${SEP}${C.reset}`);
  console.log(`${C.bold}${C.bYellow}                  🏏 OFFICIAL SOLD PLAYERS LEDGER (${sold.length} Signed) 🏏                  ${C.reset}`);
  console.log(`${C.bYellow}${SEP}${C.reset}\n`);

  if (sold.length === 0) {
    console.log(`  ${C.dim}No players have been sold yet. The table will update as soon as the first player is signed.${C.reset}\n`);
    return;
  }

  console.log(`  ${'#'.padEnd(4)} ${'Player Name'.padEnd(20)} ${'Role'.padEnd(13)} ${'Team Acquired'.padEnd(28)} ${'Final Price'.padStart(12)}  ${'Country'.padEnd(14)}`);
  console.log(`  ${C.dim}${DASH}${C.reset}`);

  let totalSpent = 0;
  sold.forEach((h, idx) => {
    const t = teams[h.team] || { name: h.team, badge: '🏏' };
    const teamDisplay = `${t.badge} ${C.bold}${h.team}${C.reset} (${t.name.slice(0, 18)})`;
    totalSpent += h.price;
    console.log(`  ${(idx + 1).toString().padStart(2, ' ')}.  ${C.bold}${h.name.padEnd(20)}${C.reset} ${h.role.padEnd(13)} ${teamDisplay.padEnd(38)} ${C.bold}${C.bYellow}₹${h.price.toFixed(2)} Cr${C.reset}   ${h.country || 'India'}`);
  });

  console.log(`  ${C.dim}${DASH}${C.reset}`);
  console.log(`  📊 ${C.bold}Total Spent: ${C.bYellow}₹${totalSpent.toFixed(2)} Cr${C.reset} across ${sold.length} signed player(s)  |  Unsold: ${unsold.length}\n`);
}

// ── FINAL AUCTION REPORT ──────────────────────────────────────────────────
function finalReport() {
  cls();
  header();
  console.log(`${C.bold}${C.bGreen}  🎉 AUCTION COMPLETE! FINAL 4-TEAM ROSTERS & FINANCIALS${C.reset}\n`);

  TEAM_LIST.forEach(code => {
    const t = teams[code];
    console.log(`\n${SEP}`);
    console.log(` ${t.badge}  ${C.bold}${C.bYellow}${t.name.toUpperCase()} [${code}]${C.reset} - ${C.dim}${t.tagline}${C.reset}`);
    console.log(DASH);
    console.log(` Total Spent: ${C.bYellow}₹${t.spent.toFixed(2)} Cr${C.reset}  |  Remaining Purse: ${C.bGreen}₹${t.purse.toFixed(2)} Cr${C.reset}  |  Overseas: ${t.overseas}/4`);
    console.log(` Squad Count: ${C.bold}${t.squad.length}/${SQUAD_CAP}${C.reset}  |  Roles: 🏏BAT:${t.roles.BATTER}  🎯BOWL:${t.roles.BOWLER}  ⚡AR:${t.roles.ALL_ROUNDER}  🧤WK:${t.roles.WICKETKEEPER}`);
    console.log(DASH);
    console.log(` #   Player Name               Role            Nat       Final Price`);
    console.log(DASH);
    t.squad.forEach((p, i) => {
      const nat = p.isOverseas ? '✈️ OVS' : '🇮🇳 IND';
      console.log(` ${(i + 1).toString().padStart(2, ' ')}. ${p.name.padEnd(25)} ${p.role.padEnd(15)} ${nat.padEnd(9)} ${C.bYellow}₹${p.finalPrice.toFixed(2)} Cr${C.reset}`);
    });
    if (t.squad.length < SQUAD_CAP) {
      console.log(` ${C.red}⚠️  Squad unfilled: ${SQUAD_CAP - t.squad.length} slot(s) remaining${C.reset}`);
    }
  });

  // Top 5 Buys
  const topBuys = history.filter(h => h.team !== '-').sort((a, b) => b.price - a.price).slice(0, 5);
  console.log(`\n${SEP}`);
  console.log(`${C.bold}${C.bYellow}  🏆 TOP 5 MOST EXPENSIVE SIGNINGS OF THE AUCTION${C.reset}`);
  console.log(DASH);
  topBuys.forEach((h, i) => {
    const medal = ['🥇', '🥈', '🥉', '4️⃣ ', '5️⃣ '][i] || `#${i + 1}`;
    console.log(`  ${medal} ${C.bold}${h.name.padEnd(25)}${C.reset} → ${C.bCyan}${h.team.padEnd(5)}${C.reset} ${C.bold}${C.bYellow}₹${h.price.toFixed(2)} Cr${C.reset}  (${h.role})`);
  });

  console.log(`\n${SEP}`);
  console.log(`  📊 FINAL AUCTION SUMMARY STATS`);
  console.log(DASH);
  const soldCount = history.filter(h => h.team !== '-').length;
  console.log(`  Total Lots Processed : ${history.length}`);
  console.log(`  Total Players Sold   : ${soldCount}`);
  console.log(`  Total Players Unsold : ${unsold.length}`);
  console.log(`${SEP}\n`);
}

// ── MAIN ENTRY POINT ──────────────────────────────────────────────────────
async function main() {
  cls();
  header();
  console.log(`  ${C.bold}Welcome to IPL Mega Auction 2026 – 4-Team Manual Bidding Console!${C.reset}`);
  console.log(`\n  ${C.bCyan}FEATURES & BIDDING RULES:${C.reset}`);
  console.log(`  1. ${C.bold}Manual Bidding for all 4 Teams:${C.reset} Place bids manually on behalf of CSK, RCB, MI, and KKR.`);
  console.log(`  2. ${C.bold}Manual Price Amount Entry:${C.reset} Enter any custom price amount in ₹ Cr (e.g. ${C.bYellow}14.50${C.reset}).`);
  console.log(`  3. ${C.bold}Flexible Bidding Syntax:${C.reset} Type ${C.bCyan}CSK 14.5${C.reset} directly, or type ${C.bCyan}CSK${C.reset} to get a price prompt.`);
  console.log(`  4. ${C.bold}Strict IPL Rules:${C.reset} Enforces ₹100 Cr purse, min ₹0.50 Cr reserve/slot, max 11 players, max 4 overseas.`);
  console.log(`  5. ${C.bold}Auctioneer Commands:${C.reset} ${C.bGreen}SELL${C.reset} (hammer down), ${C.bRed}UNSOLD${C.reset} (skip), ${C.cyan}SQUADS${C.reset} (view rosters), ${C.cyan}UNDO${C.reset}.\n`);

  await ask(`  ${C.bYellow}Press ENTER to start the manual auction...${C.reset}`);

  while (queue.length > 0 || (round === 1 && unsold.length > 0)) {
    if (queue.length === 0 && round === 1) {
      cls();
      header();
      console.log(`${C.bold}${C.bMagenta}  ═══ ROUND 1 COMPLETE ═══${C.reset}`);
      console.log(`  ${unsold.length} unsold players return for Round 2 (Accelerated Manual Bidding)\n`);
      round = 2;
      queue = [...unsold];
      unsold = [];
      await ask(`  ${C.bYellow}Press ENTER to start Round 2...${C.reset}`);
    }

    if (queue.length === 0) break;

    // Check if all 4 squads are full
    const allFull = TEAM_LIST.every(c => teams[c].squad.length >= SQUAD_CAP);
    if (allFull) {
      console.log(`\n${C.bGreen}🎉 All 4 franchises have completed their full 11-player squads!${C.reset}\n`);
      break;
    }

    const player = queue.shift();
    lotNum++;
    await auctionPlayerManual(player);

    const soldCount = history.filter(h => h.team !== '-').length;
    const next = await ask(`\n  ${C.bCyan}[ENTER] Next Lot  |  [v] View Sold Players (${soldCount})  |  [s] Squads  |  [q] Finish Auction: ${C.reset}`);
    const act = next.trim().toLowerCase();
    if (act === 'v') {
      cls();
      header();
      showSoldPlayersTable();
      await ask(`\n${C.bYellow}Press ENTER to resume auction...${C.reset}`);
    } else if (act === 's') {
      showSquadsDashboard();
      await ask(`\n${C.bYellow}Press ENTER to resume auction...${C.reset}`);
    } else if (act === 'q') {
      break;
    }
  }

  finalReport();
  rl.close();
}

if (require.main === module) {
  main().catch(e => {
    console.error('Auction system error:', e);
    rl.close();
  });
}

module.exports = { main, teams, validateManualBid, getTeamMaxBid };
