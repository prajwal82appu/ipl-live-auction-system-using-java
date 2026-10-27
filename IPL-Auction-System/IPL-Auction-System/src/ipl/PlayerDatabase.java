package ipl;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Reads players.csv, validates it strictly and creates the Player objects. */
public class PlayerDatabase {
    public static final int TOTAL_PLAYERS = 100;
    public static final String HEADER = "PlayerID,Name,Age,Country,Role,BasePrice,CurrentBid,Sold,FinalPrice,SoldTo";

    private static final Map<PlayerRole, Integer> EXPECTED = new EnumMap<>(PlayerRole.class);
    static {
        EXPECTED.put(PlayerRole.BATTER, 35);
        EXPECTED.put(PlayerRole.BOWLER, 30);
        EXPECTED.put(PlayerRole.ALL_ROUNDER, 20);
        EXPECTED.put(PlayerRole.WICKETKEEPER, 15);
    }

    private final Map<String, Player> playersById = new LinkedHashMap<>();

    /**
     * Loads and validates the CSV file.
     *
     * @throws IOException                 if the file cannot be read
     * @throws InvalidPlayerDataException  if any line is wrong or the totals are not 100 / 35 / 30 / 20 / 15
     */
    public List<Player> loadFromCsv(Path file) throws IOException, InvalidPlayerDataException {
        if (file == null || !Files.exists(file)) {
            throw new IOException("players.csv not found: " + file);
        }
        playersById.clear();
        Set<String> names = new HashSet<>();

        try (BufferedReader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            String header = reader.readLine();
            if (header == null || !header.trim().equals(HEADER)) {
                throw new InvalidPlayerDataException("Invalid CSV header. Expected: " + HEADER);
            }
            String line;
            int lineNo = 1;
            while ((line = reader.readLine()) != null) {
                lineNo++;
                if (line.trim().isEmpty()) {
                    continue;
                }
                Player p = parseLine(line, lineNo);
                if (playersById.containsKey(p.getId())) {
                    throw new InvalidPlayerDataException("Line " + lineNo + ": duplicate player ID " + p.getId());
                }
                if (!names.add(p.getName().toLowerCase())) {
                    throw new InvalidPlayerDataException("Line " + lineNo + ": duplicate player name " + p.getName());
                }
                playersById.put(p.getId(), p);
            }
        }
        validateTotals();
        return new ArrayList<>(playersById.values());
    }

    private Player parseLine(String line, int lineNo) throws InvalidPlayerDataException {
        String[] f = line.split(",", -1);
        if (f.length != 10) {
            throw new InvalidPlayerDataException("Line " + lineNo + ": expected 10 columns but found " + f.length);
        }
        try {
            Player p = new Player(f[0].trim(), f[1], Integer.parseInt(f[2].trim()), f[3],
                    PlayerRole.fromString(f[4]), Double.parseDouble(f[5].trim()));
            boolean sold = Boolean.parseBoolean(f[7].trim());
            if (sold || Double.parseDouble(f[6].trim()) != 0.0 || Double.parseDouble(f[8].trim()) != 0.0) {
                throw new InvalidPlayerDataException(
                        "players.csv must be a fresh data set (CurrentBid 0, Sold false, FinalPrice 0)");
            }
            return p;
        } catch (NumberFormatException e) {
            throw new InvalidPlayerDataException("Line " + lineNo + ": invalid number (" + e.getMessage() + ")");
        } catch (IllegalArgumentException | InvalidPlayerDataException e) {
            throw new InvalidPlayerDataException("Line " + lineNo + ": " + e.getMessage());
        }
    }

    private void validateTotals() throws InvalidPlayerDataException {
        if (playersById.size() != TOTAL_PLAYERS) {
            throw new InvalidPlayerDataException(
                    "players.csv must contain exactly " + TOTAL_PLAYERS + " players but has " + playersById.size());
        }
        Map<PlayerRole, Integer> counts = new EnumMap<>(PlayerRole.class);
        for (PlayerRole r : PlayerRole.values()) {
            counts.put(r, 0);
        }
        for (Player p : playersById.values()) {
            counts.put(p.getRole(), counts.get(p.getRole()) + 1);
        }
        for (PlayerRole r : PlayerRole.values()) {
            if (!counts.get(r).equals(EXPECTED.get(r))) {
                throw new InvalidPlayerDataException("Expected " + EXPECTED.get(r) + " " + r + "s but found " + counts.get(r));
            }
        }
    }

    public Player findById(String id) {
        return playersById.get(id);
    }

    public List<Player> getAllPlayers() {
        return Collections.unmodifiableList(new ArrayList<>(playersById.values()));
    }

    /** Saves players (with their latest sold status / prices) in the same CSV format. */
    public static void saveToCsv(List<Player> players, Path file) throws IOException {
        if (file.getParent() != null) {
            Files.createDirectories(file.getParent());
        }
        try (BufferedWriter out = Files.newBufferedWriter(file, StandardCharsets.UTF_8)) {
            out.write(HEADER);
            out.newLine();
            for (Player p : players) {
                out.write(String.format("%s,%s,%d,%s,%s,%.2f,%.2f,%b,%.2f,%s", p.getId(), p.getName(), p.getAge(),
                        p.getCountry(), p.getRole().name(), p.getBasePrice(), p.getCurrentBid(), p.isSold(),
                        p.getFinalPrice(), p.getSoldTo()));
                out.newLine();
            }
        }
    }
}
