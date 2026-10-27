# Project Explanation

## 1. What the project does
The system simulates an IPL mega auction. Four franchises (CSK, RCB, MI, KKR) compete for 100 players.
Players are brought to the block one by one in random order. Franchises bid, the highest bidder wins,
the money is deducted and the player joins the squad. Every franchise must finish with 11 players that
satisfy the role mix (4 Batters, 3 Bowlers, 2 All-Rounders, 1 Wicketkeeper + 1 free slot).

## 2. Architecture (layers)
```
 AuctionGUI  --->  Auction  --->  Franchise / Player / Bid / AuctionHistory
 (screen)         (rules)         (data objects)
                      ^
               PlayerDatabase  (reads players.csv)
```
* The **GUI never contains rules** – it only shows data and calls `Auction` methods.
* `Auction` has no Swing code, so it can be tested without a window (`AuctionTests`, `ConsoleDemo`).

## 3. Class explanations

| Class | Purpose | Key OOP ideas |
|---|---|---|
| `PlayerRole` | Enum with BATTER, BOWLER, ALL_ROUNDER, WICKETKEEPER, a display name and a short name. `fromString()` converts CSV text to a role. | enum with fields and a static method |
| `Player` | One cricketer: id, name, age, country, role, base price, current bid, sold status, final price, buying franchise. | encapsulation (private fields), constructor validation, getters/setters |
| `Franchise` | A team. Holds the purse (`double`), squad (`ArrayList<Player>`) and role counts (`EnumMap`). `getBidBlockReason()` is the single place where all bidding rules are checked. | encapsulation, `ArrayList`, `Map`, static constants, exceptions |
| `Bid` | One bid (franchise, player, amount, time). Immutable. | immutable object |
| `AuctionRecord` | One history line: round, player, base price, final bid, winner, SOLD/UNSOLD. | immutable value class |
| `AuctionHistory` | List of `AuctionRecord`s with CSV export. | `ArrayList`, file handling (`BufferedWriter`) |
| `PlayerDatabase` | Reads `players.csv`, validates every line and the totals (100 / 35 / 30 / 20 / 15), can save players back. | file handling, exception handling, `HashMap`/`LinkedHashMap` |
| `Auction` | The engine: queue of players, four franchises (`LinkedHashMap`), current player, current bid, highest bidder; methods `startNextPlayer`, `placeBid`, `sellPlayer`, `skipPlayer`, `isComplete`, simulation and report generation. | composition, collections, custom exceptions |
| `AuctionGUI` | The Swing window: header with progress, player card, bid card, four franchise panels, live feed, bid buttons, control buttons, tables/dialogs. | inheritance (`extends JFrame`), inner classes, lambda event handlers |
| `Main` | Locates `players.csv`, loads players, creates `Auction`, opens `AuctionGUI`. | program entry point |
| `AuctionException`, `InvalidBidException`, `InvalidPlayerDataException` | Custom exceptions with clear messages. | exception hierarchy (`InvalidBidException extends AuctionException`) |

### Where each required Java concept is used
* **Encapsulation / getters / setters** – `Player`, `Franchise`, `Auction` (all fields private).
* **Constructors** – every class; `Player` validates its data in the constructor.
* **ArrayList** – squads, queue of results, history. **HashMap/LinkedHashMap/EnumMap** – franchises by code, players by id, role counts.
* **Enums** – `PlayerRole`.
* **Exception handling** – custom checked exceptions; `try/catch` in the GUI shows a message dialog.
* **File handling** – reading `players.csv`, writing `auction_history.csv`, `players_after_auction.csv`, `final_report.txt`.
* **Validation** – see section 5.

## 4. Algorithms

### 4.1 Auction of one player
```
startNextPlayer():
    if auction complete            -> error
    if a player is already on block-> error
    if queue is empty              -> round 2: put all unsold players back in the queue
    current = queue.removeFirst()
    currentBid = current.basePrice ; highestBidder = none

placeBid(franchise):
    check a player is on the block and the franchise code is valid
    if franchise is already the highest bidder -> error
    amount = (no bidder yet) ? basePrice : currentBid + 0.50
    franchise.validateBid(player, amount)            // all rules, see 4.2
    currentBid = amount ; highestBidder = franchise ; store the Bid

sellPlayer():
    if no bidder -> error ("use Skip")
    winner.addPlayer(player, currentBid)             // deducts purse, adds to squad
    player.markSold(winner, currentBid) ; add to history ; clear current player

skipPlayer():
    player goes to the unsold list ; add UNSOLD record ; clear current player
```

### 4.2 Can a franchise bid? (`Franchise.getBidBlockReason`)
```
1. player is sold already            -> blocked
2. squad already has 11 players      -> blocked
3. player already in the squad       -> blocked (duplicate)
4. amount > purse                    -> blocked (insufficient purse)
5. slotsAfter = 11 - squadSize - 1
   if purse - amount < slotsAfter * 0.50   -> blocked (must keep money for empty slots)
6. deficit = sum over roles of max(0, minimum(role) - countAfterBuying(role))
   if deficit > slotsAfter           -> blocked (could never meet 4/3/2/1)
otherwise allowed
```
Rule 5 guarantees that a team can always afford the cheapest (₹0.50 Cr) players for its empty slots.
Rule 6 guarantees that, when the squad reaches 11, the role minimums are met.

### 4.3 End of the auction
The auction is complete when nobody is on the block and either all four squads are full, or the queue is empty
and no second round is possible. Players that were never reached are "not auctioned".

### 4.4 Automatic bidding (demo)
Each franchise gets a random maximum price for the current player (sometimes zero = not interested; higher if the
franchise still needs that role). Franchises then take turns bidding while their maximum is not reached and the rules allow it.

## 5. Validation implemented
| Situation | How it is handled |
|---|---|
| Invalid bid (wrong amount, no player on block, bidding twice in a row) | `InvalidBidException` / `AuctionException` |
| Insufficient purse | rule 4 / 5 above |
| Full squad | rule 2 |
| Duplicate player | rule 3 (squad) and `PlayerDatabase` (duplicate id / name in the CSV) |
| Invalid input | empty or unknown franchise code, invalid role text, invalid numbers |
| Already sold player | rule 1 and `sellPlayer()` |
| Completed auction | every action throws "The auction is already complete" |
| Invalid CSV data | wrong header, wrong column count, bad role/age/price, wrong totals → `InvalidPlayerDataException` with the line number |

## 6. Design decisions
* Money is stored in Crore as `double`; all prices are multiples of 0.50, which doubles represent exactly, so there are no rounding errors.
* A **second round** is included so that squads can always be completed even if many players go unsold in round 1.
* The cheapest base price is ₹0.50 Cr, which is why each empty slot reserves ₹0.50 Cr.
