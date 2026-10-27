/**
 * =========================================================================
 * IPL MEGA AUCTION 2026 - DEMO EXECUTION OF 4-TEAM MANUAL BIDDING
 * Demonstrates manual bidding and custom price amount entry for CSK, RCB, MI, KKR
 * =========================================================================
 */

const { INITIAL_PLAYERS, FRANCHISE_DEFS } = require('./web/data.js');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', white: '\x1b[37m',
  bRed: '\x1b[91m', bGreen: '\x1b[92m', bYellow: '\x1b[93m', bCyan: '\x1b[96m', bMagenta: '\x1b[95m', bWhite: '\x1b[97m',
  bgRed: '\x1b[41m', bgGreen: '\x1b[42m', bgYellow: '\x1b[43m', bgBlue: '\x1b[44m'
};

const SEP  = '═'.repeat(82);
const DASH = '─'.repeat(82);

const TEAM_LIST = ['CSK', 'RCB', 'MI', 'KKR'];
const SQUAD_CAP = 11;
const MAX_OVS = 4;

const teams = {};
TEAM_LIST.forEach(code => {
  const d = FRANCHISE_DEFS[code];
  teams[code] = {
    code,
    name: d.name,
    badge: d.badge || '🏏',
    purse: 100.0,
    startingPurse: 100.0,
    spent: 0.0,
    squad: [],
    overseas: 0,
    roles: { BATTER: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKETKEEPER: 0 }
  };
});

function printHeader() {
  console.log(`\n${C.bYellow}${SEP}${C.reset}`);
  console.log(`${C.bold}${C.bCyan}       🏏  IPL MEGA AUCTION 2026 - 4-TEAM MANUAL BIDDING CONSOLE  🏏${C.reset}`);
  console.log(`${C.dim}       Franchises: CSK 🦁 | RCB 👑 | MI 🌀 | KKR ⚔️   |  Squad: 11  |  Purse: ₹100 Cr${C.reset}`);
  console.log(`${C.bYellow}${SEP}${C.reset}\n`);
}

function showFranchises() {
  console.log(`  ${C.bold}${C.bCyan}─── ALL 4 FRANCHISES REAL-TIME PURSE & ROSTER ───${C.reset}`);
  TEAM_LIST.forEach((code, idx) => {
    const t = teams[code];
    const emptySlots = SQUAD_CAP - t.squad.length - 1;
    const reserve = Math.max(0, emptySlots * 0.50);
    const maxBid = Math.max(0, +(t.purse - reserve).toFixed(2));
    console.log(`  [${C.bold}${idx + 1}${C.reset}] ${t.badge} ${C.bold}${t.name.padEnd(28)}${C.reset} Purse: ${C.bGreen}₹${t.purse.toFixed(2).padStart(6)} Cr${C.reset} | Spent: ₹${t.spent.toFixed(2).padStart(5)} Cr | Squad: ${C.bYellow}${t.squad.length}/${SQUAD_CAP}${C.reset} | OVS: ${t.overseas}/${MAX_OVS} | Max Allowable Bid: ₹${maxBid.toFixed(2)} Cr`);
  });
  console.log(`  ${C.dim}${DASH}${C.reset}\n`);
}

