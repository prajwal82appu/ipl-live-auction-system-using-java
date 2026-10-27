package ipl;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * The auction engine. It has NO user-interface code, so it can be tested without the GUI.
 *
 * Flow for each player:  startNextPlayer() -> placeBid(...) (many times) -> sellPlayer() or skipPlayer()
 */
public class Auction {
    /** Fixed bid increment in Crore. */
    public static final double BID_INCREMENT = 0.5;
    public static final int FRANCHISE_COUNT = 4;

    private final List<Player> allPlayers;
    private final Map<String, Franchise> franchises = new LinkedHashMap<>();
    private final LinkedList<Player> queue = new LinkedList<>();
    private final List<Player> soldPlayers = new ArrayList<>();
    private final List<Player> unsoldPlayers = new ArrayList<>();
    private final List<Bid> currentBids = new ArrayList<>();
    private final AuctionHistory history = new AuctionHistory();

    private Player currentPlayer;
    private double currentBid;
    private Franchise highestBidder;
    private int round = 1;

    /** @param rng used to shuffle the order in which players come to the block */
    public Auction(List<Player> players, Random rng) throws AuctionException {
        if (players == null || players.size() != PlayerDatabase.TOTAL_PLAYERS) {
            throw new AuctionException("The auction needs exactly " + PlayerDatabase.TOTAL_PLAYERS + " players");
        }
        this.allPlayers = new ArrayList<>(players);
        franchises.put("CSK", new Franchise("CSK", "Chennai Super Kings"));
        franchises.put("RCB", new Franchise("RCB", "Royal Challengers Bengaluru"));
        franchises.put("MI", new Franchise("MI", "Mumbai Indians"));
        franchises.put("KKR", new Franchise("KKR", "Kolkata Knight Riders"));

        List<Player> order = new ArrayList<>(players);
        Collections.shuffle(order, rng);
        queue.addAll(order);
    }

    // ================= queries =================
    public Collection<Franchise> getFranchises() { return Collections.unmodifiableCollection(franchises.values()); }
    public Player getCurrentPlayer() { return currentPlayer; }
    public double getCurrentBid() { return currentBid; }
    public Franchise getHighestBidder() { return highestBidder; }
    public int getRound() { return round; }
    public AuctionHistory getHistory() { return history; }
    public List<Player> getAllPlayers() { return Collections.unmodifiableList(allPlayers); }
    public List<Player> getSoldPlayers() { return Collections.unmodifiableList(soldPlayers); }
    public List<Player> getUnsoldPlayers() { return Collections.unmodifiableList(unsoldPlayers); }
    public List<Bid> getCurrentBids() { return Collections.unmodifiableList(currentBids); }

    public int getTotalPlayers() { return allPlayers.size(); }
    public int getSoldCount() { return soldPlayers.size(); }
    public int getUnsoldCount() { return unsoldPlayers.size(); }
    /** Players still waiting in the queue (the player currently on the block is not counted). */
    public int getRemainingCount() { return queue.size(); }

    public Franchise getFranchise(String code) throws InvalidBidException {
        if (code == null || code.trim().isEmpty()) {
            throw new InvalidBidException("Invalid input: franchise code is empty");
        }
        Franchise f = franchises.get(code.trim().toUpperCase());
        if (f == null) {
            throw new InvalidBidException("Invalid input: unknown franchise '" + code + "'");
        }
        return f;
    }

    public boolean allFranchisesFull() {
        for (Franchise f : franchises.values()) {
            if (!f.isSquadFull()) {
                return false;
            }
        }
        return true;
    }

    /** The auction is complete when nobody is on the block and nothing more can be sold. */
    public boolean isComplete() {
        if (currentPlayer != null) {
            return false;
        }
        if (allFranchisesFull()) {
            return true;
        }
        return queue.isEmpty() && (round >= 2 || unsoldPlayers.isEmpty());
    }

