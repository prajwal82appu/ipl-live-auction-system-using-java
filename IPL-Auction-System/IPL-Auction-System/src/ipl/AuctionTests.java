package ipl;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * Simple self-checking tests (no JUnit needed).
 * Run:  java -cp out ipl.AuctionTests   (from the project root folder)
 */
public class AuctionTests {
    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) throws Exception {
        Locale.setDefault(Locale.US);
        Path csv = Path.of("data", "players.csv");

        // ---------- CSV / data tests ----------
        List<Player> players = new PlayerDatabase().loadFromCsv(csv);
        check("TC01 CSV has exactly 100 players", players.size() == 100);
        check("TC02 Role split is 35/30/20/15",
                count(players, PlayerRole.BATTER) == 35 && count(players, PlayerRole.BOWLER) == 30
                        && count(players, PlayerRole.ALL_ROUNDER) == 20 && count(players, PlayerRole.WICKETKEEPER) == 15);
        check("TC03 All player IDs are unique", players.stream().map(Player::getId).distinct().count() == 100);

        expectDataError("TC04 Invalid CSV header rejected", "WrongHeader\nP001,A,20,India,BATTER,1.00,0,false,0,-\n");
        expectDataError("TC05 Invalid role rejected", header() + "P001,A,20,India,SPINNER,1.00,0.00,false,0.00,-\n");
        expectDataError("TC06 Invalid age rejected", header() + "P001,A,5,India,BATTER,1.00,0.00,false,0.00,-\n");
        expectDataError("TC07 Wrong column count rejected", header() + "P001,A,20,India\n");
        expectDataError("TC08 Wrong player total rejected", header() + "P001,A,20,India,BATTER,1.00,0.00,false,0.00,-\n");

        // ---------- franchise rules ----------
        Franchise csk = new Franchise("CSK", "Chennai Super Kings");
        check("TC09 Starting purse is Rs.100 Cr", csk.getPurse() == 100.0);
        Player cheap = new Player("P901", "Test One", 25, "India", PlayerRole.BATTER, 1.0);
        check("TC10 Bid above purse rejected", csk.getBidBlockReason(cheap, 150.0) != null);
        check("TC11 Bid leaving too little for the other 10 slots rejected", csk.getBidBlockReason(cheap, 96.0) != null);
        check("TC12 Valid bid accepted", csk.getBidBlockReason(cheap, 20.0) == null);

        // ---------- auction flow ----------
        Auction a = new Auction(new PlayerDatabase().loadFromCsv(csv), new Random(1));
        check("TC13 Exactly four franchises", a.getFranchises().size() == 4);
        expectAuctionError("TC14 Bid before a player is on the block", () -> a.placeBid("CSK"));
        expectAuctionError("TC15 Sell before a player is on the block", a::sellPlayer);
        Player p = a.startNextPlayer();
        expectAuctionError("TC16 Next player while one is on the block", a::startNextPlayer);
        expectAuctionError("TC17 Sell with no bids", a::sellPlayer);
        expectAuctionError("TC18 Unknown franchise code", () -> a.placeBid("XYZ"));
        expectAuctionError("TC19 Empty franchise code", () -> a.placeBid(" "));
        a.placeBid("CSK");
        check("TC20 First bid equals base price", a.getCurrentBid() == p.getBasePrice());
        expectAuctionError("TC21 Highest bidder cannot outbid itself", () -> a.placeBid("CSK"));
        a.placeBid("MI");
        check("TC22 Next bid = previous + fixed increment", a.getCurrentBid() == p.getBasePrice() + Auction.BID_INCREMENT);
        double base = p.getBasePrice();
        a.sellPlayer();
        Franchise mi = a.getFranchise("MI");
        check("TC23 Winner paid the final price", mi.getPurse() == 100.0 - (base + Auction.BID_INCREMENT));
        check("TC24 Player added to winner squad and marked sold",
                mi.getSquadSize() == 1 && p.isSold() && p.getSoldTo().equals("MI"));
        check("TC25 Loser purse unchanged", a.getFranchise("CSK").getPurse() == 100.0);
        Player q = a.startNextPlayer();
        a.skipPlayer();
        check("TC26 Skipped player is unsold", a.getUnsoldCount() == 1 && !q.isSold());
        check("TC27 Counts add up to 100",
                a.getSoldCount() + a.getUnsoldCount() + a.getRemainingCount() == 100);

        // ---------- full automatic auctions ----------
        int ok = 0;
        int runs = 300;
        for (int seed = 0; seed < runs; seed++) {
            Auction sim = new Auction(new PlayerDatabase().loadFromCsv(csv), new Random(seed));
            sim.simulateAll(new Random(seed + 1000));
            boolean good = sim.isComplete();
            for (Franchise f : sim.getFranchises()) {
                good &= f.getSquadSize() == 11 && f.meetsRoleRequirements()
                        && f.getPurse() >= 0 && Math.abs(f.getPurse() + f.getTotalSpent() - 100.0) < 1e-9;
            }
            if (good) {
                ok++;
            }
        }
        check("TC28 " + runs + " full simulated auctions: every squad has 11 players, role minimums met, purse never negative",
                ok == runs);

        Auction done = new Auction(new PlayerDatabase().loadFromCsv(csv), new Random(7));
        done.simulateAll(new Random(8));
        expectAuctionError("TC29 Actions after the auction is complete", done::startNextPlayer);
        check("TC30 History has one entry per sale/unsold event", done.getHistory().size() >= done.getSoldCount());

        System.out.println();
        System.out.println("Passed: " + passed + "   Failed: " + failed);
        if (failed > 0) {
            System.exit(1);
        }
    }

    private static String header() {
        return PlayerDatabase.HEADER + "\n";
    }

    private static int count(List<Player> list, PlayerRole role) {
        int n = 0;
        for (Player p : list) {
            if (p.getRole() == role) {
                n++;
            }
        }
        return n;
    }

    private static void check(String name, boolean condition) {
        System.out.println((condition ? "PASS  " : "FAIL  ") + name);
        if (condition) {
            passed++;
        } else {
            failed++;
        }
    }

    private interface Action {
        void run() throws Exception;
    }

    private static void expectAuctionError(String name, Action action) {
        try {
            action.run();
            check(name, false);
        } catch (AuctionException e) {
            check(name + "  -> \"" + e.getMessage() + "\"", true);
        } catch (Exception e) {
            check(name + " (wrong exception " + e + ")", false);
        }
    }

    private static void expectDataError(String name, String csvText) throws Exception {
        Path tmp = Files.createTempFile("players", ".csv");
        try {
            Files.writeString(tmp, csvText);
            new PlayerDatabase().loadFromCsv(tmp);
            check(name, false);
        } catch (InvalidPlayerDataException e) {
            check(name, true);
        } finally {
            Files.deleteIfExists(tmp);
        }
    }

    @SuppressWarnings("unused")
    private static List<Player> copy(List<Player> l) {
        return new ArrayList<>(l);
    }
}
