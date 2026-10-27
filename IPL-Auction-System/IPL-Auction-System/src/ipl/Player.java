package ipl;

/**
 * One cricketer in the auction pool.
 * All fields are private (encapsulation) and are changed only through validated methods.
 * All money values are in Crore rupees.
 */
public class Player {
    private final String id;
    private String name;
    private int age;
    private String country;
    private PlayerRole role;
    private double basePrice;
    private double currentBid;
    private boolean sold;
    private double finalPrice;
    private String soldTo; // franchise code such as "CSK", or "-" when not sold

    public Player(String id, String name, int age, String country, PlayerRole role, double basePrice)
            throws InvalidPlayerDataException {
        if (id == null || !id.matches("P\\d{3}")) {
            throw new InvalidPlayerDataException("Invalid player ID '" + id + "' (expected format P001)");
        }
        this.id = id;
        setName(name);
        setAge(age);
        setCountry(country);
        setRole(role);
        if (basePrice < 0.5 || basePrice > 20.0 || Math.rint(basePrice * 2) != basePrice * 2) {
            throw new InvalidPlayerDataException(
                    "Invalid base price " + basePrice + " for " + id + " (must be a multiple of 0.50 Cr, 0.50 - 20.00)");
        }
        this.basePrice = basePrice;
        this.currentBid = 0.0;
        this.sold = false;
        this.finalPrice = 0.0;
        this.soldTo = "-";
    }

    // ---------- getters ----------
    public String getId() { return id; }
    public String getName() { return name; }
    public int getAge() { return age; }
    public String getCountry() { return country; }
    public PlayerRole getRole() { return role; }
    public double getBasePrice() { return basePrice; }
    public double getCurrentBid() { return currentBid; }
    public boolean isSold() { return sold; }
    public double getFinalPrice() { return finalPrice; }
    public String getSoldTo() { return soldTo; }

    // ---------- setters (with validation) ----------
    public void setName(String name) throws InvalidPlayerDataException {
        if (name == null || name.trim().isEmpty()) {
            throw new InvalidPlayerDataException("Player name cannot be empty (" + id + ")");
        }
        this.name = name.trim();
    }

    public void setAge(int age) throws InvalidPlayerDataException {
        if (age < 16 || age > 50) {
            throw new InvalidPlayerDataException("Invalid age " + age + " for " + id + " (allowed 16-50)");
        }
        this.age = age;
    }

    public void setCountry(String country) throws InvalidPlayerDataException {
        if (country == null || country.trim().isEmpty()) {
            throw new InvalidPlayerDataException("Country cannot be empty (" + id + ")");
        }
        this.country = country.trim();
    }

    public void setRole(PlayerRole role) throws InvalidPlayerDataException {
        if (role == null) {
            throw new InvalidPlayerDataException("Role cannot be null (" + id + ")");
        }
        this.role = role;
    }

    public void setCurrentBid(double currentBid) {
        if (currentBid < 0) {
            throw new IllegalArgumentException("Bid cannot be negative");
        }
        this.currentBid = currentBid;
    }

    public void setSold(boolean sold) { this.sold = sold; }

    public void setFinalPrice(double finalPrice) {
        if (finalPrice < 0) {
            throw new IllegalArgumentException("Price cannot be negative");
        }
        this.finalPrice = finalPrice;
    }

    public void setSoldTo(String soldTo) { this.soldTo = (soldTo == null || soldTo.isEmpty()) ? "-" : soldTo; }

    /** Marks this player as sold to a franchise at the given price. */
    public void markSold(String franchiseCode, double price) {
        this.sold = true;
        this.finalPrice = price;
        this.currentBid = price;
        this.soldTo = franchiseCode;
    }

    /** Clears the live bid (used when a player is skipped / sent back to the pool). */
    public void resetBid() {
        this.currentBid = 0.0;
    }

    public String getStatusText() {
        return sold ? "SOLD" : "AVAILABLE";
    }

    @Override
    public String toString() {
        return String.format("%s %s (%s, %s, age %d) base Rs.%.2f Cr", id, name, role, country, age, basePrice);
    }
}
