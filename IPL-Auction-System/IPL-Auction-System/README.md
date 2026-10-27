# IPL Player Auction Management System

A Java Swing desktop application that simulates an IPL player auction — a college CSE mini-project.

* 4 franchises: **CSK, RCB, MI, KKR** — each starts with **₹100 Crore**
* **100 players** read from `data/players.csv` (35 Batters, 30 Bowlers, 20 All-Rounders, 15 Wicketkeepers)
* Each franchise must finish with **exactly 11 players** (minimum 4 Batters, 3 Bowlers, 2 All-Rounders, 1 Wicketkeeper)
* One player at a time on the block, fixed bid increment of **₹0.50 Cr**, highest bidder wins
* Professional dark IPL-style GUI, auction history, unsold list and final results

> The player names, ages and base prices are **illustrative sample data for an educational simulation**; they are not real auction values.

---

## 1. Project structure

```
IPL-Auction-System/
├── src/ipl/
│   ├── Main.java                     entry point (loads CSV, opens GUI)
│   ├── AuctionGUI.java               Swing user interface
│   ├── Auction.java                  auction engine (all rules, no GUI code)
│   ├── Franchise.java                team: purse, squad, bidding rules
│   ├── Player.java                   one cricketer
│   ├── PlayerRole.java               enum BATTER / BOWLER / ALL_ROUNDER / WICKETKEEPER
│   ├── Bid.java                      one bid
│   ├── AuctionRecord.java            one line of history
│   ├── AuctionHistory.java           list of records + CSV export
│   ├── PlayerDatabase.java           reads / validates / saves players.csv
│   ├── AuctionException.java         custom exceptions
│   ├── InvalidBidException.java
│   ├── InvalidPlayerDataException.java
│   ├── AuctionTests.java             30 self-checking test cases (no JUnit needed)
│   └── ConsoleDemo.java              complete auction in the console (no GUI)
├── data/players.csv                  100 players
├── docs/                             explanation, test cases, sample output, viva Q&A
├── screenshots/                      screenshots of the application
├── run.sh / run.bat                  one-click compile + run
└── README.md
```

## 2. Requirements

* **JDK 11 or newer** (developed and tested on JDK 21). A normal desktop JDK is needed for the GUI.
* No external libraries.

## 3. How to compile and run

### Option A — command line (works everywhere)

Open a terminal **in the project root folder** (the folder that contains `src` and `data`).

**Windows (CMD / PowerShell)**
```
mkdir out
javac -d out src\ipl\*.java
java -cp out ipl.Main
```

**Linux / macOS**
```
mkdir -p out
javac -d out src/ipl/*.java
java -cp out ipl.Main
```

Or just double-click / run `run.bat` (Windows) or `./run.sh` (Linux/macOS).

### Option B — IntelliJ IDEA
1. `File → Open` and choose the `IPL-Auction-System` folder.
2. Right-click the `src` folder → **Mark Directory as → Sources Root**.
3. Open `Main.java` → click the green ▶ next to `main`.
4. If it says *"players.csv was not found"*: `Run → Edit Configurations →` set **Working directory** to the project root. (The program also lets you pick the CSV with a file dialog.)

### Option C — Eclipse
1. `File → New → Java Project`, untick *Use default location*, choose the project folder, **Finish**.
2. If `src` is not the source folder: right-click project → `Build Path → Configure Build Path → Source → Add Folder → src`.
3. Right-click `Main.java → Run As → Java Application`.
4. Make sure the working directory is the project root (`Run Configurations → Arguments → Working directory`).

### Option D — VS Code
1. Install the *Extension Pack for Java*.
2. `File → Open Folder` → the project folder.
3. Open `Main.java` and click **Run** above `main`. (VS Code uses the project root as working directory.)

### Option E — NetBeans
1. `File → New Project → Java with Ant → Java Project with Existing Sources`.
2. Choose the project folder, add `src` as *Source Package Folder*.
3. Right-click the project → `Properties → Run → Working Directory` = project root, main class `ipl.Main`.
4. Run the project.

### Run the tests / console demo
```
java -cp out ipl.AuctionTests        # 30 test cases
java -cp out ipl.ConsoleDemo 42      # complete automatic auction in the console
```

## 4. How to use the application

1. Click **Next Player** — a player comes onto the block at his base price.
2. Click **BID CSK / RCB / MI / KKR** — the first bid is at the base price, each later bid adds ₹0.50 Cr.
   A button is disabled (hover to see why) when that franchise cannot bid.
3. Click **Sell Player** when nobody wants to bid higher — the highest bidder wins, the price is deducted from its purse.
   Click **Skip Player** to mark the player **unsold**.
4. Repeat until all four squads have 11 players. The application then shows the **Final Results** automatically.

Extra helpers for demonstrations:
* **Auto-Bid Player** — franchises bid automatically for the current player.
* **Auto Auction** — runs the complete auction automatically (click again to stop).
* **View Squad**, **Auction History**, **Unsold Players**, **Final Results** — available any time.
* When the auction ends, results are saved in the `output/` folder
  (`auction_history.csv`, `players_after_auction.csv`, `final_report.txt`).

## 5. Auction rules implemented

| Rule | Where |
|---|---|
| Purse ₹100 Cr per franchise, squad of exactly 11 | `Franchise` |
| A franchise cannot bid if its purse is too low, its squad is full, or it would not keep ₹0.50 Cr for every remaining empty slot | `Franchise.getBidBlockReason()` |
| A franchise cannot bid if it would become impossible to reach 4 Batters, 3 Bowlers, 2 All-Rounders, 1 Wicketkeeper | `Franchise.getBidBlockReason()` |
| The highest bidder cannot outbid himself | `Auction.placeBid()` |
| No bids → player is unsold | `Auction.skipPlayer()` |
| Round 2: if some squads are still incomplete when the queue ends, unsold players come back once | `Auction.startNextPlayer()` |
| Auction ends when all four squads are full (players still waiting are "not auctioned") | `Auction.isComplete()` |

Validation covers: invalid bids, insufficient purse, full squads, duplicate players, invalid input, already sold players, completed auctions and invalid CSV data.

## 6. More documentation

* [`docs/PROJECT_EXPLANATION.md`](docs/PROJECT_EXPLANATION.md) – project explanation, class explanations, algorithm
* [`docs/TEST_CASES.md`](docs/TEST_CASES.md) – test cases
* [`docs/SAMPLE_OUTPUT.md`](docs/SAMPLE_OUTPUT.md) – sample output (real run)
* [`docs/VIVA_QA.md`](docs/VIVA_QA.md) – Java viva questions and answers