    /** The next price a franchise must pay: the base price for the first bid, then +BID_INCREMENT. */
    public double getNextBidAmount() {
        if (currentPlayer == null) {
            return 0;
        }
        return highestBidder == null ? currentPlayer.getBasePrice() : currentBid + BID_INCREMENT;
    }

    // ================= actions =================

    /** Brings the next player onto the block. */
    public Player startNextPlayer() throws AuctionException {
        ensureNotComplete();
        if (currentPlayer != null) {
            throw new AuctionException("Finish the current player first (Sell or Skip " + currentPlayer.getName() + ")");
        }
        if (queue.isEmpty()) {
            // Round 2: unsold players get one more chance because some squads are still incomplete.
            queue.addAll(unsoldPlayers);
            unsoldPlayers.clear();
            round = 2;
        }
        currentPlayer = queue.removeFirst();
        currentBid = currentPlayer.getBasePrice();
        currentPlayer.setCurrentBid(currentBid);
        highestBidder = null;
        currentBids.clear();
        return currentPlayer;
    }

    /** A franchise bids. The first bid is at the base price, every later bid is current + increment. */
    public Bid placeBid(String franchiseCode) throws AuctionException {
        ensureNotComplete();
        requireActivePlayer();
        Franchise franchise = getFranchise(franchiseCode);
        if (franchise == highestBidder) {
            throw new InvalidBidException(franchise.getCode() + " is already the highest bidder");
        }
        double amount = getNextBidAmount();
        franchise.validateBid(currentPlayer, amount);

        currentBid = amount;
        highestBidder = franchise;
        currentPlayer.setCurrentBid(amount);
        Bid bid = new Bid(franchise.getCode(), currentPlayer.getId(), amount);
        currentBids.add(bid);
        return bid;
    }

    /** Hammer down: the highest bidder wins the player. */
    public AuctionRecord sellPlayer() throws AuctionException {
        ensureNotComplete();
        requireActivePlayer();
        if (highestBidder == null) {
            throw new InvalidBidException("No franchise has bid for " + currentPlayer.getName()
                    + ". Use Skip Player to mark the player unsold");
        }
        if (currentPlayer.isSold()) {
            throw new InvalidBidException(currentPlayer.getName() + " is already sold");
        }
        Franchise winner = highestBidder;
        winner.addPlayer(currentPlayer, currentBid);            // checks rules + deducts purse
        currentPlayer.markSold(winner.getCode(), currentBid);
        soldPlayers.add(currentPlayer);
        AuctionRecord record = new AuctionRecord(round, currentPlayer, currentBid, winner.getCode(), true);
        history.add(record);
        clearCurrent();
        return record;
    }

    /** Marks the current player as unsold (no bids, or the auctioneer skips him). */
    public AuctionRecord skipPlayer() throws AuctionException {
        ensureNotComplete();
        requireActivePlayer();
        currentPlayer.resetBid();
        unsoldPlayers.add(currentPlayer);
        AuctionRecord record = new AuctionRecord(round, currentPlayer, 0, "-", false);
        history.add(record);
        clearCurrent();
        return record;
    }

    // ================= automatic (demo) bidding =================

    /** Lets the four franchises bid automatically for the current player, then sells or skips him. */
    public AuctionRecord simulateCurrentPlayer(Random rng) throws AuctionException {
        ensureNotComplete();
        requireActivePlayer();
        Player p = currentPlayer;
        Map<String, Double> willingToPay = new HashMap<>();
        for (Franchise f : franchises.values()) {
            boolean interested = round >= 2 || rng.nextDouble() > 0.45;
            double max = interested ? p.getBasePrice() * (0.6 + rng.nextDouble() * 4.4) : 0;
            if (f.needsRole(p.getRole())) {
                max *= 1.4;
            }
            willingToPay.put(f.getCode(), max);
        }
        while (true) {
            double next = getNextBidAmount();
            List<Franchise> eligible = new ArrayList<>();
            for (Franchise f : franchises.values()) {
                if (f != highestBidder && willingToPay.get(f.getCode()) >= next && f.canBid(p, next)) {
                    eligible.add(f);
                }
            }
            if (eligible.isEmpty()) {
                break;
            }
            placeBid(eligible.get(rng.nextInt(eligible.size())).getCode());
        }
        return highestBidder == null ? skipPlayer() : sellPlayer();
    }

