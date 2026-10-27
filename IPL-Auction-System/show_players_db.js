#!/usr/bin/env node
/**
 * ============================================================
 *  IPL MEGA AUCTION 2026 — PLAYER DATABASE + SEARCH
 *  Shows: Runs | Sixes | Fours | Wickets | Stumpings
 *  Usage:
 *    node show_players_db.js          → Show all 100 players
 *    node show_players_db.js <query>  → Search by name/role/country
 *  Examples:
 *    node show_players_db.js virat
 *    node show_players_db.js BOWLER
 *    node show_players_db.js India
 * ============================================================
 */

const readline = require('readline');

// ── ANSI Color helpers ───────────────────────────────────────
const C = {
  reset   : '\x1b[0m',
  bold    : '\x1b[1m',
  dim     : '\x1b[2m',
  red     : '\x1b[91m',
  green   : '\x1b[92m',
  yellow  : '\x1b[93m',
  blue    : '\x1b[94m',
  magenta : '\x1b[95m',
  cyan    : '\x1b[96m',
  white   : '\x1b[97m',
  orange  : '\x1b[38;5;214m',
  lime    : '\x1b[38;5;118m',
  pink    : '\x1b[38;5;213m',
  bgBlue  : '\x1b[44m',
  bgGreen : '\x1b[42m',
  bgRed   : '\x1b[41m',
  bgMag   : '\x1b[45m',
  bgCyan  : '\x1b[46m',
};
const b  = (s) => `${C.bold}${s}${C.reset}`;
const col = (color, s) => `${color}${s}${C.reset}`;

// ── Role helpers ─────────────────────────────────────────────
const ROLE_EMOJI  = { BATTER:'🏏', BOWLER:'🎳', WICKETKEEPER:'🧤', ALL_ROUNDER:'⚡' };
const ROLE_COLOR  = { BATTER: C.cyan, BOWLER: C.red, WICKETKEEPER: C.magenta, ALL_ROUNDER: C.lime };
const TIER_COLOR  = { Marquee: C.orange, Gold: C.yellow, Silver: C.white, Bronze: C.dim };

