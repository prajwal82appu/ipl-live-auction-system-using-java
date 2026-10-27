package ipl;

/** Thrown when a bid or a purchase breaks an auction rule (no money, full squad, ...). */
public class InvalidBidException extends AuctionException {
    public InvalidBidException(String message) {
        super(message);
    }
}
