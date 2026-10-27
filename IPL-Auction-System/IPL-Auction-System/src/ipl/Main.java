package ipl;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import javax.swing.JFileChooser;
import javax.swing.JOptionPane;
import javax.swing.SwingUtilities;

/** Entry point: loads players.csv, creates the auction and opens the GUI. */
public class Main {
    private static final String[] CSV_LOCATIONS = {
            "data/players.csv", "../data/players.csv", "../../data/players.csv", "players.csv"
    };

    public static void main(String[] args) {
        Locale.setDefault(Locale.US); // always print 1.50 and never 1,50
        SwingUtilities.invokeLater(() -> {
            try {
                Path csv = locateCsv(args);
                if (csv == null) {
                    return; // user cancelled
                }
                List<Player> players = new PlayerDatabase().loadFromCsv(csv);
                Auction auction = new Auction(players, new Random());
                new AuctionGUI(auction).setVisible(true);
            } catch (IOException | InvalidPlayerDataException | AuctionException e) {
                JOptionPane.showMessageDialog(null, e.getMessage(), "Cannot start auction", JOptionPane.ERROR_MESSAGE);
                System.exit(1);
            }
        });
    }

    /** Finds players.csv: argument, common folders (works from any IDE), or a file chooser. */
    private static Path locateCsv(String[] args) {
        if (args.length > 0) {
            return Paths.get(args[0]);
        }
        for (String location : CSV_LOCATIONS) {
            Path p = Paths.get(location);
            if (Files.exists(p)) {
                return p;
            }
        }
        JOptionPane.showMessageDialog(null, "players.csv was not found automatically.\nPlease select it.",
                "Select players.csv", JOptionPane.INFORMATION_MESSAGE);
        JFileChooser chooser = new JFileChooser(".");
        if (chooser.showOpenDialog(null) == JFileChooser.APPROVE_OPTION) {
            return chooser.getSelectedFile().toPath();
        }
        return null;
    }
}