// ── Full 100-player dataset ───────────────────────────────────
const PLAYERS = [
  { id:'P001', name:'Arshdeep Singh',          age:27, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:1.5,  tier:'Marquee', rating:95, isOverseas:false, pastTeam:'PBKS', stats:{ wickets:180, econ:6.85, speed:'141.2 km/h', avg:22.5 } },
  { id:'P002', name:'Ruturaj Gaikwad',          age:29, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:1.5,  tier:'Gold',    rating:85, isOverseas:false, pastTeam:'CSK',  stats:{ runs:6050, sr:155.8, sixes:275, fours:711, avg:32.8 } },
  { id:'P003', name:'Mitchell Marsh',           age:34, country:'Australia',    flag:'🇦🇺', role:'ALL_ROUNDER',  basePrice:1.5,  tier:'Gold',    rating:85, isOverseas:true,  pastTeam:'RCB',  stats:{ runs:3700, sr:156.0, sixes:205, fours:389, wickets:103, econ:8.3,  speed:'137.5 km/h' } },
  { id:'P004', name:'Shivam Dube',              age:32, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:false, pastTeam:'CSK',  stats:{ runs:3300, sr:149.0, sixes:183, fours:347, wickets:91,  econ:8.5,  speed:'132.0 km/h' } },
  { id:'P005', name:'Shubman Gill',             age:26, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:2.0,  tier:'Marquee', rating:95, isOverseas:false, pastTeam:'GT',   stats:{ runs:6950, sr:171.8, sixes:315, fours:817, avg:37.2 } },
  { id:'P006', name:'Bhuvneshwar Kumar',        age:36, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:false, pastTeam:'SRH',  stats:{ wickets:145, econ:7.9,  speed:'146.8 km/h', avg:25.8 } },
  { id:'P007', name:'Jos Buttler',              age:36, country:'England',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', role:'WICKETKEEPER',basePrice:2.0,  tier:'Marquee', rating:95, isOverseas:true,  pastTeam:'RR',   stats:{ runs:5690, sr:163.2, sixes:284, fours:632, stumpings:11, dismissals:125, catches:85 } },
  { id:'P008', name:'Rassie van der Dussen',    age:36, country:'South Africa', flag:'🇿🇦', role:'BATTER',       basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:true,  pastTeam:'KKR',  stats:{ runs:5400, sr:146.5, sixes:245, fours:635, avg:30.5 } },
  { id:'P009', name:'Abhishek Sharma',          age:25, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:false, pastTeam:'SRH',  stats:{ runs:5400, sr:146.5, sixes:245, fours:635, avg:30.5 } },
  { id:'P010', name:'Fazalhaq Farooqi',         age:25, country:'Afghanistan',  flag:'🇦🇫', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:74, isOverseas:true,  pastTeam:'MI',   stats:{ wickets:123, econ:8.41, speed:'140.2 km/h', avg:27.1 } },
  { id:'P011', name:'Phil Salt',                age:30, country:'England',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', role:'WICKETKEEPER',basePrice:1.5,  tier:'Gold',    rating:85, isOverseas:true,  pastTeam:'RCB',  stats:{ runs:4970, sr:150.8, sixes:248, fours:552, stumpings:8,  dismissals:110, catches:76 } },
  { id:'P012', name:'Liam Livingstone',         age:32, country:'England',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', role:'ALL_ROUNDER',  basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:true,  pastTeam:'PBKS', stats:{ runs:3300, sr:149.0, sixes:183, fours:347, wickets:91,  econ:8.5,  speed:'132.0 km/h' } },
  { id:'P013', name:'Dewald Brevis',            age:24, country:'South Africa', flag:'🇿🇦', role:'BATTER',       basePrice:0.75, tier:'Bronze',  rating:74, isOverseas:true,  pastTeam:'MI',   stats:{ runs:3200, sr:170.2, sixes:200, fours:360, avg:27.0 } },
  { id:'P014', name:'Jasprit Bumrah',           age:31, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:2.0,  tier:'Marquee', rating:99, isOverseas:false, pastTeam:'MI',   stats:{ wickets:195, econ:6.30, speed:'149.5 km/h', avg:18.2 } },
  { id:'P015', name:'Virat Kohli',              age:37, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:2.0,  tier:'Marquee', rating:98, isOverseas:false, pastTeam:'RCB',  stats:{ runs:8500, sr:148.0, sixes:290, fours:960, avg:38.5 } },
  { id:'P016', name:'Ravindra Jadeja',          age:37, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:2.0,  tier:'Marquee', rating:97, isOverseas:false, pastTeam:'CSK',  stats:{ runs:2800, sr:130.0, sixes:120, fours:320, wickets:175, econ:7.1,  speed:'118.0 km/h' } },
  { id:'P017', name:'Rishabh Pant',             age:28, country:'India',        flag:'🇮🇳', role:'WICKETKEEPER',basePrice:2.0,  tier:'Marquee', rating:97, isOverseas:false, pastTeam:'DC',   stats:{ runs:5900, sr:168.0, sixes:310, fours:610, stumpings:14, dismissals:145, catches:92 } },
  { id:'P018', name:'Hardik Pandya',            age:32, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:2.0,  tier:'Marquee', rating:95, isOverseas:false, pastTeam:'MI',   stats:{ runs:3800, sr:155.0, sixes:220, fours:390, wickets:125, econ:8.8,  speed:'142.0 km/h' } },
  { id:'P019', name:'KL Rahul',                 age:33, country:'India',        flag:'🇮🇳', role:'WICKETKEEPER',basePrice:2.0,  tier:'Marquee', rating:93, isOverseas:false, pastTeam:'LSG',  stats:{ runs:6200, sr:142.0, sixes:240, fours:720, stumpings:7,  dismissals:98,  catches:65 } },
  { id:'P020', name:'Suryakumar Yadav',         age:34, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:2.0,  tier:'Marquee', rating:98, isOverseas:false, pastTeam:'MI',   stats:{ runs:7200, sr:182.0, sixes:380, fours:740, avg:40.5 } },
  { id:'P021', name:'Mohammed Shami',           age:35, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:2.0,  tier:'Marquee', rating:96, isOverseas:false, pastTeam:'GT',   stats:{ wickets:165, econ:7.65, speed:'150.2 km/h', avg:20.8 } },
  { id:'P022', name:'Rohit Sharma',             age:39, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:2.0,  tier:'Marquee', rating:94, isOverseas:false, pastTeam:'MI',   stats:{ runs:7500, sr:140.5, sixes:310, fours:810, avg:32.0 } },
  { id:'P023', name:'Ishan Kishan',             age:27, country:'India',        flag:'🇮🇳', role:'WICKETKEEPER',basePrice:1.5,  tier:'Gold',    rating:88, isOverseas:false, pastTeam:'MI',   stats:{ runs:4800, sr:158.0, sixes:255, fours:535, stumpings:9,  dismissals:108, catches:70 } },
  { id:'P024', name:'Rashid Khan',              age:27, country:'Afghanistan',  flag:'🇦🇫', role:'ALL_ROUNDER',  basePrice:2.0,  tier:'Marquee', rating:97, isOverseas:true,  pastTeam:'GT',   stats:{ runs:1500, sr:165.0, sixes:110, fours:170, wickets:200, econ:6.2,  speed:'98.0 km/h'  } },
  { id:'P025', name:'David Warner',             age:39, country:'Australia',    flag:'🇦🇺', role:'BATTER',       basePrice:1.5,  tier:'Gold',    rating:87, isOverseas:true,  pastTeam:'DC',   stats:{ runs:7200, sr:152.0, sixes:290, fours:830, avg:34.5 } },
  { id:'P026', name:'Trent Boult',              age:37, country:'New Zealand',  flag:'🇳🇿', role:'BOWLER',       basePrice:1.5,  tier:'Gold',    rating:88, isOverseas:true,  pastTeam:'RR',   stats:{ wickets:150, econ:8.1,  speed:'143.0 km/h', avg:24.5 } },
  { id:'P027', name:'Sunil Narine',             age:37, country:'West Indies',  flag:'🇹🇹', role:'ALL_ROUNDER',  basePrice:1.5,  tier:'Gold',    rating:90, isOverseas:true,  pastTeam:'KKR',  stats:{ runs:2400, sr:178.0, sixes:165, fours:260, wickets:170, econ:6.7,  speed:'85.0 km/h'  } },
  { id:'P028', name:'Yuzvendra Chahal',         age:35, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:1.0,  tier:'Silver',  rating:85, isOverseas:false, pastTeam:'RR',   stats:{ wickets:205, econ:7.45, speed:'88.0 km/h',  avg:19.5 } },
  { id:'P029', name:'Nicholas Pooran',          age:30, country:'West Indies',  flag:'🇹🇹', role:'WICKETKEEPER',basePrice:1.5,  tier:'Gold',    rating:88, isOverseas:true,  pastTeam:'LSG',  stats:{ runs:5100, sr:172.0, sixes:295, fours:530, stumpings:12, dismissals:130, catches:88 } },
  { id:'P030', name:'Faf du Plessis',           age:41, country:'South Africa', flag:'🇿🇦', role:'BATTER',       basePrice:1.0,  tier:'Silver',  rating:82, isOverseas:true,  pastTeam:'RCB',  stats:{ runs:6100, sr:148.5, sixes:260, fours:695, avg:30.8 } },
  { id:'P031', name:'Axar Patel',               age:32, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:1.5,  tier:'Gold',    rating:87, isOverseas:false, pastTeam:'DC',   stats:{ runs:2100, sr:138.0, sixes:105, fours:250, wickets:160, econ:7.0,  speed:'115.0 km/h' } },
  { id:'P032', name:'Kuldeep Yadav',            age:31, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:1.5,  tier:'Gold',    rating:87, isOverseas:false, pastTeam:'DC',   stats:{ wickets:170, econ:7.35, speed:'90.0 km/h',  avg:21.2 } },
  { id:'P033', name:'Andre Russell',            age:38, country:'West Indies',  flag:'🇯🇲', role:'ALL_ROUNDER',  basePrice:1.5,  tier:'Gold',    rating:92, isOverseas:true,  pastTeam:'KKR',  stats:{ runs:4200, sr:188.0, sixes:298, fours:420, wickets:120, econ:9.0,  speed:'145.0 km/h' } },
  { id:'P034', name:'Sanju Samson',             age:31, country:'India',        flag:'🇮🇳', role:'WICKETKEEPER',basePrice:2.0,  tier:'Marquee', rating:91, isOverseas:false, pastTeam:'RR',   stats:{ runs:5800, sr:158.0, sixes:280, fours:630, stumpings:16, dismissals:138, catches:90 } },
  { id:'P035', name:'R Ashwin',                 age:39, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:1.0,  tier:'Silver',  rating:84, isOverseas:false, pastTeam:'PBKS', stats:{ runs:1800, sr:122.0, sixes:85,  fours:210, wickets:180, econ:6.8,  speed:'82.0 km/h'  } },
  { id:'P036', name:'Tilak Varma',              age:24, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:1.5,  tier:'Gold',    rating:85, isOverseas:false, pastTeam:'MI',   stats:{ runs:4200, sr:152.0, sixes:195, fours:480, avg:33.5 } },
  { id:'P037', name:'Yashasvi Jaiswal',         age:24, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:2.0,  tier:'Marquee', rating:95, isOverseas:false, pastTeam:'RR',   stats:{ runs:5500, sr:168.0, sixes:290, fours:620, avg:35.8 } },
  { id:'P038', name:'Wanindu Hasaranga',        age:29, country:'Sri Lanka',    flag:'🇱🇰', role:'ALL_ROUNDER',  basePrice:1.0,  tier:'Silver',  rating:83, isOverseas:true,  pastTeam:'RCB',  stats:{ runs:1400, sr:142.0, sixes:80,  fours:165, wickets:145, econ:7.5,  speed:'92.0 km/h'  } },
  { id:'P039', name:'Prabhsimran Singh',        age:24, country:'India',        flag:'🇮🇳', role:'WICKETKEEPER',basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:false, pastTeam:'PBKS', stats:{ runs:3800, sr:155.0, sixes:195, fours:430, stumpings:6,  dismissals:88,  catches:58 } },
  { id:'P040', name:'Quinton de Kock',          age:33, country:'South Africa', flag:'🇿🇦', role:'WICKETKEEPER',basePrice:1.5,  tier:'Gold',    rating:88, isOverseas:true,  pastTeam:'LSG',  stats:{ runs:5500, sr:155.0, sixes:265, fours:630, stumpings:13, dismissals:125, catches:82 } },
  { id:'P041', name:'Varun Chakravarthy',       age:34, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:1.0,  tier:'Silver',  rating:83, isOverseas:false, pastTeam:'KKR',  stats:{ wickets:130, econ:7.9,  speed:'85.0 km/h',  avg:25.0 } },
  { id:'P042', name:'Tim David',                age:30, country:'Singapore',    flag:'🇸🇬', role:'BATTER',       basePrice:1.0,  tier:'Silver',  rating:81, isOverseas:true,  pastTeam:'MI',   stats:{ runs:3800, sr:180.0, sixes:255, fours:360, avg:30.0 } },
  { id:'P043', name:'Mayank Yadav',             age:24, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:1.5,  tier:'Gold',    rating:86, isOverseas:false, pastTeam:'LSG',  stats:{ wickets:72,  econ:7.2,  speed:'156.7 km/h', avg:20.0 } },
  { id:'P044', name:'Matheesha Pathirana',      age:23, country:'Sri Lanka',    flag:'🇱🇰', role:'BOWLER',       basePrice:1.5,  tier:'Gold',    rating:87, isOverseas:true,  pastTeam:'CSK',  stats:{ wickets:95,  econ:8.0,  speed:'151.0 km/h', avg:21.5 } },
  { id:'P045', name:'Shashank Singh',           age:31, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:0.75, tier:'Bronze',  rating:75, isOverseas:false, pastTeam:'PBKS', stats:{ runs:2800, sr:162.0, sixes:180, fours:300, avg:28.0 } },
  { id:'P046', name:'Noor Ahmad',               age:20, country:'Afghanistan',  flag:'🇦🇫', role:'BOWLER',       basePrice:1.0,  tier:'Silver',  rating:82, isOverseas:true,  pastTeam:'GT',   stats:{ wickets:98,  econ:7.5,  speed:'80.0 km/h',  avg:22.5 } },
  { id:'P047', name:'Rinku Singh',              age:29, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:1.0,  tier:'Silver',  rating:82, isOverseas:false, pastTeam:'KKR',  stats:{ runs:3500, sr:165.0, sixes:205, fours:380, avg:30.0 } },
  { id:'P048', name:'Yash Dayal',               age:27, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.75, tier:'Bronze',  rating:75, isOverseas:false, pastTeam:'GT',   stats:{ wickets:80,  econ:9.1,  speed:'138.0 km/h', avg:28.0 } },
  { id:'P049', name:'Krunal Pandya',            age:34, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:0.75, tier:'Bronze',  rating:75, isOverseas:false, pastTeam:'LSG',  stats:{ runs:2200, sr:140.0, sixes:115, fours:260, wickets:100, econ:7.8,  speed:'112.0 km/h' } },
  { id:'P050', name:'Deepak Hooda',             age:30, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:0.5,  tier:'Bronze',  rating:73, isOverseas:false, pastTeam:'LSG',  stats:{ runs:2500, sr:152.0, sixes:145, fours:290, wickets:68,  econ:8.5,  speed:'125.0 km/h' } },
  { id:'P051', name:'Priyam Garg',              age:24, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:0.5,  tier:'Bronze',  rating:72, isOverseas:false, pastTeam:'SRH',  stats:{ runs:2200, sr:138.0, sixes:115, fours:260, avg:22.0 } },
  { id:'P052', name:'Tushar Deshpande',         age:30, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:72, isOverseas:false, pastTeam:'CSK',  stats:{ wickets:88,  econ:9.5,  speed:'140.0 km/h', avg:30.0 } },
  { id:'P053', name:'Nitish Kumar Reddy',       age:22, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:1.5,  tier:'Gold',    rating:84, isOverseas:false, pastTeam:'SRH',  stats:{ runs:2100, sr:148.0, sixes:115, fours:245, wickets:55,  econ:8.9,  speed:'140.0 km/h' } },
  { id:'P054', name:'Anrich Nortje',            age:33, country:'South Africa', flag:'🇿🇦', role:'BOWLER',       basePrice:1.0,  tier:'Silver',  rating:85, isOverseas:true,  pastTeam:'DC',   stats:{ wickets:105, econ:8.5,  speed:'156.0 km/h', avg:22.0 } },
  { id:'P055', name:'Lockie Ferguson',          age:34, country:'New Zealand',  flag:'🇳🇿', role:'BOWLER',       basePrice:1.0,  tier:'Silver',  rating:83, isOverseas:true,  pastTeam:'GT',   stats:{ wickets:92,  econ:9.0,  speed:'151.5 km/h', avg:25.0 } },
  { id:'P056', name:'Sam Curran',               age:27, country:'England',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', role:'ALL_ROUNDER',  basePrice:1.5,  tier:'Gold',    rating:85, isOverseas:true,  pastTeam:'PBKS', stats:{ runs:2000, sr:138.0, sixes:105, fours:240, wickets:120, econ:8.8,  speed:'136.0 km/h' } },
  { id:'P057', name:'Mohammed Siraj',           age:32, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:2.0,  tier:'Marquee', rating:93, isOverseas:false, pastTeam:'RCB',  stats:{ wickets:160, econ:8.2,  speed:'148.0 km/h', avg:23.5 } },
  { id:'P058', name:'Venkatesh Iyer',           age:31, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:1.0,  tier:'Silver',  rating:81, isOverseas:false, pastTeam:'KKR',  stats:{ runs:3200, sr:158.0, sixes:188, fours:360, wickets:55,  econ:9.2,  speed:'128.0 km/h' } },
  { id:'P059', name:'Tristan Stubbs',           age:25, country:'South Africa', flag:'🇿🇦', role:'BATTER',       basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:true,  pastTeam:'MI',   stats:{ runs:2800, sr:162.0, sixes:175, fours:310, avg:28.0 } },
  { id:'P060', name:'Rilee Rossouw',            age:36, country:'South Africa', flag:'🇿🇦', role:'BATTER',       basePrice:0.75, tier:'Bronze',  rating:76, isOverseas:true,  pastTeam:'PBKS', stats:{ runs:3200, sr:168.0, sixes:210, fours:355, avg:29.0 } },
  { id:'P061', name:'Shardul Thakur',           age:34, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:0.75, tier:'Bronze',  rating:76, isOverseas:false, pastTeam:'KKR',  stats:{ runs:1800, sr:148.0, sixes:105, fours:210, wickets:120, econ:9.5,  speed:'138.0 km/h' } },
  { id:'P062', name:'Avesh Khan',               age:28, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:74, isOverseas:false, pastTeam:'LSG',  stats:{ wickets:85,  econ:9.8,  speed:'142.0 km/h', avg:29.0 } },
  { id:'P063', name:'Ravi Bishnoi',             age:25, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:1.5,  tier:'Gold',    rating:86, isOverseas:false, pastTeam:'LSG',  stats:{ wickets:128, econ:7.6,  speed:'86.0 km/h',  avg:22.0 } },
  { id:'P064', name:'Devdutt Padikkal',         age:26, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:false, pastTeam:'RR',   stats:{ runs:3600, sr:144.0, sixes:165, fours:420, avg:28.5 } },
  { id:'P065', name:'Jason Roy',                age:35, country:'England',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', role:'BATTER',       basePrice:0.5,  tier:'Bronze',  rating:73, isOverseas:true,  pastTeam:'GT',   stats:{ runs:3100, sr:152.0, sixes:175, fours:365, avg:26.0 } },
  { id:'P066', name:'Ravichandran Ashwin',      age:40, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:74, isOverseas:false, pastTeam:'PBKS', stats:{ wickets:160, econ:6.9,  speed:'82.0 km/h',  avg:20.5 } },
  { id:'P067', name:'Harshal Patel',            age:35, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.75, tier:'Bronze',  rating:76, isOverseas:false, pastTeam:'PBKS', stats:{ wickets:135, econ:9.3,  speed:'130.0 km/h', avg:26.0 } },
  { id:'P068', name:'Sai Sudharsan',            age:24, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:1.5,  tier:'Gold',    rating:85, isOverseas:false, pastTeam:'GT',   stats:{ runs:4100, sr:145.0, sixes:170, fours:490, avg:33.0 } },
  { id:'P069', name:'Heinrich Klaasen',         age:35, country:'South Africa', flag:'🇿🇦', role:'WICKETKEEPER',basePrice:1.5,  tier:'Gold',    rating:90, isOverseas:true,  pastTeam:'SRH',  stats:{ runs:4800, sr:175.0, sixes:285, fours:510, stumpings:10, dismissals:112, catches:74 } },
  { id:'P070', name:'Matthew Wade',             age:38, country:'Australia',    flag:'🇦🇺', role:'WICKETKEEPER',basePrice:0.5,  tier:'Bronze',  rating:73, isOverseas:true,  pastTeam:'PBKS', stats:{ runs:3200, sr:148.0, sixes:168, fours:375, stumpings:8,  dismissals:95,  catches:62 } },
  { id:'P071', name:'Jake Fraser-McGurk',       age:23, country:'Australia',    flag:'🇦🇺', role:'BATTER',       basePrice:1.5,  tier:'Gold',    rating:84, isOverseas:true,  pastTeam:'DC',   stats:{ runs:2500, sr:195.0, sixes:195, fours:265, avg:26.0 } },
  { id:'P072', name:'Mark Wood',                age:36, country:'England',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', role:'BOWLER',       basePrice:1.0,  tier:'Silver',  rating:83, isOverseas:true,  pastTeam:'LSG',  stats:{ wickets:78,  econ:9.2,  speed:'155.0 km/h', avg:23.0 } },
  { id:'P073', name:'Shreyas Iyer',             age:31, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:2.0,  tier:'Marquee', rating:90, isOverseas:false, pastTeam:'KKR',  stats:{ runs:6000, sr:145.0, sixes:235, fours:695, avg:31.5 } },
  { id:'P074', name:'Alzarri Joseph',           age:28, country:'West Indies',  flag:'🇯🇲', role:'BOWLER',       basePrice:1.0,  tier:'Silver',  rating:83, isOverseas:true,  pastTeam:'MI',   stats:{ wickets:87,  econ:8.8,  speed:'150.5 km/h', avg:23.5 } },
  { id:'P075', name:'Shaheen Afridi',           age:26, country:'Pakistan',     flag:'🇵🇰', role:'BOWLER',       basePrice:1.5,  tier:'Gold',    rating:88, isOverseas:true,  pastTeam:'PBKS', stats:{ wickets:115, econ:8.1,  speed:'151.0 km/h', avg:21.8 } },
  { id:'P076', name:'Smrith Mandhana',          age:30, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:false, pastTeam:'RCB',  stats:{ runs:3600, sr:142.0, sixes:150, fours:430, avg:28.0 } },
  { id:'P077', name:'Deepak Chahar',            age:33, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.75, tier:'Bronze',  rating:76, isOverseas:false, pastTeam:'CSK',  stats:{ wickets:100, econ:8.2,  speed:'138.0 km/h', avg:25.0 } },
  { id:'P078', name:'Kieron Pollard',           age:38, country:'West Indies',  flag:'🇹🇹', role:'ALL_ROUNDER',  basePrice:1.0,  tier:'Silver',  rating:82, isOverseas:true,  pastTeam:'MI',   stats:{ runs:3500, sr:172.0, sixes:255, fours:370, wickets:80,  econ:9.5,  speed:'128.0 km/h' } },
  { id:'P079', name:'Daryl Mitchell',           age:34, country:'New Zealand',  flag:'🇳🇿', role:'ALL_ROUNDER',  basePrice:0.75, tier:'Bronze',  rating:76, isOverseas:true,  pastTeam:'CSK',  stats:{ runs:2800, sr:150.0, sixes:160, fours:325, wickets:55,  econ:9.0,  speed:'130.0 km/h' } },
  { id:'P080', name:'Aryan Juyal',              age:22, country:'India',        flag:'🇮🇳', role:'WICKETKEEPER',basePrice:0.5,  tier:'Bronze',  rating:70, isOverseas:false, pastTeam:'SRH',  stats:{ runs:1800, sr:138.0, sixes:90,  fours:215, stumpings:5,  dismissals:72,  catches:47 } },
  { id:'P081', name:'Umesh Yadav',              age:38, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:73, isOverseas:false, pastTeam:'CSK',  stats:{ wickets:130, econ:9.5,  speed:'143.0 km/h', avg:28.0 } },
  { id:'P082', name:'Russel Domingo',           age:27, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:0.5,  tier:'Bronze',  rating:70, isOverseas:false, pastTeam:'RCB',  stats:{ runs:1800, sr:135.0, sixes:90,  fours:215, avg:20.0 } },
  { id:'P083', name:'Anmolpreet Singh',         age:26, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:0.5,  tier:'Bronze',  rating:70, isOverseas:false, pastTeam:'KKR',  stats:{ runs:1500, sr:130.0, sixes:72,  fours:185, avg:18.5 } },
  { id:'P084', name:'Arshad Khan',              age:25, country:'Pakistan',     flag:'🇵🇰', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:70, isOverseas:true,  pastTeam:'SRH',  stats:{ wickets:62,  econ:9.8,  speed:'135.0 km/h', avg:30.0 } },
  { id:'P085', name:'Nathan Ellis',             age:32, country:'Australia',    flag:'🇦🇺', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:72, isOverseas:true,  pastTeam:'PBKS', stats:{ wickets:75,  econ:9.2,  speed:'140.0 km/h', avg:27.0 } },
  { id:'P086', name:'Shams Mulani',             age:29, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:0.5,  tier:'Bronze',  rating:70, isOverseas:false, pastTeam:'MI',   stats:{ runs:1200, sr:128.0, sixes:58,  fours:148, wickets:65,  econ:8.1,  speed:'88.0 km/h'  } },
  { id:'P087', name:'Riyan Parag',              age:24, country:'India',        flag:'🇮🇳', role:'ALL_ROUNDER',  basePrice:1.5,  tier:'Gold',    rating:83, isOverseas:false, pastTeam:'RR',   stats:{ runs:3000, sr:158.0, sixes:178, fours:342, wickets:45,  econ:9.5,  speed:'118.0 km/h' } },
  { id:'P088', name:'Arjun Tendulkar',          age:27, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:70, isOverseas:false, pastTeam:'MI',   stats:{ wickets:48,  econ:9.8,  speed:'136.0 km/h', avg:33.0 } },
  { id:'P089', name:'Vidwath Kaverappa',        age:26, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:72, isOverseas:false, pastTeam:'KKR',  stats:{ wickets:58,  econ:9.1,  speed:'140.0 km/h', avg:27.5 } },
  { id:'P090', name:'Khaleel Ahmed',            age:30, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:74, isOverseas:false, pastTeam:'DC',   stats:{ wickets:90,  econ:9.0,  speed:'140.0 km/h', avg:27.0 } },
  { id:'P091', name:'Rahul Tripathi',           age:32, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:0.5,  tier:'Bronze',  rating:74, isOverseas:false, pastTeam:'SRH',  stats:{ runs:3200, sr:148.0, sixes:168, fours:378, avg:26.5 } },
  { id:'P092', name:'Suyash Sharma',            age:23, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:72, isOverseas:false, pastTeam:'KKR',  stats:{ wickets:55,  econ:9.2,  speed:'84.0 km/h',  avg:28.0 } },
  { id:'P093', name:'Naveen-ul-Haq',            age:26, country:'Afghanistan',  flag:'🇦🇫', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:73, isOverseas:true,  pastTeam:'LSG',  stats:{ wickets:68,  econ:9.5,  speed:'140.0 km/h', avg:28.5 } },
  { id:'P094', name:'Daniel Sams',              age:34, country:'Australia',    flag:'🇦🇺', role:'ALL_ROUNDER',  basePrice:0.5,  tier:'Bronze',  rating:72, isOverseas:true,  pastTeam:'MI',   stats:{ runs:1500, sr:148.0, sixes:98,  fours:178, wickets:72,  econ:9.8,  speed:'140.0 km/h' } },
  { id:'P095', name:'Beau Webster',             age:29, country:'Australia',    flag:'🇦🇺', role:'ALL_ROUNDER',  basePrice:0.75, tier:'Bronze',  rating:74, isOverseas:true,  pastTeam:'SRH',  stats:{ runs:2000, sr:155.0, sixes:118, fours:238, wickets:60,  econ:9.0,  speed:'132.0 km/h' } },
  { id:'P096', name:'Tom Hartley',              age:27, country:'England',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', role:'BOWLER',       basePrice:0.5,  tier:'Bronze',  rating:72, isOverseas:true,  pastTeam:'MI',   stats:{ wickets:55,  econ:8.8,  speed:'80.0 km/h',  avg:26.0 } },
  { id:'P097', name:'Harshit Rana',             age:24, country:'India',        flag:'🇮🇳', role:'BOWLER',       basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:false, pastTeam:'KKR',  stats:{ wickets:65,  econ:8.8,  speed:'147.0 km/h', avg:23.0 } },
  { id:'P098', name:'Dhruv Jurel',              age:24, country:'India',        flag:'🇮🇳', role:'WICKETKEEPER',basePrice:1.0,  tier:'Silver',  rating:80, isOverseas:false, pastTeam:'RR',   stats:{ runs:2500, sr:142.0, sixes:105, fours:295, stumpings:7,  dismissals:85,  catches:56 } },
  { id:'P099', name:'Angkrish Raghuvanshi',     age:20, country:'India',        flag:'🇮🇳', role:'BATTER',       basePrice:0.5,  tier:'Bronze',  rating:72, isOverseas:false, pastTeam:'KKR',  stats:{ runs:1200, sr:148.0, sixes:68,  fours:145, avg:20.0 } },
  { id:'P100', name:'Rovman Powell',            age:31, country:'West Indies',  flag:'🇯🇲', role:'BATTER',       basePrice:0.75, tier:'Bronze',  rating:76, isOverseas:true,  pastTeam:'DC',   stats:{ runs:3000, sr:168.0, sixes:200, fours:335, avg:27.5 } },
];

// ── Print one detailed player card ────────────────────────────
function printCard(p, idx) {
  const s       = p.stats || {};
  const rCol    = ROLE_COLOR[p.role]  || C.white;
  const tCol    = TIER_COLOR[p.tier]  || C.dim;
  const emoji   = ROLE_EMOJI[p.role]  || '🏏';
  const ovs     = p.isOverseas ? col(C.magenta, '✈ OVERSEAS') : col(C.green, '🇮🇳 INDIA  ');
  const W       = 66;
  const line    = '═'.repeat(W);
  const thin    = '─'.repeat(W);

  console.log(`\n  ${rCol}${C.bold}╔${line}╗${C.reset}`);

  // Header: ID + Name
  const hdr = ` #${String(idx).padStart(3,'0')}  ${emoji}  ${p.name}`;
  console.log(`  ${rCol}${C.bold}║${C.reset}${C.bold}${C.white}${hdr.padEnd(W)}${C.reset}${rCol}${C.bold}║${C.reset}`);
  console.log(`  ${rCol}${C.bold}╠${thin}╣${C.reset}`);

  // Info row
  console.log(`  ${rCol}║${C.reset}  ${emoji} ${col(rCol, b(p.role.padEnd(14)))}  ${p.flag} ${b(p.country.padEnd(14))} ${ovs}  Age:${b(p.age)}`);
  console.log(`  ${rCol}║${C.reset}  🎖 Tier: ${col(tCol, b(p.tier.padEnd(8)))}  ⭐ Rating: ${col(C.yellow, b(p.rating))}  💰 Base: ${col(C.yellow, b('₹'+p.basePrice.toFixed(2)+' Cr'))}`);
  console.log(`  ${rCol}${C.bold}╠${thin}╣${C.reset}`);

  // ── BATTING STATS ───────────────────────────────────────────
  if (s.runs !== undefined || p.role === 'BATTER' || p.role === 'WICKETKEEPER' || p.role === 'ALL_ROUNDER') {
    console.log(`  ${rCol}║${C.reset}  ${col(C.cyan, b('🏏 BATTING STATS'))}`);
    console.log(`  ${rCol}║${C.reset}   ┌───────────────────────────────────────────────────────┐`);
    console.log(`  ${rCol}║${C.reset}   │  📊 Total Runs  : ${col(C.yellow, b(String(s.runs  ?? '—').padEnd(8)))}  6️⃣  Sixes : ${col(C.yellow, b(String(s.sixes  ?? '—').padEnd(6)))}  │`);
    console.log(`  ${rCol}║${C.reset}   │  4️⃣  Fours      : ${col(C.green,  b(String(s.fours ?? '—').padEnd(8)))}  ⚡ SR    : ${col(C.green,  b(String(s.sr    ?? '—').padEnd(6)))}  │`);
    console.log(`  ${rCol}║${C.reset}   └───────────────────────────────────────────────────────┘`);
  }

  // ── BOWLING STATS ───────────────────────────────────────────
  if (s.wickets !== undefined) {
    console.log(`  ${rCol}║${C.reset}  ${col(C.red, b('🎳 BOWLING STATS'))}`);
    console.log(`  ${rCol}║${C.reset}   ┌───────────────────────────────────────────────────────┐`);
    console.log(`  ${rCol}║${C.reset}   │  🎯 Wickets : ${col(C.red,    b(String(s.wickets ?? '—').padEnd(6)))}  💰 Economy : ${col(C.orange, b(String(s.econ  ?? '—').padEnd(6)))}  │`);
    console.log(`  ${rCol}║${C.reset}   │  🚀 Speed   : ${col(C.yellow, b(String(s.speed   ?? '—').padEnd(12)))}                          │`);
    console.log(`  ${rCol}║${C.reset}   └───────────────────────────────────────────────────────┘`);
  }

  // ── WICKETKEEPER STATS ──────────────────────────────────────
  if (s.stumpings !== undefined) {
    console.log(`  ${rCol}║${C.reset}  ${col(C.magenta, b('🧤 KEEPING STATS'))}`);
    console.log(`  ${rCol}║${C.reset}   ┌───────────────────────────────────────────────────────┐`);
    console.log(`  ${rCol}║${C.reset}   │  🧤 Stumpings : ${col(C.magenta, b(String(s.stumpings  ?? '—').padEnd(6)))}  🙌 Catches    : ${col(C.pink,    b(String(s.catches ?? '—').padEnd(4)))}  │`);
    console.log(`  ${rCol}║${C.reset}   │  🏅 Dismissals: ${col(C.blue,    b(String(s.dismissals ?? '—').padEnd(12)))}                        │`);
    console.log(`  ${rCol}║${C.reset}   └───────────────────────────────────────────────────────┘`);
  }

  console.log(`  ${rCol}${C.bold}╚${line}╝${C.reset}`);
}

// ── Summary table ─────────────────────────────────────────────
function printTable(players, title) {
  const sep = '─'.repeat(112);
  console.log(`\n${col(C.bgCyan, b('  ' + title.padEnd(110) + '  '))}`);
  console.log(`\n  ${col(C.bold + C.cyan, ' #'.padEnd(5))}  ${col(C.bold + C.cyan, 'ID'.padEnd(6))}  ${col(C.bold + C.cyan, 'Name'.padEnd(26))}  ${col(C.bold + C.cyan, 'Role'.padEnd(14))}  ${col(C.bold + C.cyan, 'Age'.padEnd(4))}  ${col(C.bold + C.cyan, 'Tier'.padEnd(8))}  ${col(C.bold + C.cyan, 'Runs'.padEnd(6))}  ${col(C.bold + C.cyan, '6s'.padEnd(5))}  ${col(C.bold + C.cyan, '4s'.padEnd(5))}  ${col(C.bold + C.cyan, 'Wkts'.padEnd(5))}  ${col(C.bold + C.cyan, 'Stmps'.padEnd(6))}  ${col(C.bold + C.cyan, 'SR/Econ'.padEnd(8))}  ${col(C.bold + C.cyan, 'Speed')}`);
  console.log(`  ${col(C.dim, sep)}`);

  players.forEach((p, i) => {
    const s  = p.stats || {};
    const rC = ROLE_COLOR[p.role] || C.white;
    const row = [
      String(i + 1).padEnd(4),
      p.id.padEnd(6),
      p.name.substring(0, 24).padEnd(26),
      p.role.padEnd(14),
      String(p.age).padEnd(4),
      p.tier.padEnd(8),
      String(s.runs      ?? '—').padEnd(6),
      String(s.sixes     ?? '—').padEnd(5),
      String(s.fours     ?? '—').padEnd(5),
      String(s.wickets   ?? '—').padEnd(5),
      String(s.stumpings ?? '—').padEnd(6),
      String(s.sr ?? s.econ ?? '—').padEnd(8),
      String(s.speed ?? '—'),
    ].join('  ');
    console.log(`  ${col(rC, row)}`);
  });

  console.log(`  ${col(C.dim, sep)}`);
}

// ── Aggregate stats ───────────────────────────────────────────
function printAggregates(players) {
  let totalRuns=0, totalSixes=0, totalFours=0, totalWickets=0, totalStumpings=0;
  players.forEach(p => {
    const s = p.stats || {};
    totalRuns      += s.runs      || 0;
    totalSixes     += s.sixes     || 0;
    totalFours     += s.fours     || 0;
    totalWickets   += s.wickets   || 0;
    totalStumpings += s.stumpings || 0;
  });

  const eq = '═'.repeat(70);
  console.log(`\n  ${col(C.bgMag, b('  📊  DATABASE AGGREGATE STATS  '))}`);
  console.log(`  ${col(C.magenta, b('╔'+eq+'╗'))}`);
  console.log(`  ${col(C.magenta, '║')}  🏏  Total Runs   (all batters/all-rounders/keepers) : ${col(C.yellow, b(totalRuns.toLocaleString()))}`);
  console.log(`  ${col(C.magenta, '║')}  6️⃣   Total Sixes  (all batters/all-rounders/keepers) : ${col(C.yellow, b(totalSixes.toLocaleString()))}`);
  console.log(`  ${col(C.magenta, '║')}  4️⃣   Total Fours  (all batters/all-rounders/keepers) : ${col(C.yellow, b(totalFours.toLocaleString()))}`);
  console.log(`  ${col(C.magenta, '║')}  🎯  Total Wickets (all bowlers/all-rounders)         : ${col(C.red,    b(totalWickets.toLocaleString()))}`);
  console.log(`  ${col(C.magenta, '║')}  🧤  Total Stumpings (all wicketkeepers)              : ${col(C.magenta, b(totalStumpings.toLocaleString()))}`);
  console.log(`  ${col(C.magenta, b('╚'+eq+'╝'))}`);
}

// ── Search function ───────────────────────────────────────────
function searchPlayers(query) {
  const q = query.toLowerCase();
  return PLAYERS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.role.toLowerCase().includes(q) ||
    p.country.toLowerCase().includes(q) ||
    p.tier.toLowerCase().includes(q) ||
    p.id.toLowerCase().includes(q) ||
    p.pastTeam.toLowerCase().includes(q)
  );
}

// ── MAIN ─────────────────────────────────────────────────────
function main() {
  const args  = process.argv.slice(2);
  const query = args.join(' ').trim();

  // Title banner
  console.log(`\n${col(C.bgMag, b('  ╔══════════════════════════════════════════════════════════════════════╗  '))}`);
  console.log(`${col(C.bgMag, b('  ║   🏏  IPL MEGA AUCTION 2026 — PLAYER DATABASE & SEARCH VIEWER  🏏   ║  '))}`);
  console.log(`${col(C.bgMag, b('  ╚══════════════════════════════════════════════════════════════════════╝  '))}`);
  console.log(`\n  Usage: ${b('node show_players_db.js [search query]')}`);
  console.log(`  Example: node show_players_db.js virat  |  node show_players_db.js BOWLER  |  node show_players_db.js India\n`);

  let list = [];
  let mode = '';

  if (query) {
    // ── SEARCH MODE ──────────────────────────────────────────
    list = searchPlayers(query);
    mode = `SEARCH RESULTS for: "${query.toUpperCase()}" — ${list.length} player(s) found`;
    console.log(`\n${col(C.bgBlue, b(`  🔍  ${mode}  `))}\n`);

    if (list.length === 0) {
      console.log(`  ${col(C.red, b('❌ No players found matching: "' + query + '"'))}`);
      console.log(`  Try searching by: name, role (BATTER/BOWLER/WICKETKEEPER/ALL_ROUNDER), country, tier, past team`);
      return;
    }

    // Show full cards for search results
    list.forEach((p, i) => printCard(p, PLAYERS.indexOf(p) + 1));

  } else {
    // ── FULL DATABASE MODE ───────────────────────────────────
    list = PLAYERS;
    mode = 'COMPLETE DATABASE — ALL 100 PLAYERS';
    console.log(`\n${col(C.bgBlue, b(`  📋  ${mode}  `))}\n`);

    // Show grouped by role with cards
    const roles = ['BATTER', 'BOWLER', 'WICKETKEEPER', 'ALL_ROUNDER'];
    const roleLabel = { BATTER:'🏏 BATTERS', BOWLER:'🎳 BOWLERS', WICKETKEEPER:'🧤 WICKETKEEPERS', ALL_ROUNDER:'⚡ ALL-ROUNDERS' };

    roles.forEach(role => {
      const group = PLAYERS.filter(p => p.role === role);
      const rC = ROLE_COLOR[role] || C.white;
      const eq = '═'.repeat(68);
      console.log(`\n${col(rC, b('╔'+eq+'╗'))}`);
      console.log(`${col(rC, b('║'))}  ${col(rC, b((roleLabel[role] + '  (' + group.length + ' players) — ' + getStatDesc(role)).padEnd(66)))}  ${col(rC, b('║'))}`);
      console.log(`${col(rC, b('╚'+eq+'╝'))}`);
      group.forEach(p => printCard(p, PLAYERS.indexOf(p) + 1));
    });
  }

  // Always show the summary table
  printTable(list, mode + ' — QUICK STATS TABLE');

  // Aggregates
  printAggregates(list);

  // Role breakdown
  const counts = { BATTER:0, BOWLER:0, WICKETKEEPER:0, ALL_ROUNDER:0 };
  list.forEach(p => counts[p.role] = (counts[p.role]||0) + 1);
  console.log(`\n  ${col(C.dim, '────────────────────────────────────────')}`);
  console.log(`  ${b('Role Breakdown:')}  🏏 Batters:${b(counts.BATTER)}  🎳 Bowlers:${b(counts.BOWLER)}  🧤 Keepers:${b(counts.WICKETKEEPER)}  ⚡ All-Rounders:${b(counts.ALL_ROUNDER)}`);
  console.log(`\n  ${col(C.bgGreen, b('  ✅  DONE — ' + list.length + ' players shown  ✅  '))}\n`);
}

function getStatDesc(role) {
  return { BATTER:'Runs | Sixes | Fours | Strike Rate', BOWLER:'Wickets | Economy | Speed', WICKETKEEPER:'Runs | Sixes | Fours | Stumpings | Catches', ALL_ROUNDER:'Batting + Bowling' }[role] || '';
}

main();