// Sample marquee lots to demonstrate
const demoLots = [
  {
    player: INITIAL_PLAYERS.find(p => p.name.includes("Kohli")) || INITIAL_PLAYERS[0],
    bids: [
      { team: 'CSK', price: 2.00, note: "CSK enters opening manual bid at base price ₹2.00 Cr" },
      { team: 'RCB', price: 8.50, note: "RCB places manual jump bid at ₹8.50 Cr" },
      { team: 'MI',  price: 14.00, note: "MI enters manual counter-bid of ₹14.00 Cr" },
      { team: 'KKR', price: 18.50, note: "KKR places manual bid of ₹18.50 Cr" },
      { team: 'RCB', price: 21.00, note: "RCB outbids KKR with custom manual bid of ₹21.00 Cr!" }
    ]
  },
  {
    player: INITIAL_PLAYERS.find(p => p.name.includes("Bumrah")) || INITIAL_PLAYERS[1],
    bids: [
      { team: 'RCB', price: 2.00, note: "RCB opens manual bidding at ₹2.00 Cr" },
      { team: 'CSK', price: 7.00, note: "CSK adds manual price of ₹7.00 Cr" },
      { team: 'KKR', price: 12.50, note: "KKR raises manual price to ₹12.50 Cr" },
      { team: 'MI',  price: 19.50, note: "MI places manual bid of ₹19.50 Cr!" }
    ]
  },
  {
    player: INITIAL_PLAYERS.find(p => p.name.includes("Russell")) || INITIAL_PLAYERS[2],
    bids: [
      { team: 'MI',  price: 2.00, note: "MI places opening manual bid at ₹2.00 Cr" },
      { team: 'CSK', price: 6.50, note: "CSK bids manual price of ₹6.50 Cr" },
      { team: 'KKR', price: 15.00, note: "KKR bids manual price of ₹15.00 Cr!" }
    ]
  },
  {
    player: INITIAL_PLAYERS.find(p => p.name.includes("Pant") || p.name.includes("Dhoni")) || INITIAL_PLAYERS[3],
    bids: [
      { team: 'KKR', price: 2.00, note: "KKR enters opening bid at ₹2.00 Cr" },
      { team: 'RCB', price: 9.00, note: "RCB bids manual price of ₹9.00 Cr" },
      { team: 'CSK', price: 17.50, note: "CSK bids manual price of ₹17.50 Cr!" }
    ]
  }
];

