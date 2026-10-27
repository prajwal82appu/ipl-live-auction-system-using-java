# Test Cases

Automated: `java -cp out ipl.AuctionTests` (run from the project root). Result of the last run: **30 passed, 0 failed**.

| ID | Test | Expected result |
|---|---|---|
| TC01 | Load `players.csv` | exactly 100 players |
| TC02 | Count roles | 35 Batters, 30 Bowlers, 20 All-Rounders, 15 Wicketkeepers |
| TC03 | Player IDs | all unique |
| TC04 | CSV with wrong header | `InvalidPlayerDataException` |
| TC05 | CSV with role `SPINNER` | rejected |
| TC06 | CSV with age 5 | rejected |
| TC07 | CSV line with too few columns | rejected |
| TC08 | CSV with only one player | rejected (must be 100) |
| TC09 | New franchise | purse = ₹100 Cr |
| TC10 | Bid of ₹150 Cr | blocked – insufficient purse |
| TC11 | Bid of ₹96 Cr in an empty squad | blocked – money needed for 10 more slots |
| TC12 | Bid of ₹20 Cr | allowed |
| TC13 | Create auction | exactly 4 franchises |
| TC14 | Bid with no player on the block | error message |
| TC15 | Sell with no player on the block | error message |
| TC16 | Next Player while a player is on the block | error message |
| TC17 | Sell a player with no bids | error – use Skip |
| TC18 | Bid for franchise `XYZ` | invalid input error |
| TC19 | Bid with empty franchise code | invalid input error |
| TC20 | First bid | equals base price |
| TC21 | Same franchise bids twice in a row | rejected |
| TC22 | Second bid | previous bid + ₹0.50 Cr |
| TC23 | Sell | winner pays exactly the final bid |
| TC24 | Sell | player in winner's squad, marked sold, `soldTo` set |
| TC25 | Sell | other franchises' purses unchanged |
| TC26 | Skip | player is unsold |
| TC27 | Counters | sold + unsold + remaining = 100 |
| TC28 | 300 complete automatic auctions with different random seeds | every franchise has 11 players, role minimums met, purse never negative, purse + spent = 100 |
| TC29 | Any action after the auction finished | "The auction is already complete" |
| TC30 | History | one entry for every sold/unsold event |

## Manual GUI test cases

| ID | Steps | Expected result |
|---|---|---|
| M01 | Start the application | Dashboard opens, all purses ₹100.00 Cr, squads 0/11, bid buttons disabled |
| M02 | Click Next Player | Player card filled, bid buttons enabled with the base price |
| M03 | Click BID CSK, then BID MI | Highest bid rises by ₹0.50 Cr, highest bidder shown, MI panel highlighted |
| M04 | Hover over a disabled bid button | Tooltip explains why (purse / full squad / role rule / already highest bidder) |
| M05 | Click Sell Player | Winner's purse reduces, squad size +1, role count updates, counters update |
| M06 | Click Next Player, then Skip Player | Player appears in Unsold Players |
| M07 | Click Sell Player with no bids | Warning dialog |
| M08 | Click Next Player twice without selling | Warning dialog |
| M09 | Auto Auction | Auction runs automatically, completion dialog, Final Results opens |
| M10 | View Squad / Auction History / Unsold Players / Final Results | Tables open with correct data |
| M11 | Rename `data/players.csv` and start | Error dialog / file chooser |
| M12 | Exit | Confirmation dialog |
