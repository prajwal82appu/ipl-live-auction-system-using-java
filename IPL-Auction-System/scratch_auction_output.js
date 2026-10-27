const fs = require('fs');
const { INITIAL_PLAYERS, FRANCHISE_DEFS, AUCTION_SETTINGS } = require('./web/data.js');

function runFullConsoleAuction() {
  const teams = {};
  const teamKeys = ['CSK', 'RCB', 'MI', 'KKR', 'SRH', 'GT', 'RR', 'DC', 'LSG', 'PBKS'];
  const startingPurse = 120.0;
  const squadLimit = 15;
  const maxOverseas = 4;
  const bidIncrement = 0.5;

  teamKeys.forEach(code => {
    const def = FRANCHISE_DEFS[code];
    teams[code] = {
      code,
      name: def.name,
      badge: def.badge || '🏏',
      purse: startingPurse,
      startingPurse,
      spent: 0.0,
      squadLimit,
      maxOverseas,
      overseasCount: 0,
      squad: [],
      roleCounts: { BATTER: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKETKEEPER: 0 }
    };
  });

  const players = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
  // deterministic shuffle for a clean run
  let queue = [...players];
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  const soldPlayers = [];
  const unsoldPlayers = [];
  const history = [];

  function canBid(teamCode, player, amount) {
    const t = teams[teamCode];
    if (t.squad.length >= t.squadLimit) return false;
    if (player.isOverseas && t.overseasCount >= t.maxOverseas) return false;
    const remainingSlots = t.squadLimit - t.squad.length - 1;
    const reserveNeeded = Math.max(0, remainingSlots * 0.5);
    return (t.purse - amount) >= reserveNeeded;
  }

  function getWillingness(teamCode, player) {
    const t = teams[teamCode];
    if (!canBid(teamCode, player, player.basePrice)) return 0;
    let score = 0.5;
    const rc = t.roleCounts[player.role] || 0;
    if (rc === 0) score += 0.8;
    else if (rc < 2) score += 0.4;
    score += (player.rating || 80) / 100;
    let maxMult = player.tier === 'Marquee' ? 6.5 : player.tier === 'Gold' ? 4.2 : 2.8;
    const purseFactor = t.purse / t.startingPurse;
    const maxBid = player.basePrice * (1 + (Math.random() * maxMult * score * purseFactor));
    return Math.min(t.purse - 2.0, maxBid);
  }

  console.log("========================================================================================");
  console.log("           🏏  IPL MEGA AUCTION 2026 - OFFICIAL CONSOLE SIMULATION  🏏");
  console.log("========================================================================================");
  console.log(`Franchises: 10 | Starting Purse: ₹120.00 Cr | Squad Cap: 15 | Overseas Cap: 4`);
  console.log(`Total Players in Pool: ${players.length} | Bid Increment: ₹0.50 Cr\n`);
  console.log("----------------------------------------------------------------------------------------");
  console.log("LOT-BY-LOT AUCTION ACTION (ROUND 1)");
  console.log("----------------------------------------------------------------------------------------");

  let lot = 0;
  let round = 1;

  while (queue.length > 0 || (round === 1 && unsoldPlayers.length > 0)) {
    if (queue.length === 0 && round === 1) {
      console.log("\n========================================================================================");
      console.log(`>>> ROUND 1 COMPLETE (${soldPlayers.length} Sold, ${unsoldPlayers.length} Unsold) -> STARTING ACCELERATED ROUND 2 <<<`);
      console.log("========================================================================================\n");
      round = 2;
      queue = [...unsoldPlayers];
      unsoldPlayers.length = 0;
    }

    if (queue.length === 0) break;

    const player = queue.shift();
    lot++;

    let currentBid = 0.0;
    let highestBidder = null;
    const aiMaxBids = {};
    teamKeys.forEach(code => {
      aiMaxBids[code] = getWillingness(code, player);
    });

    while (true) {
      const nextAmount = highestBidder === null ? player.basePrice : +(currentBid + bidIncrement).toFixed(2);
      const eligible = teamKeys.filter(code => {
        if (code === highestBidder) return false;
        return canBid(code, player, nextAmount) && aiMaxBids[code] >= nextAmount;
      });

      if (eligible.length === 0) break;
      const bidder = eligible[Math.floor(Math.random() * eligible.length)];
      currentBid = nextAmount;
      highestBidder = bidder;
    }

    const ovs = player.isOverseas ? "[OVS ✈️]" : "[IND 🇮🇳]";
    if (highestBidder) {
      const team = teams[highestBidder];
      team.purse -= currentBid;
      team.spent += currentBid;
      team.squad.push({ ...player, finalPrice: currentBid });
      team.roleCounts[player.role]++;
      if (player.isOverseas) team.overseasCount++;

      player.sold = true;
      player.soldTo = team.code;
      player.finalPrice = currentBid;
      soldPlayers.push(player);
      history.push({ lot, player: player.name, role: player.role, round, sold: true, winner: team.code, price: currentBid });

      console.log(`Lot ${lot.toString().padStart(3, ' ')}: ${player.name.padEnd(23)} | ${player.role.padEnd(12)} | ${ovs.padEnd(9)} | Base: ₹${player.basePrice.toFixed(2).padStart(4)} Cr -> SOLD to ${team.code.padEnd(4)} for ₹${currentBid.toFixed(2).padStart(5)} Cr`);
    } else {
      player.sold = false;
      player.soldTo = '-';
      player.finalPrice = 0.0;
      unsoldPlayers.push(player);
      history.push({ lot, player: player.name, role: player.role, round, sold: false, winner: '-', price: 0.0 });
      console.log(`Lot ${lot.toString().padStart(3, ' ')}: ${player.name.padEnd(23)} | ${player.role.padEnd(12)} | ${ovs.padEnd(9)} | Base: ₹${player.basePrice.toFixed(2).padStart(4)} Cr -> UNSOLD`);
    }
  }

  // Standings & Leaderboard
  console.log("\n========================================================================================");
  console.log("                        🏆 TOP 15 MOST EXPENSIVE PLAYERS 🏆");
  console.log("========================================================================================");
  const topBuys = [...soldPlayers].sort((a, b) => b.finalPrice - a.finalPrice).slice(0, 15);
  topBuys.forEach((p, idx) => {
    const rank = (idx + 1).toString().padStart(2, ' ');
    const ovs = p.isOverseas ? "✈️ Overseas" : "🇮🇳 India";
    console.log(`  ${rank}. ${p.name.padEnd(24)} (${p.role.padEnd(12)}) | ${ovs.padEnd(11)} | Bought by: ${p.soldTo.padEnd(5)} | ₹${p.finalPrice.toFixed(2)} Cr`);
  });

  // Franchise summary
  console.log("\n========================================================================================");
  console.log("                     📊 FRANCHISE FINAL SQUADS & SPENDING REPORT 📊");
  console.log("========================================================================================");
  Object.values(teams).forEach(t => {
    console.log(`\n----------------------------------------------------------------------------------------`);
    console.log(`[${t.code}] ${t.name.toUpperCase()} ${t.badge}`);
    console.log(`Purse Remaining: ₹${t.purse.toFixed(2)} Cr / ₹${t.startingPurse.toFixed(2)} Cr | Total Spent: ₹${t.spent.toFixed(2)} Cr`);
    console.log(`Squad Size: ${t.squad.length}/${t.squadLimit} | Overseas Players: ${t.overseasCount}/${t.maxOverseas}`);
    console.log(`Roles: BAT: ${t.roleCounts.BATTER} | BOWL: ${t.roleCounts.BOWLER} | AR: ${t.roleCounts.ALL_ROUNDER} | WK: ${t.roleCounts.WICKETKEEPER}`);
    console.log(`\n  Squad Members:`);
    t.squad.forEach((p, idx) => {
      const num = (idx + 1).toString().padStart(2, ' ');
      const flag = p.isOverseas ? "✈️" : "🇮🇳";
      console.log(`    ${num}. ${flag} ${p.name.padEnd(23)} | ${p.role.padEnd(12)} | Age: ${p.age || 26} | ₹${p.finalPrice.toFixed(2)} Cr`);
    });
  });

  console.log("\n========================================================================================");
  console.log(`AUCTION AUDIT SUMMARY: Total Sold: ${soldPlayers.length} | Unsold: ${unsoldPlayers.length} | Overall Total: ${players.length}`);
  console.log("========================================================================================\n");
}

runFullConsoleAuction();
