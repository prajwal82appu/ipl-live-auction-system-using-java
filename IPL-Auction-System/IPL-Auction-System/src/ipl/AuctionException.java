package ipl;

/** General problem with the auction flow (wrong order of actions, auction finished, ...). */
public class AuctionException extends Exception {
    public AuctionException(String message) {
        super(message);
    }
}
