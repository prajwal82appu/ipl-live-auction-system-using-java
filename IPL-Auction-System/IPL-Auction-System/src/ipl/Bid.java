package ipl;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

/** One bid placed by a franchise for a player. Immutable. */
public class Bid {
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final String franchiseCode;
    private final String playerId;
    private final double amount;
    private final LocalTime time;

    public Bid(String franchiseCode, String playerId, double amount) {
        this.franchiseCode = franchiseCode;
        this.playerId = playerId;
        this.amount = amount;
        this.time = LocalTime.now();
    }

    public String getFranchiseCode() { return franchiseCode; }
    public String getPlayerId() { return playerId; }
    public double getAmount() { return amount; }
    public LocalTime getTime() { return time; }

    @Override
    public String toString() {
        return String.format("[%s] %s bids Rs.%.2f Cr", TIME_FORMAT.format(time), franchiseCode, amount);
    }
}
