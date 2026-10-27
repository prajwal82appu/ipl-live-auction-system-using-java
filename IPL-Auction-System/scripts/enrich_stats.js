const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '..', 'web', 'data.js');
let dataContent = fs.readFileSync(dataFilePath, 'utf8');

const { INITIAL_PLAYERS, FRANCHISE_DEFS, AUCTION_SETTINGS } = require('../web/data.js');

// Known player career stats overrides / high precision data
const STATS_MAP = {
  "Virat Kohli": { runs: 8004, wickets: 4, sixes: 272, fours: 705, sr: 131.9, avg: 38.7, matches: 252 },
  "Rohit Sharma": { runs: 6628, wickets: 15, sixes: 280, fours: 599, sr: 131.1, avg: 29.7, matches: 257 },
  "MS Dhoni": { runs: 5243, wickets: 0, sixes: 252, fours: 363, sr: 137.5, avg: 39.1, stumpings: 42, catches: 142, matches: 264 },
  "Jasprit Bumrah": { runs: 72, wickets: 165, sixes: 3, fours: 6, econ: 7.30, speed: "148.5 km/h", avg: 22.5, sr: 80.0, matches: 133 },
  "Suryakumar Yadav": { runs: 3594, wickets: 0, sixes: 132, fours: 393, sr: 145.3, avg: 32.1, matches: 150 },
  "Hardik Pandya": { runs: 2525, wickets: 64, sixes: 134, fours: 185, sr: 146.0, avg: 28.7, econ: 8.92, speed: "140.2 km/h", matches: 137 },
  "Rishabh Pant": { runs: 3284, wickets: 0, sixes: 154, fours: 296, sr: 148.9, avg: 35.3, stumpings: 22, catches: 75, matches: 111 },
  "KL Rahul": { runs: 4683, wickets: 0, sixes: 187, fours: 401, sr: 134.6, avg: 45.5, stumpings: 8, catches: 64, matches: 132 },
  "Ravindra Jadeja": { runs: 2959, wickets: 160, sixes: 104, fours: 207, sr: 129.6, avg: 27.4, econ: 7.60, matches: 240 },
  "Shubman Gill": { runs: 3216, wickets: 0, sixes: 100, fours: 327, sr: 135.7, avg: 37.8, matches: 103 },
  "Andre Russell": { runs: 2484, wickets: 115, sixes: 209, fours: 172, sr: 174.9, avg: 29.2, econ: 9.20, speed: "144.0 km/h", matches: 127 },
  "Sunil Narine": { runs: 1534, wickets: 180, sixes: 97, fours: 163, sr: 165.8, avg: 17.2, econ: 6.73, matches: 177 },
  "Rashid Khan": { runs: 544, wickets: 149, sixes: 34, fours: 38, sr: 154.5, avg: 14.3, econ: 6.82, matches: 121 },
  "Heinrich Klaasen": { runs: 1980, wickets: 0, sixes: 115, fours: 142, sr: 168.4, avg: 37.3, stumpings: 14, catches: 48, matches: 85 },
  "Jos Buttler": { runs: 3582, wickets: 0, sixes: 161, fours: 360, sr: 147.5, avg: 38.1, stumpings: 11, catches: 85, matches: 107 },
  "Travis Head": { runs: 2850, wickets: 8, sixes: 145, fours: 295, sr: 158.3, avg: 34.2, matches: 95 },
  "Arshdeep Singh": { runs: 45, wickets: 76, sixes: 2, fours: 4, econ: 8.74, speed: "141.2 km/h", avg: 24.1, sr: 72.0, matches: 65 },
  "Mohammed Shami": { runs: 85, wickets: 127, sixes: 4, fours: 8, econ: 8.44, speed: "144.5 km/h", avg: 26.8, sr: 78.0, matches: 110 },
  "Mohammed Siraj": { runs: 98, wickets: 93, sixes: 3, fours: 9, econ: 8.65, speed: "145.0 km/h", avg: 30.3, sr: 82.0, matches: 93 },
  "Yuzvendra Chahal": { runs: 37, wickets: 205, sixes: 1, fours: 3, econ: 7.80, avg: 22.4, sr: 45.0, matches: 160 },
  "Kuldeep Yadav": { runs: 125, wickets: 87, sixes: 5, fours: 10, econ: 7.90, avg: 26.2, sr: 85.0, matches: 84 },
  "Trent Boult": { runs: 68, wickets: 121, sixes: 3, fours: 6, econ: 8.28, speed: "142.0 km/h", avg: 26.5, matches: 104 },
  "Mitchell Starc": { runs: 140, wickets: 51, sixes: 8, fours: 12, econ: 8.60, speed: "149.2 km/h", avg: 22.1, sr: 105.0, matches: 41 },
  "Pat Cummins": { runs: 515, wickets: 63, sixes: 38, fours: 40, sr: 152.0, avg: 19.8, econ: 8.80, speed: "146.0 km/h", matches: 58 },
  "Glenn Maxwell": { runs: 2771, wickets: 37, sixes: 158, fours: 236, sr: 156.7, avg: 24.7, econ: 8.30, matches: 134 },
  "Marcus Stoinis": { runs: 1866, wickets: 43, sixes: 92, fours: 162, sr: 142.0, avg: 27.8, econ: 9.35, matches: 96 },
  "Sam Curran": { runs: 883, wickets: 58, sixes: 42, fours: 74, sr: 140.2, avg: 23.2, econ: 9.40, matches: 59 },
  "Axar Patel": { runs: 1653, wickets: 123, sixes: 73, fours: 128, sr: 130.9, avg: 21.2, econ: 7.24, matches: 150 },
  "Rinku Singh": { runs: 1098, wickets: 0, sixes: 56, fours: 91, sr: 143.3, avg: 31.4, matches: 46 },
  "Sanju Samson": { runs: 4419, wickets: 0, sixes: 206, fours: 352, sr: 138.9, avg: 30.7, stumpings: 16, catches: 82, matches: 168 },
  "Ishan Kishan": { runs: 2644, wickets: 0, sixes: 110, fours: 251, sr: 135.9, avg: 28.4, stumpings: 12, catches: 52, matches: 105 },
  "Yashasvi Jaiswal": { runs: 1607, wickets: 0, sixes: 64, fours: 198, sr: 150.6, avg: 32.1, matches: 53 },
  "Ruturaj Gaikwad": { runs: 2380, wickets: 0, sixes: 87, fours: 228, sr: 136.9, avg: 41.8, matches: 66 },
  "Faf du Plessis": { runs: 4571, wickets: 0, sixes: 166, fours: 422, sr: 136.4, avg: 35.9, matches: 145 },
  "David Warner": { runs: 6565, wickets: 0, sixes: 236, fours: 663, sr: 139.8, avg: 40.5, matches: 184 },
  "Quinton de Kock": { runs: 3157, wickets: 0, sixes: 118, fours: 320, sr: 134.2, avg: 31.3, stumpings: 18, catches: 85, matches: 107 },
  "Nicholas Pooran": { runs: 1769, wickets: 0, sixes: 127, fours: 121, sr: 162.3, avg: 32.2, stumpings: 9, catches: 45, matches: 76 },
  "Kagiso Rabada": { runs: 186, wickets: 117, sixes: 7, fours: 16, econ: 8.42, speed: "148.0 km/h", avg: 21.8, matches: 80 },
  "Anrich Nortje": { runs: 53, wickets: 60, sixes: 2, fours: 4, econ: 8.95, speed: "153.2 km/h", avg: 24.5, matches: 46 }
};

