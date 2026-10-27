const { INITIAL_PLAYERS } = require('./web/data.js');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  brightGreen: '\x1b[92m', brightYellow: '\x1b[93m', brightCyan: '\x1b[96m'
};

console.log("================================================================================================================");
console.log("                      🏏 PLAYER SCOUTING CATALOG & CAREER STATS TABLE 🏏                                       ");
console.log("================================================================================================================");
console.log(`  ${'ID'.padEnd(5)} ${'Player Name'.padEnd(20)} ${'Role'.padEnd(13)} ${'Country'.padEnd(12)} ${'Runs'.padStart(6)} ${'Wkts'.padStart(5)} ${'6s'.padStart(4)} ${'4s'.padStart(5)} ${'SR'.padStart(6)} ${'Base'.padStart(9)} ${'Rating'.padStart(7)}  ${'Status'}`);
console.log(`  ${'─'.repeat(108)}`);

INITIAL_PLAYERS.slice(0, 15).forEach(p => {
  const s = p.stats || {};
  let statusStr = `${C.brightGreen}Available in Pool${C.reset}`;

  const runsStr = String(s.runs ?? 0).padStart(6);
  const wktsStr = String(s.wickets ?? 0).padStart(5);
  const sixStr = String(s.sixes ?? 0).padStart(4);
  const fourStr = String(s.fours ?? 0).padStart(5);
  const srStr = String(s.sr ?? '-').padStart(6);
  const baseStr = `₹${p.basePrice.toFixed(2)} Cr`.padStart(9);
  const ratingStr = `⭐${p.rating || 80}`.padStart(7);

  console.log(`  ${p.id.padEnd(5)} ${p.name.padEnd(20)} ${p.role.padEnd(13)} ${p.country.padEnd(12)} ${C.brightYellow}${runsStr}${C.reset} ${C.brightGreen}${wktsStr}${C.reset} ${sixStr} ${fourStr} ${srStr} ${baseStr} ${ratingStr}  ${statusStr}`);
});

console.log(`  ${'─'.repeat(108)}`);
