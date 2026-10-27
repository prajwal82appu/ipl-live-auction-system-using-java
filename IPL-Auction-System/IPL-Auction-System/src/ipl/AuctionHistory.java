package ipl;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Keeps the full list of auction results in the order they happened. */
public class AuctionHistory {
    private final List<AuctionRecord> records = new ArrayList<>();

    public void add(AuctionRecord record) {
        if (record == null) {
            throw new IllegalArgumentException("Record cannot be null");
        }
        records.add(record);
    }

    public List<AuctionRecord> getAll() {
        return Collections.unmodifiableList(records);
    }

    public int size() {
        return records.size();
    }

    /** Writes the history to a CSV file (creates parent folders if needed). */
    public void exportToCsv(Path file) throws IOException {
        if (file.getParent() != null) {
            Files.createDirectories(file.getParent());
        }
        try (BufferedWriter out = Files.newBufferedWriter(file, StandardCharsets.UTF_8)) {
            out.write("Round,PlayerID,Player,Role,BasePrice(Cr),FinalBid(Cr),WinningFranchise,Status");
            out.newLine();
            for (AuctionRecord r : records) {
                out.write(r.toCsvRow());
                out.newLine();
            }
        }
    }
}
