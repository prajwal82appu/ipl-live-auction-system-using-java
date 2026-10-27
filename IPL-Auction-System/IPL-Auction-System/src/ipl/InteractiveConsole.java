package ipl;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * Interactive Console / Terminal Auction System in Java.
 */
public class InteractiveConsole {
    private static final String[] CSV_LOCATIONS = {
        "data/players.csv", "../data/players.csv", "../../data/players.csv", "players.csv"
    };

    public static void main(String[] args) {
        Locale.setDefault(Locale.US);
        Scanner scanner = new Scanner(System.in);
        Path csv = locateCsv(args);
        if (csv == null) {
            System.err.println("Error: players.csv not found.");
            return;
        }

        try {
            List<Player> players = new PlayerDatabase().loadFromCsv(csv);
            Auction auction = new Auction(players, new Random(System.currentTimeMillis()));
            Random rng = new Random();

            while (true) {
                System.out.println("\n========================================================================");
                System.out.println("          🏏  IPL AUCTION SYSTEM - JAVA CONSOLE EDITION  🏏");
                System.out.println("========================================================================");
                System.out.printf("  Progress: Sold %d | Unsold %d | Remaining %d | Round %d%n%n",
                        auction.getSoldCount(), auction.getUnsoldCount(), auction.getRemainingCount(), auction.getRound());

                System.out.println("  [1] Step Next Player (Interactive Bid / Skip / Sell)");
                System.out.println("  [2] Simulate Next 5 Players");
                System.out.println("  [3] Auto-Simulate Remaining Auction");
                System.out.println("  [4] View Franchise Squads & Financials");
                System.out.println("  [5] View Unsold Players");
                System.out.println("  [6] View Auction History");
                System.out.println("  [7] Export Final Report (TXT / CSV)");
                System.out.println("  [0] Exit");
                System.out.print("\nEnter choice (0-7): ");

                String input = scanner.nextLine().trim();
                if (input.equals("0")) {
                    System.out.println("Exiting IPL Console. Goodbye!");
                    break;
                } else if (input.equals("1")) {
                    if (auction.isComplete()) {
                        System.out.println("Auction is complete! No more players to auction.");
                        continue;
                    }
                    Player p = auction.getCurrentPlayer() != null ? auction.getCurrentPlayer() : auction.startNextPlayer();
                    System.out.println("\n------------------------------------------------------------------------");
                    System.out.printf("ON THE BLOCK: %s (%s) from %s | Base: Rs.%.2f Cr%n",
                            p.getName(), p.getRole(), p.getCountry(), p.getBasePrice());
                    System.out.println("------------------------------------------------------------------------");
                    
                    while (true) {
                        System.out.printf("Current Bid: Rs.%.2f Cr (Held by: %s) | Next Bid: Rs.%.2f Cr%n",
                                auction.getCurrentBid(),
                                auction.getHighestBidder() != null ? auction.getHighestBidder().getCode() : "None",
                                auction.getNextBidAmount());
                        System.out.print("Action -> Enter Franchise Code to Bid (CSK, RCB, MI, KKR), [s]ell, [k]skip/unsold, [a]uto-sim: ");
                        String act = scanner.nextLine().trim().toUpperCase();
                        if (act.equals("S") || act.equals("SELL")) {
                            try {
                                AuctionRecord r = auction.sellPlayer();
                                System.out.printf("🎉 SOLD to %s for Rs.%.2f Cr!%n", r.getWinner(), r.getFinalBid());
                                break;
                            } catch (AuctionException e) {
                                System.out.println("Error: " + e.getMessage());
                            }
                        } else if (act.equals("K") || act.equals("SKIP")) {
                            try {
                                AuctionRecord r = auction.skipPlayer();
                                System.out.println("Player marked UNSOLD.");
                                break;
                            } catch (AuctionException e) {
                                System.out.println("Error: " + e.getMessage());
                            }
                        } else if (act.equals("A") || act.equals("AUTO")) {
                            try {
                                AuctionRecord r = auction.simulateCurrentPlayer(rng);
                                System.out.printf("-> Result: %s%n", r.isSold() ? "SOLD to " + r.getWinner() + " for Rs." + String.format("%.2f", r.getFinalBid()) + " Cr" : "UNSOLD");
                                break;
                            } catch (AuctionException e) {
                                System.out.println("Error: " + e.getMessage());
                                break;
                            }
                        } else if (act.equals("CSK") || act.equals("RCB") || act.equals("MI") || act.equals("KKR")) {
                            try {
                                Bid bid = auction.placeBid(act);
                                System.out.printf("✓ Bid accepted from %s at Rs.%.2f Cr!%n", bid.getFranchiseCode(), bid.getAmount());
                            } catch (AuctionException e) {
                                System.out.println("Bid Rejected: " + e.getMessage());
                            }
                        } else {
                            System.out.println("Invalid input. Please enter CSK, RCB, MI, KKR, s (sell), k (skip), or a (auto).");
                        }
                    }
                } else if (input.equals("2")) {
                    if (auction.isComplete()) {
                        System.out.println("Auction is already complete.");
                        continue;
                    }
                    for (int i = 0; i < 5 && !auction.isComplete(); i++) {
                        if (auction.getCurrentPlayer() == null) {
                            auction.startNextPlayer();
                        }
                        Player p = auction.getCurrentPlayer();
                        AuctionRecord r = auction.simulateCurrentPlayer(rng);
                        System.out.printf("  %-22s %-13s base %.2f -> %s%n", p.getName(), p.getRole(), p.getBasePrice(),
                                r.isSold() ? "SOLD to " + r.getWinner() + " (Rs." + String.format("%.2f", r.getFinalBid()) + " Cr)" : "UNSOLD");
                    }
                } else if (input.equals("3")) {
                    if (auction.isComplete()) {
                        System.out.println("Auction is already complete.");
                        continue;
                    }
                    System.out.println("Simulating all remaining lots...");
                    while (!auction.isComplete()) {
                        if (auction.getCurrentPlayer() == null) {
                            auction.startNextPlayer();
                        }
                        Player p = auction.getCurrentPlayer();
                        AuctionRecord r = auction.simulateCurrentPlayer(rng);
                        System.out.printf("  %-22s %-13s -> %s%n", p.getName(), p.getRole(),
                                r.isSold() ? "SOLD to " + r.getWinner() + " (Rs." + String.format("%.2f", r.getFinalBid()) + " Cr)" : "UNSOLD");
                    }
                    System.out.println("Simulation complete!");
                } else if (input.equals("4")) {
                    System.out.println("\n--- FRANCHISE SQUADS & PURSE ---");
                    for (Franchise f : auction.getFranchises()) {
                        System.out.printf("%s - Squad %d/%d | Spent: Rs.%.2f Cr | Purse: Rs.%.2f Cr%n",
                                f.getFullName(), f.getSquadSize(), Franchise.SQUAD_SIZE, f.getTotalSpent(), f.getPurse());
                        for (Player p : f.getSquad()) {
                            System.out.printf("   • %-22s %-14s Rs.%.2f Cr%n", p.getName(), p.getRole(), p.getFinalPrice());
                        }
                        System.out.println();
                    }
                } else if (input.equals("5")) {
                    System.out.println("\n--- UNSOLD PLAYERS (" + auction.getUnsoldPlayers().size() + ") ---");
                    for (Player p : auction.getUnsoldPlayers()) {
                        System.out.printf("  %-24s %-14s Base: Rs.%.2f Cr%n", p.getName(), p.getRole(), p.getBasePrice());
                    }
                } else if (input.equals("6")) {
                    System.out.println("\n--- AUCTION HISTORY ---");
                    for (AuctionRecord r : auction.getHistory().getAll()) {
                        System.out.printf("  Rd %d | %-22s %-12s | %s%n",
                                r.getRound(), r.getPlayerName(), r.getRole(),
                                r.isSold() ? "SOLD to " + r.getWinner() + " (Rs." + String.format("%.2f", r.getFinalBid()) + " Cr)" : "UNSOLD");
                    }
                } else if (input.equals("7")) {
                    Path outPath = Paths.get("reports");
                    auction.exportResults(outPath);
                    System.out.println("Exported reports to: " + outPath.toAbsolutePath());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static Path locateCsv(String[] args) {
        if (args.length > 0) return Paths.get(args[0]);
        for (String location : CSV_LOCATIONS) {
            Path p = Paths.get(location);
            if (Files.exists(p)) return p;
        }
        return null;
    }
}
