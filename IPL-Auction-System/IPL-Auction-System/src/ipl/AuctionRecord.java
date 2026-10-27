package ipl;

/** One line of the auction history: what happened to one player in one round. Immutable. */
public class AuctionRecord {
    private final int round;
    private final String playerId;
    private final String playerName;
    private final PlayerRole role;
    private final double basePrice;
    private final double finalBid;      // 0 when unsold
    private final String winner;        // franchise code or "-"
    private final boolean sold;

    public AuctionRecord(int round, Player player, double finalBid, String winner, boolean sold) {
        this.round = round;
        this.playerId = player.getId();
        this.playerName = player.getName();
        this.role = player.getRole();
        this.basePrice = player.getBasePrice();
        this.finalBid = finalBid;
        this.winner = winner;
        this.sold = sold;
    }

    public int getRound() { return round; }
    public String getPlayerId() { return playerId; }
    public String getPlayerName() { return playerName; }
    public PlayerRole getRole() { return role; }
    public double getBasePrice() { return basePrice; }
    public double getFinalBid() { return finalBid; }
    public String getWinner() { return winner; }
    public boolean isSold() { return sold; }
    public String getStatus() { return sold ? "SOLD" : "UNSOLD"; }

    public String toCsvRow() {
        return String.format("%d,%s,%s,%s,%.2f,%.2f,%s,%s", round, playerId, playerName, role.name(),
                basePrice, finalBid, winner, getStatus());
    }
}