function runConsoleDemo() {
  printHeader();
  console.log(`${C.bold}${C.bGreen}>>> EXECUTING 4-TEAM MANUAL BIDDING SIMULATION WITH MANUAL PRICES <<<${C.reset}\n`);

  demoLots.forEach((lot, lotIndex) => {
    const p = lot.player;
    console.log(`\n${C.bYellow}${SEP}${C.reset}`);
    console.log(`  ${C.bgBlue}${C.bold}${C.bWhite}  LOT #${String(lotIndex + 1).padStart(3, '0')}  ${C.reset}  ${C.bold}${C.bWhite}${p.name}${C.reset} | Role: ${C.bCyan}${p.role}${C.reset} | Country: ${p.flag} ${p.country} (${p.isOverseas ? '✈️ OVERSEAS' : '🇮🇳 INDIAN'}) | Base: ${C.bYellow}₹${p.basePrice.toFixed(2)} Cr${C.reset} | Rating: ⭐ ${p.rating}/100`);
    console.log(`${C.bYellow}${SEP}${C.reset}\n`);

    showFranchises();

    console.log(`  ${C.bold}${C.bYellow}--- MANUAL BIDDING ROUND FOR ${p.name.toUpperCase()} ---${C.reset}`);
    let currentBid = 0;
    let highestBidder = null;

    lot.bids.forEach((bid, bIdx) => {
      currentBid = bid.price;
      highestBidder = bid.team;
      const t = teams[bid.team];
      console.log(`  👉 Step ${bIdx + 1}: ${t.badge} ${C.bold}${t.name} (${t.code})${C.reset} manually added price: ${C.bold}${C.bYellow}₹${bid.price.toFixed(2)} Cr${C.reset}  ${C.dim}[${bid.note}]${C.reset}`);
    });

    // Hammer Down / Sale
    const winTeam = teams[highestBidder];
    winTeam.purse = +(winTeam.purse - currentBid).toFixed(2);
    winTeam.spent = +(winTeam.spent + currentBid).toFixed(2);
    winTeam.squad.push({ ...p, finalPrice: currentBid });
    winTeam.roles[p.role]++;
    if (p.isOverseas) winTeam.overseas++;

    console.log(`\n  🔨 ${C.bold}${C.bYellow}AUCTIONEER:${C.reset} "Going once for ₹${currentBid.toFixed(2)} Cr... Going twice for ₹${currentBid.toFixed(2)} Cr..."`);
    console.log(`  🔨 ${C.bgGreen}${C.bold}${C.bWhite}  SOLD! 🏏🎉  ${C.reset} ${C.bold}${p.name}${C.reset} is SOLD to ${winTeam.badge} ${C.bold}${C.bGreen}${winTeam.name} (${winTeam.code})${C.reset} for ${C.bold}${C.bYellow}₹${currentBid.toFixed(2)} Cr${C.reset}!\n`);

    // Display Updated Sold Players Table after this lot
    const allSoldSoFar = [];
    TEAM_LIST.forEach(code => {
      teams[code].squad.forEach(sqP => {
        allSoldSoFar.push({ ...sqP, teamCode: code });
      });
    });

    console.log(`  ${C.bold}${C.bYellow}════════════════════════════════════════════════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`  ${C.bold}${C.bYellow}                             🏏 OFFICIAL SOLD PLAYERS LEDGER (${allSoldSoFar.length} Signed) 🏏                            ${C.reset}`);
    console.log(`  ${C.bold}${C.bYellow}════════════════════════════════════════════════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`  ${'#'.padEnd(4)} ${'Player Name'.padEnd(20)} ${'Role'.padEnd(13)} ${'Team Acquired'.padEnd(28)} ${'Final Price'.padStart(12)}  ${'Runs'.padStart(6)} ${'Wkts'.padStart(5)} ${'6s'.padStart(4)} ${'4s'.padStart(5)} ${'SR'.padStart(6)}`);
    console.log(`  ${C.dim}${DASH}${C.reset}`);

    let totSpent = 0;
    allSoldSoFar.forEach((sqP, sIdx) => {
      const s = sqP.stats || {};
      const t = teams[sqP.teamCode];
      const teamDisplay = `${t.badge} ${C.bold}${sqP.teamCode}${C.reset} (${t.name.slice(0, 18)})`;
      const priceStr = `₹${sqP.finalPrice.toFixed(2)} Cr`;
      totSpent += sqP.finalPrice;

      const runsStr = String(s.runs ?? 0).padStart(6);
      const wktsStr = String(s.wickets ?? 0).padStart(5);
      const sixStr = String(s.sixes ?? 0).padStart(4);
      const fourStr = String(s.fours ?? 0).padStart(5);
      const srStr = String(s.sr ?? '-').padStart(6);

      console.log(`  ${(sIdx + 1).toString().padStart(2, ' ')}.  ${C.bold}${sqP.name.padEnd(20)}${C.reset} ${sqP.role.padEnd(13)} ${teamDisplay.padEnd(38)} ${C.bold}${C.bYellow}${priceStr.padStart(12)}${C.reset}  ${runsStr} ${wktsStr} ${sixStr} ${fourStr} ${srStr}`);
    });
    console.log(`  ${C.dim}${DASH}${C.reset}`);
    console.log(`  📊 Total Spent: ${C.bYellow}₹${totSpent.toFixed(2)} Cr${C.reset} across ${allSoldSoFar.length} signed player(s)\n`);
  });

  // Final Summary
  console.log(`\n${C.bYellow}${SEP}${C.reset}`);
  console.log(`${C.bold}${C.bGreen}            🏆 FINAL 4-TEAM STANDINGS & ROSTERS SUMMARY 🏆             ${C.reset}`);
  console.log(`${C.bYellow}${SEP}${C.reset}\n`);

  TEAM_LIST.forEach(code => {
    const t = teams[code];
    console.log(`${t.badge} ${C.bold}${C.bYellow}${t.name} (${t.code})${C.reset}`);
    console.log(`   Spent: ${C.bYellow}₹${t.spent.toFixed(2)} Cr${C.reset} | Remaining Purse: ${C.bGreen}₹${t.purse.toFixed(2)} Cr${C.reset} | Squad: ${t.squad.length}/${SQUAD_CAP} | Overseas: ${t.overseas}/${MAX_OVS}`);
    if (t.squad.length > 0) {
      t.squad.forEach((p, idx) => {
        console.log(`     ${idx + 1}. ${p.name.padEnd(24)} | ${p.role.padEnd(14)} | ${C.bYellow}₹${p.finalPrice.toFixed(2)} Cr${C.reset}`);
      });
    }
    console.log(`${C.dim}${DASH}${C.reset}`);
  });
}

runConsoleDemo();
