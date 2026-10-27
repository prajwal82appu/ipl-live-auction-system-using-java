package ipl;

/** Thrown when players.csv (or a Player object) contains invalid data. */
public class InvalidPlayerDataException extends Exception {
    public InvalidPlayerDataException(String message) {
        super(message);
    }
}
