package ipl;

import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * Runs a complete automatic auction in the console (no GUI).
 * Useful for quick testing and for producing sample output.
 * Run:  java -cp out ipl.ConsoleDemo [seed]
 */
public class ConsoleDemo {
    public static void main(String[] args) throws Exception {
        Locale.setDefault(Locale.US);
        long seed = args.length > 0 ? Long.parseLong(args[0]) : 42L;
        List<Player> players = new PlayerDatabase().loadFromCsv(java.nio.file.Paths.get("data", "players.csv"));
        Auction auction = new Auction(players, new Random(seed));
        Random rng = new Random(seed + 1);

        System.out.println("IPL PLAYER AUCTION - console simulation (seed " + seed + ")");
        System.out.println("Each franchise starts with Rs.100.00 Cr; bid increment Rs." + Auction.BID_INCREMENT + " Cr\n");

        int lot = 0;
        while (!auction.isComplete()) {
            int roundBefore = auction.getRound();
            Player p = auction.startNextPlayer();
            if (auction.getRound() != roundBefore) {
                System.out.println("\n--- ROUND " + auction.getRound() + ": unsold players return ---\n");
            }
            lot++;
            AuctionRecord r = auction.simulateCurrentPlayer(rng);
            System.out.printf("Lot %3d  %-22s %-13s base %.2f  ->  %s%n", lot, p.getName(), p.getRole(), p.getBasePrice(),
                    r.isSold() ? "SOLD to " + r.getWinner() + " for Rs." + String.format("%.2f", r.getFinalBid()) + " Cr" : "UNSOLD");
        }
        System.out.println();
        System.out.println(auction.generateTextReport());
    }
}