const updatedPlayers = INITIAL_PLAYERS.map(p => {
  const existing = p.stats || {};
  const override = STATS_MAP[p.name];
  
  let runs, wickets, sixes, fours, sr, avg, econ, matches, speed, stumpings, catches;

  if (override) {
    runs = override.runs;
    wickets = override.wickets;
    sixes = override.sixes;
    fours = override.fours;
    sr = override.sr;
    avg = override.avg;
    econ = override.econ || existing.econ;
    speed = override.speed || existing.speed;
    matches = override.matches;
    stumpings = override.stumpings || existing.stumpings;
    catches = override.catches || existing.catches;
  } else {
    // Generate realistic and consistent stats based on Role and Tier/Rating
    const r = p.rating || 80;
    const tierFactor = p.tier === 'Marquee' ? 1.3 : p.tier === 'Gold' ? 1.1 : 0.9;
    matches = existing.matches || Math.floor(40 + (r - 70) * 4);

    if (p.role === 'BATTER') {
      runs = existing.runs || Math.floor(1800 + (r - 70) * 160 * tierFactor);
      wickets = existing.wickets !== undefined ? existing.wickets : (r > 88 && Math.random() > 0.7 ? Math.floor(Math.random() * 8) : 0);
      sixes = existing.sixes || Math.floor(runs / 22);
      fours = existing.fours || Math.floor(runs / 8.5);
      sr = existing.sr || +(130 + (r - 70) * 1.2).toFixed(1);
      avg = existing.avg || +(26 + (r - 70) * 0.4).toFixed(1);
    } else if (p.role === 'WICKETKEEPER') {
      runs = existing.runs || Math.floor(1600 + (r - 70) * 140 * tierFactor);
      wickets = 0;
      sixes = existing.sixes || Math.floor(runs / 24);
      fours = existing.fours || Math.floor(runs / 9);
      sr = existing.sr || +(132 + (r - 70) * 1.1).toFixed(1);
      avg = existing.avg || +(28 + (r - 70) * 0.35).toFixed(1);
      stumpings = existing.stumpings || Math.floor(5 + (r - 70) * 0.6);
      catches = existing.catches || Math.floor(30 + (r - 70) * 2.2);
    } else if (p.role === 'ALL_ROUNDER') {
      runs = existing.runs || Math.floor(1200 + (r - 70) * 90 * tierFactor);
      wickets = existing.wickets || Math.floor(45 + (r - 70) * 3.5 * tierFactor);
      sixes = existing.sixes || Math.floor(runs / 18);
      fours = existing.fours || Math.floor(runs / 10);
      sr = existing.sr || +(135 + (r - 70) * 1.3).toFixed(1);
      avg = existing.avg || +(22 + (r - 70) * 0.3).toFixed(1);
      econ = existing.econ || +(7.8 + Math.random() * 1.2).toFixed(2);
      speed = existing.speed || (Math.random() > 0.4 ? "135.0 km/h" : undefined);
    } else if (p.role === 'BOWLER') {
      wickets = existing.wickets || Math.floor(65 + (r - 70) * 4.8 * tierFactor);
      runs = existing.runs || Math.floor(60 + (r - 70) * 4);
      sixes = existing.sixes || Math.floor(runs / 25);
      fours = existing.fours || Math.floor(runs / 14);
      sr = existing.sr || +(75 + (r - 70) * 0.8).toFixed(1);
      avg = existing.avg || +(22 + (100 - r) * 0.3).toFixed(1); // bowling avg
      econ = existing.econ || +(7.2 + (100 - r) * 0.06).toFixed(2);
      speed = existing.speed || (Math.random() > 0.3 ? `${(138 + Math.random() * 12).toFixed(1)} km/h` : undefined);
    }
  }

  const finalStats = {
    runs: Math.max(0, runs),
    wickets: Math.max(0, wickets),
    sixes: Math.max(0, sixes),
    fours: Math.max(0, fours),
    sr: sr || 130.0,
    avg: avg || 25.0,
    matches: matches || 50
  };

  if (econ !== undefined) finalStats.econ = econ;
  if (speed !== undefined) finalStats.speed = speed;
  if (stumpings !== undefined) finalStats.stumpings = stumpings;
  if (catches !== undefined) finalStats.catches = catches;

  return {
    ...p,
    stats: finalStats
  };
});

// Construct new data.js file
const newFileContent = `// IPL Player Auction 2026 - Enhanced Dataset with Detailed T20 Stats
const INITIAL_PLAYERS = ${JSON.stringify(updatedPlayers, null, 2)};

const FRANCHISE_DEFS = ${JSON.stringify(FRANCHISE_DEFS, null, 2)};

const AUCTION_SETTINGS = ${JSON.stringify(AUCTION_SETTINGS, null, 2)};

if (typeof window !== 'undefined') {
  window.INITIAL_PLAYERS = INITIAL_PLAYERS;
  window.FRANCHISE_DEFS = FRANCHISE_DEFS;
  window.AUCTION_SETTINGS = AUCTION_SETTINGS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { INITIAL_PLAYERS, FRANCHISE_DEFS, AUCTION_SETTINGS };
}
`;

fs.writeFileSync(dataFilePath, newFileContent, 'utf8');
console.log(`Successfully enriched ${updatedPlayers.length} players in data.js!`);
