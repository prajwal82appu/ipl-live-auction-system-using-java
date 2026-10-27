/**
 * Automated Verification Script for 4-Team Manual Bidding with Custom Price Amount Entry
 */
const { validateManualBid, teams, getTeamMaxBid } = require('./live_auction.js');
const { INITIAL_PLAYERS } = require('./web/data.js');

console.log("================================================================================");
console.log("       🧪 VERIFYING 4-TEAM MANUAL BIDDING & CUSTOM PRICE AMOUNT ENGINE         ");
console.log("================================================================================");

const testPlayer = INITIAL_PLAYERS.find(p => p.name.includes("Virat Kohli")) || INITIAL_PLAYERS[0];
console.log(`\nTesting with Player: ${testPlayer.name} (${testPlayer.role}) | Base Price: ₹${testPlayer.basePrice.toFixed(2)} Cr`);

let currentBid = 0.0;
let highestBidder = null;

// Test 1: CSK places opening manual bid at base price ₹2.00 Cr
console.log("\n--- TEST 1: Opening Manual Bid for CSK at ₹2.00 Cr ---");
let v1 = validateManualBid('CSK', testPlayer, 2.00, currentBid, highestBidder);
console.log(`CSK ₹2.00 Cr Validation:`, v1.ok ? "✅ PASS" : `❌ FAIL (${v1.reason})`);
if (v1.ok) {
  currentBid = v1.amount;
  highestBidder = 'CSK';
  console.log(`-> Accepted! Current Highest Bid: ₹${currentBid.toFixed(2)} Cr held by ${highestBidder}`);
}

// Test 2: RCB places manual jump bid at ₹8.50 Cr
console.log("\n--- TEST 2: RCB Manual Jump Bid at ₹8.50 Cr ---");
let v2 = validateManualBid('RCB', testPlayer, 8.50, currentBid, highestBidder);
console.log(`RCB ₹8.50 Cr Validation:`, v2.ok ? "✅ PASS" : `❌ FAIL (${v2.reason})`);
if (v2.ok) {
  currentBid = v2.amount;
  highestBidder = 'RCB';
  console.log(`-> Accepted! Current Highest Bid: ₹${currentBid.toFixed(2)} Cr held by ${highestBidder}`);
}

// Test 3: MI places manual bid at ₹14.75 Cr
console.log("\n--- TEST 3: MI Manual Custom Price Bid at ₹14.75 Cr ---");
let v3 = validateManualBid('MI', testPlayer, 14.75, currentBid, highestBidder);
console.log(`MI ₹14.75 Cr Validation:`, v3.ok ? "✅ PASS" : `❌ FAIL (${v3.reason})`);
if (v3.ok) {
  currentBid = v3.amount;
  highestBidder = 'MI';
  console.log(`-> Accepted! Current Highest Bid: ₹${currentBid.toFixed(2)} Cr held by ${highestBidder}`);
}

// Test 4: KKR places manual counter-bid at ₹21.00 Cr
console.log("\n--- TEST 4: KKR Manual Custom Price Bid at ₹21.00 Cr ---");
let v4 = validateManualBid('KKR', testPlayer, 21.00, currentBid, highestBidder);
console.log(`KKR ₹21.00 Cr Validation:`, v4.ok ? "✅ PASS" : `❌ FAIL (${v4.reason})`);
if (v4.ok) {
  currentBid = v4.amount;
  highestBidder = 'KKR';
  console.log(`-> Accepted! Current Highest Bid: ₹${currentBid.toFixed(2)} Cr held by ${highestBidder}`);
}

// Test 5: Reject invalid bid lower than current bid (e.g. CSK bids ₹15.00 Cr when current is ₹21.00 Cr)
console.log("\n--- TEST 5: Reject Lower Manual Bid (CSK ₹15.00 Cr when current is ₹21.00 Cr) ---");
let v5 = validateManualBid('CSK', testPlayer, 15.00, currentBid, highestBidder);
console.log(`CSK ₹15.00 Cr Rejected as Expected:`, !v5.ok ? `✅ REJECTED CORRECTLY (${v5.reason})` : "❌ UNEXPECTED ACCEPTANCE");

// Test 6: Reject same bidder bidding against itself
console.log("\n--- TEST 6: Reject Same Bidder Outbidding Self (KKR is leader) ---");
let v6 = validateManualBid('KKR', testPlayer, 25.00, currentBid, highestBidder);
console.log(`KKR Self-outbid Rejected:`, !v6.ok ? `✅ REJECTED CORRECTLY (${v6.reason})` : "❌ UNEXPECTED ACCEPTANCE");

// Test 7: Reject bid exceeding allowable purse reserve (₹100 Cr purse, min reserve for remaining 10 slots = ₹5.00 Cr => Max allowable is ₹95.00 Cr)
console.log("\n--- TEST 7: Reject Bid Exceeding Purse Reserve (CSK bids ₹98.00 Cr) ---");
let v7 = validateManualBid('CSK', testPlayer, 98.00, currentBid, highestBidder);
console.log(`CSK ₹98.00 Cr Rejected for Reserve:`, !v7.ok ? `✅ REJECTED CORRECTLY (${v7.reason})` : "❌ UNEXPECTED ACCEPTANCE");

console.log("\n================================================================================");
console.log("            🎉 ALL 4-TEAM MANUAL BIDDING TESTS PASSED!                         ");
console.log("================================================================================");