    /** Runs the whole auction automatically. */
    public void simulateAll(Random rng) throws AuctionException {
        while (!isComplete()) {
            if (currentPlayer == null) {
                startNextPlayer();
            }
            simulateCurrentPlayer(rng);
        }
    }

    // ================= reports / files =================

    /** Builds the complete final report: squads, unsold list and auction history. */
    public String generateTextReport() {
        StringBuilder sb = new StringBuilder();
        String line = "=".repeat(86);
        sb.append(line).append('\n').append("IPL PLAYER AUCTION - FINAL REPORT").append('\n').append(line).append('\n');
        sb.append(String.format("Sold: %d | Unsold: %d | Not auctioned: %d | Rounds played: %d%n%n",
                getSoldCount(), getUnsoldCount(), getRemainingCount(), round));
        for (Franchise f : franchises.values()) {
            sb.append(String.format("%s - squad %d/%d%n", f, f.getSquadSize(), Franchise.SQUAD_SIZE));
            sb.append(String.format("  %-4s %-24s %-14s %-14s %10s%n", "ID", "Player", "Role", "Country", "Price(Cr)"));
            for (Player p : f.getSquad()) {
                sb.append(String.format("  %-4s %-24s %-14s %-14s %10.2f%n", p.getId().substring(1), p.getName(),
                        p.getRole(), p.getCountry(), p.getFinalPrice()));
            }
            sb.append(String.format("  Total spent: Rs.%.2f Cr | Remaining purse: Rs.%.2f Cr%n", f.getTotalSpent(), f.getPurse()));
            sb.append("  Composition: ").append(f.getCompositionText())
                    .append(f.meetsRoleRequirements() ? "  (requirements met)" : "  (requirements NOT met)").append("\n\n");
        }
        sb.append("UNSOLD PLAYERS (").append(unsoldPlayers.size()).append(")\n");
        for (Player p : unsoldPlayers) {
            sb.append(String.format("  %s %-24s %-14s base Rs.%.2f Cr%n", p.getId(), p.getName(), p.getRole(), p.getBasePrice()));
        }
        sb.append("\nAUCTION HISTORY\n");
        sb.append(String.format("  %-3s %-5s %-24s %-14s %8s %9s %-6s %-7s%n", "Rd", "ID", "Player", "Role", "Base", "Final", "Team", "Status"));
        for (AuctionRecord r : history.getAll()) {
            sb.append(String.format("  %-3d %-5s %-24s %-14s %8.2f %9.2f %-6s %-7s%n", r.getRound(), r.getPlayerId(),
                    r.getPlayerName(), r.getRole(), r.getBasePrice(), r.getFinalBid(), r.getWinner(), r.getStatus()));
        }
        return sb.toString();
    }

    /** Saves history CSV, updated players CSV and text report into the given folder. */
    public void exportResults(Path folder) throws IOException {
        history.exportToCsv(folder.resolve("auction_history.csv"));
        PlayerDatabase.saveToCsv(allPlayers, folder.resolve("players_after_auction.csv"));
        java.nio.file.Files.createDirectories(folder);
        java.nio.file.Files.writeString(folder.resolve("final_report.txt"), generateTextReport());
    }

    // ================= helpers =================
    private void ensureNotComplete() throws AuctionException {
        if (isComplete()) {
            throw new AuctionException("The auction is already complete");
        }
    }

    private void requireActivePlayer() throws AuctionException {
        if (currentPlayer == null) {
            throw new AuctionException("No player is on the block. Click 'Next Player' first");
        }
    }

    private void clearCurrent() {
        currentPlayer = null;
        highestBidder = null;
        currentBid = 0;
        currentBids.clear();
    }
}
