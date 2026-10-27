package ipl;

/**
 * The four playing roles a cricketer can have in the auction.
 * An enum is used so that only these four values are possible (type safety).
 */
public enum PlayerRole {
    BATTER("Batter", "BAT"),
    BOWLER("Bowler", "BOWL"),
    ALL_ROUNDER("All-Rounder", "AR"),
    WICKETKEEPER("Wicketkeeper", "WK");

    private final String displayName;
    private final String shortName;

    PlayerRole(String displayName, String shortName) {
        this.displayName = displayName;
        this.shortName = shortName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getShortName() {
        return shortName;
    }

    /**
     * Converts text such as "BATTER", "All-Rounder" or "wicketkeeper" to a role.
     *
     * @throws IllegalArgumentException if the text is empty or not a valid role
     */
    public static PlayerRole fromString(String text) {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Role is empty");
        }
        String normalised = text.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        for (PlayerRole role : values()) {
            if (role.name().equals(normalised)) {
                return role;
            }
        }
        throw new IllegalArgumentException("Unknown role: " + text);
    }

    @Override
    public String toString() {
        return displayName;
    }
}
