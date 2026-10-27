package ipl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * An IPL team. Holds the purse, the squad and enforces every buying rule.
 * Money is in Crore rupees; all prices are multiples of 0.50 so doubles stay exact.
 */
public class Franchise {
    public static final double STARTING_PURSE = 100.0;
    public static final int SQUAD_SIZE = 11;
    /** Cheapest possible player: every empty squad slot must keep at least this much money. */
    public static final double MIN_BASE_PRICE = 0.5;

    private static final Map<PlayerRole, Integer> MIN_REQUIRED = new EnumMap<>(PlayerRole.class);
    static {
        MIN_REQUIRED.put(PlayerRole.BATTER, 4);
        MIN_REQUIRED.put(PlayerRole.BOWLER, 3);
        MIN_REQUIRED.put(PlayerRole.ALL_ROUNDER, 2);
        MIN_REQUIRED.put(PlayerRole.WICKETKEEPER, 1);
    }

    private final String code;
    private final String fullName;
    private double purse;
    private final List<Player> squad = new ArrayList<>();
    private final Map<PlayerRole, Integer> roleCount = new EnumMap<>(PlayerRole.class);

    public Franchise(String code, String fullName) {
        if (code == null || code.trim().isEmpty() || fullName == null || fullName.trim().isEmpty()) {
            throw new IllegalArgumentException("Franchise code and name are required");
        }
        this.code = code;
        this.fullName = fullName;
        this.purse = STARTING_PURSE;
        for (PlayerRole role : PlayerRole.values()) {
            roleCount.put(role, 0);
        }
    }

    // ---------- getters ----------
    public String getCode() { return code; }
    public String getFullName() { return fullName; }
    public double getPurse() { return purse; }
    public List<Player> getSquad() { return Collections.unmodifiableList(squad); }
    public int getSquadSize() { return squad.size(); }
    public int getRoleCount(PlayerRole role) { return roleCount.get(role); }
    public static int getMinRequired(PlayerRole role) { return MIN_REQUIRED.get(role); }
    public boolean isSquadFull() { return squad.size() >= SQUAD_SIZE; }
    public int getRemainingSlots() { return SQUAD_SIZE - squad.size(); }

    public double getTotalSpent() {
        double total = 0;
        for (Player p : squad) {
            total += p.getFinalPrice();
        }
        return total;
    }

    /** True if the squad already has the minimum number of players in every role. */
    public boolean meetsRoleRequirements() {
        for (PlayerRole role : PlayerRole.values()) {
            if (roleCount.get(role) < MIN_REQUIRED.get(role)) {
                return false;
            }
        }
        return true;
    }

    /** True if this franchise still needs more players of the given role to reach the minimum. */
    public boolean needsRole(PlayerRole role) {
        return roleCount.get(role) < MIN_REQUIRED.get(role);
    }

    /**
     * Checks every rule for a bid. Returns null when the bid is allowed,
     * otherwise a short human-readable reason why it is not allowed.
     */
    public String getBidBlockReason(Player player, double amount) {
        if (player == null) {
            return "No player is on the block";
        }
        if (amount <= 0 || Double.isNaN(amount)) {
            return "Invalid bid amount";
        }
        if (player.isSold()) {
            return player.getName() + " is already sold";
        }
        if (isSquadFull()) {
            return code + " already has " + SQUAD_SIZE + " players";
        }
        for (Player p : squad) {
            if (p.getId().equals(player.getId())) {
                return "Duplicate player: " + player.getName() + " is already in " + code + " squad";
            }
        }
        if (amount > purse) {
            return String.format("Insufficient purse: %s has Rs.%.2f Cr, bid is Rs.%.2f Cr", code, purse, amount);
        }
        int slotsAfter = getRemainingSlots() - 1;
        double reserve = slotsAfter * MIN_BASE_PRICE;
        if (purse - amount < reserve) {
            return String.format("%s must keep Rs.%.2f Cr for its %d remaining slot(s)", code, reserve, slotsAfter);
        }
        int deficit = 0;
        for (PlayerRole role : PlayerRole.values()) {
            int have = roleCount.get(role) + (role == player.getRole() ? 1 : 0);
            deficit += Math.max(0, MIN_REQUIRED.get(role) - have);
        }
        if (deficit > slotsAfter) {
            return code + " must keep room for the minimum role requirements (4 BAT, 3 BOWL, 2 AR, 1 WK)";
        }
        return null;
    }

    public boolean canBid(Player player, double amount) {
        return getBidBlockReason(player, amount) == null;
    }

    /** Same as getBidBlockReason but throws an exception when the bid is not allowed. */
    public void validateBid(Player player, double amount) throws InvalidBidException {
        String reason = getBidBlockReason(player, amount);
        if (reason != null) {
            throw new InvalidBidException(reason);
        }
    }

    /** Buys the player: validates, deducts the price from the purse and adds him to the squad. */
    public void addPlayer(Player player, double price) throws InvalidBidException {
        validateBid(player, price);
        purse -= price;
        squad.add(player);
        roleCount.put(player.getRole(), roleCount.get(player.getRole()) + 1);
    }

    /** Text such as "BAT 2/4  BOWL 1/3  AR 0/2  WK 1/1" (current / minimum). */
    public String getCompositionText() {
        StringBuilder sb = new StringBuilder();
        for (PlayerRole role : PlayerRole.values()) {
            if (sb.length() > 0) {
                sb.append("  ");
            }
            sb.append(role.getShortName()).append(' ').append(roleCount.get(role)).append('/').append(MIN_REQUIRED.get(role));
        }
        return sb.toString();
    }

    @Override
    public String toString() {
        return code + " (" + fullName + ")";
    }
}
