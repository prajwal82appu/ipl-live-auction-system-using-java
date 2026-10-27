package ipl;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.GridLayout;
import java.awt.RenderingHints;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JScrollPane;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.SwingConstants;
import javax.swing.Timer;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import javax.swing.table.JTableHeader;

/**
 * Swing user interface of the IPL Player Auction.
 * The GUI only shows data and forwards button clicks to the Auction object (which holds all rules).
 */
public class AuctionGUI extends JFrame {
    private static final String RUPEE = "\u20B9";

    // ---- colour theme (IPL inspired) ----
    private static final Color NAVY = new Color(0x0A1330);
    private static final Color PANEL = new Color(0x15224D);
    private static final Color PANEL_LIGHT = new Color(0x1F2F66);
    private static final Color ORANGE = new Color(0xFF8A1F);
    private static final Color GOLD = new Color(0xFFC933);
    private static final Color TEXT = new Color(0xF2F5FF);
    private static final Color MUTED = new Color(0xA9B6E0);
    private static final Color GREEN = new Color(0x2ECC71);
    private static final Color RED = new Color(0xE74C3C);

    private static final Map<String, Color> TEAM_COLOR = new LinkedHashMap<>();
    private static final Map<String, Color> TEAM_TEXT = new LinkedHashMap<>();
    static {
        TEAM_COLOR.put("CSK", new Color(0xF9CD05));  TEAM_TEXT.put("CSK", new Color(0x1B1B1B));
        TEAM_COLOR.put("RCB", new Color(0xD1171B));  TEAM_TEXT.put("RCB", Color.WHITE);
        TEAM_COLOR.put("MI",  new Color(0x0B5ED7));  TEAM_TEXT.put("MI", Color.WHITE);
        TEAM_COLOR.put("KKR", new Color(0x5B2E91));  TEAM_TEXT.put("KKR", new Color(0xFFD75E));
    }

    private final Auction auction;
    private final Random random = new Random();

    // header
    private final JLabel soldLabel = statLabel();
    private final JLabel unsoldLabel = statLabel();
    private final JLabel remainingLabel = statLabel();
    private final JLabel roundLabel = statLabel();
    private final JProgressBar progressBar = new JProgressBar(0, PlayerDatabase.TOTAL_PLAYERS);

    // player card
    private final JLabel playerName = new JLabel("No player on the block");
    private final JLabel playerRole = new JLabel(" ");
    private final JLabel playerId = valueLabel();
    private final JLabel playerAge = valueLabel();
    private final JLabel playerCountry = valueLabel();
    private final JLabel playerBase = valueLabel();
    private final JLabel playerStatus = valueLabel();

    // bid card
    private final JLabel bidAmount = new JLabel(RUPEE + " 0.00 Cr");
    private final JLabel bidder = new JLabel("-");
    private final JLabel nextBid = new JLabel(" ");
    private final JLabel bidCount = new JLabel(" ");

    private final Map<String, FranchisePanel> franchisePanels = new LinkedHashMap<>();
    private final Map<String, StyledButton> bidButtons = new LinkedHashMap<>();
    private final JTextArea feed = new JTextArea();

    private StyledButton nextButton, sellButton, skipButton, autoPlayerButton, autoAuctionButton;
    private StyledButton squadButton, historyButton, unsoldButton, finalButton, exitButton;
    private Timer autoTimer;
    private boolean completionShown = false;
    private AuctionRecord lastSoldRecord = null;

    public AuctionGUI(Auction auction) {
        super("IPL Player Auction Management System");
        this.auction = auction;
        buildUi();
        setDefaultCloseOperation(DO_NOTHING_ON_CLOSE);
        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                confirmExit();
            }
        });
        setSize(1340, 880);
        setMinimumSize(new Dimension(1180, 780));
        setLocationRelativeTo(null);
        log("Welcome to the IPL Player Auction! 4 franchises, 100 players, Rs.100 Cr each.");
        log("Click NEXT PLAYER to bring the first player onto the block.");
        refresh();
    }

    // =====================================================================
    //  UI construction
    // =====================================================================
    private void buildUi() {
        JPanel root = new JPanel(new BorderLayout(12, 12));
        root.setBackground(NAVY);
        root.setBorder(BorderFactory.createEmptyBorder(12, 14, 12, 14));
        setContentPane(root);

        root.add(buildHeader(), BorderLayout.NORTH);

        JPanel center = new JPanel(new BorderLayout(12, 12));
        center.setOpaque(false);
        JPanel top = new JPanel(new GridLayout(1, 2, 12, 0));
        top.setOpaque(false);
        top.add(buildPlayerCard());
        top.add(buildBidCard());
        top.setPreferredSize(new Dimension(100, 215));
        center.add(top, BorderLayout.NORTH);
        center.add(buildFranchiseRow(), BorderLayout.CENTER);
        root.add(center, BorderLayout.CENTER);

        root.add(buildFeed(), BorderLayout.EAST);
        root.add(buildControls(), BorderLayout.SOUTH);
    }

    private JPanel buildHeader() {
        RoundedPanel header = new RoundedPanel(PANEL, 22);
        header.setLayout(new BorderLayout(10, 6));
        header.setBorder(BorderFactory.createEmptyBorder(10, 18, 10, 18));

        JPanel titleBox = new JPanel(new GridLayout(2, 1));
        titleBox.setOpaque(false);
        JLabel title = new JLabel("IPL PLAYER AUCTION");
        title.setFont(new Font("SansSerif", Font.BOLD, 30));
        title.setForeground(ORANGE);
        JLabel sub = new JLabel("Mega Auction Simulator  |  CSK  \u2022  RCB  \u2022  MI  \u2022  KKR");
        sub.setFont(new Font("SansSerif", Font.PLAIN, 13));
        sub.setForeground(MUTED);
        titleBox.add(title);
        titleBox.add(sub);
        header.add(titleBox, BorderLayout.WEST);

        JPanel stats = new JPanel(new GridLayout(1, 4, 14, 0));
        stats.setOpaque(false);
        stats.add(statBox("SOLD", soldLabel, GREEN));
        stats.add(statBox("UNSOLD", unsoldLabel, RED));
        stats.add(statBox("REMAINING", remainingLabel, GOLD));
        stats.add(statBox("ROUND", roundLabel, TEXT));
        header.add(stats, BorderLayout.EAST);

        progressBar.setStringPainted(true);
        progressBar.setForeground(ORANGE);
        progressBar.setBackground(PANEL_LIGHT);
        progressBar.setBorder(BorderFactory.createEmptyBorder());
        progressBar.setPreferredSize(new Dimension(100, 18));
        header.add(progressBar, BorderLayout.SOUTH);
        return header;
    }

    private JPanel statBox(String caption, JLabel value, Color color) {
        JPanel p = new JPanel(new GridLayout(2, 1));
        p.setOpaque(false);
        value.setForeground(color);
        value.setHorizontalAlignment(SwingConstants.CENTER);
        JLabel c = new JLabel(caption, SwingConstants.CENTER);
        c.setFont(new Font("SansSerif", Font.BOLD, 11));
        c.setForeground(MUTED);
        p.add(value);
        p.add(c);
        return p;
    }

    private JPanel buildPlayerCard() {
        RoundedPanel card = new RoundedPanel(PANEL, 22);
        card.setLayout(new BorderLayout(8, 8));
        card.setBorder(BorderFactory.createEmptyBorder(14, 18, 14, 18));

        JLabel heading = new JLabel("PLAYER ON THE BLOCK");
        heading.setFont(new Font("SansSerif", Font.BOLD, 12));
        heading.setForeground(ORANGE);

        playerName.setFont(new Font("SansSerif", Font.BOLD, 28));
        playerName.setForeground(TEXT);
        playerRole.setFont(new Font("SansSerif", Font.BOLD, 14));
        playerRole.setForeground(GOLD);

        JPanel head = new JPanel(new GridLayout(3, 1));
        head.setOpaque(false);
        head.add(heading);
        head.add(playerName);
        head.add(playerRole);
        card.add(head, BorderLayout.NORTH);

        JPanel grid = new JPanel(new GridLayout(5, 2, 6, 4));
        grid.setOpaque(false);
        addInfoRow(grid, "Player ID", playerId);
        addInfoRow(grid, "Age", playerAge);
        addInfoRow(grid, "Country", playerCountry);
        addInfoRow(grid, "Base Price", playerBase);
        addInfoRow(grid, "Status", playerStatus);
        card.add(grid, BorderLayout.CENTER);
        return card;
    }

    private void addInfoRow(JPanel grid, String caption, JLabel value) {
        JLabel c = new JLabel(caption);
        c.setForeground(MUTED);
        c.setFont(new Font("SansSerif", Font.PLAIN, 13));
        grid.add(c);
        grid.add(value);
    }

    private JPanel buildBidCard() {
        RoundedPanel card = new RoundedPanel(PANEL, 22);
        card.setLayout(new GridLayout(5, 1, 0, 2));
        card.setBorder(BorderFactory.createEmptyBorder(14, 18, 14, 18));

        JLabel heading = new JLabel("CURRENT HIGHEST BID");
        heading.setFont(new Font("SansSerif", Font.BOLD, 12));
        heading.setForeground(ORANGE);

        bidAmount.setFont(new Font("SansSerif", Font.BOLD, 46));
        bidAmount.setForeground(GOLD);
        bidder.setFont(new Font("SansSerif", Font.BOLD, 18));
        bidder.setForeground(TEXT);
        nextBid.setFont(new Font("SansSerif", Font.PLAIN, 14));
        nextBid.setForeground(MUTED);
        bidCount.setFont(new Font("SansSerif", Font.PLAIN, 13));
        bidCount.setForeground(MUTED);

        card.add(heading);
        card.add(bidAmount);
        card.add(bidder);
        card.add(nextBid);
        card.add(bidCount);
        return card;
    }

    private JPanel buildFranchiseRow() {
        JPanel row = new JPanel(new GridLayout(1, 4, 12, 0));
        row.setOpaque(false);
        for (Franchise f : auction.getFranchises()) {
            FranchisePanel fp = new FranchisePanel(f);
            franchisePanels.put(f.getCode(), fp);
            row.add(fp);
        }
        return row;
    }

    private JPanel buildFeed() {
        RoundedPanel box = new RoundedPanel(PANEL, 22);
        box.setLayout(new BorderLayout(0, 8));
        box.setBorder(BorderFactory.createEmptyBorder(12, 12, 12, 12));
        box.setPreferredSize(new Dimension(300, 100));
        JLabel heading = new JLabel("LIVE AUCTION FEED");
        heading.setFont(new Font("SansSerif", Font.BOLD, 12));
        heading.setForeground(ORANGE);
        box.add(heading, BorderLayout.NORTH);

        feed.setEditable(false);
        feed.setLineWrap(true);
        feed.setWrapStyleWord(true);
        feed.setBackground(NAVY);
        feed.setForeground(TEXT);
        feed.setFont(new Font("SansSerif", Font.PLAIN, 12));
        feed.setMargin(new java.awt.Insets(6, 8, 6, 8));
        JScrollPane scroll = new JScrollPane(feed);
        scroll.setBorder(BorderFactory.createEmptyBorder());
        box.add(scroll, BorderLayout.CENTER);
        return box;
    }

    private JPanel buildControls() {
        JPanel south = new JPanel(new BorderLayout(0, 10));
        south.setOpaque(false);

        // --- bidding buttons ---
        JPanel bids = new JPanel(new GridLayout(1, 4, 12, 0));
        bids.setOpaque(false);
        for (String code : TEAM_COLOR.keySet()) {
            StyledButton b = new StyledButton("BID " + code, TEAM_COLOR.get(code), TEAM_TEXT.get(code));
            b.setFont(new Font("SansSerif", Font.BOLD, 17));
            b.setPreferredSize(new Dimension(100, 54));
            b.addActionListener(e -> onBid(code));
            bidButtons.put(code, b);
            bids.add(b);
        }
        south.add(bids, BorderLayout.NORTH);

        // --- control buttons ---
        JPanel ctl = new JPanel(new GridLayout(2, 5, 10, 10));
        ctl.setOpaque(false);
        nextButton = control("Next Player", ORANGE, ctl, e -> onNext());
        sellButton = control("Sell Player", new Color(0x1E9E5A), ctl, e -> onSell());
        skipButton = control("Skip Player", new Color(0xB5423A), ctl, e -> onSkip());
        autoPlayerButton = control("Auto-Bid Player", new Color(0x3B5BA8), ctl, e -> onAutoPlayer());
        autoAuctionButton = control("Auto Auction", new Color(0x3B5BA8), ctl, e -> onAutoAuction());
        squadButton = control("View Squad", PANEL_LIGHT, ctl, e -> onViewSquad());
        historyButton = control("Auction History", PANEL_LIGHT, ctl, e -> showTableDialog("Auction History", historyPanel()));
        unsoldButton = control("Unsold Players", PANEL_LIGHT, ctl, e -> showTableDialog("Unsold Players", unsoldPanel()));
        finalButton = control("Final Results", PANEL_LIGHT, ctl, e -> showFinalResults());
        exitButton = control("Exit", new Color(0x6B2A2A), ctl, e -> confirmExit());
        south.add(ctl, BorderLayout.CENTER);
        return south;
    }

    private StyledButton control(String text, Color bg, JPanel parent, java.awt.event.ActionListener l) {
        StyledButton b = new StyledButton(text, bg, Color.WHITE);
        b.setFont(new Font("SansSerif", Font.BOLD, 14));
        b.setPreferredSize(new Dimension(100, 40));
        b.addActionListener(l);
        parent.add(b);
        return b;
    }

    // =====================================================================
    //  Button actions
    // =====================================================================
    private void onNext() {
        lastSoldRecord = null;
        try {
            int roundBefore = auction.getRound();
            Player p = auction.startNextPlayer();
            if (auction.getRound() != roundBefore) {
                log("--- ROUND " + auction.getRound() + ": unsold players are back on the block ---");
            }
            log("NOW BIDDING: " + p.getName() + " (" + p.getRole() + ") base " + money(p.getBasePrice()));
        } catch (AuctionException ex) {
            warn(ex.getMessage());
        }
        refresh();
    }

    private void onBid(String code) {
        try {
            Bid bid = auction.placeBid(code);
            log(code + " bids " + money(bid.getAmount()));
        } catch (AuctionException ex) {
            warn(ex.getMessage());
        }
        refresh();
    }

    private void onSell() {
        try {
            AuctionRecord r = auction.sellPlayer();
            lastSoldRecord = r;
            log("SOLD! " + r.getPlayerName() + " to " + r.getWinner() + " for " + money(r.getFinalBid()));
        } catch (AuctionException ex) {
            warn(ex.getMessage());
        }
        refresh();
        checkCompletion();
    }

    private void onSkip() {
        lastSoldRecord = null;
        try {
            AuctionRecord r = auction.skipPlayer();
            log("UNSOLD: " + r.getPlayerName());
        } catch (AuctionException ex) {
            warn(ex.getMessage());
        }
        refresh();
        checkCompletion();
    }

    private void onAutoPlayer() {
        try {
            if (auction.getCurrentPlayer() == null) {
                auction.startNextPlayer();
            }
            logAutoResult(auction.simulateCurrentPlayer(random));
        } catch (AuctionException ex) {
            warn(ex.getMessage());
        }
        refresh();
        checkCompletion();
    }

    private void onAutoAuction() {
        if (autoTimer != null) {
            stopAuto();
            refresh();
            return;
        }
        autoTimer = new Timer(350, e -> {
            try {
                if (auction.isComplete()) {
                    stopAuto();
                } else {
                    if (auction.getCurrentPlayer() == null) {
                        int before = auction.getRound();
                        auction.startNextPlayer();
                        if (auction.getRound() != before) {
                            log("--- ROUND " + auction.getRound() + ": unsold players are back on the block ---");
                        }
                    }
                    logAutoResult(auction.simulateCurrentPlayer(random));
                }
            } catch (AuctionException ex) {
                stopAuto();
                warn(ex.getMessage());
            }
            refresh();
            checkCompletion();
        });
        autoTimer.start();
        refresh();
    }

    private void stopAuto() {
        if (autoTimer != null) {
            autoTimer.stop();
            autoTimer = null;
        }
    }

    private void logAutoResult(AuctionRecord r) {
        if (r.isSold()) {
            log("SOLD! " + r.getPlayerName() + " to " + r.getWinner() + " for " + money(r.getFinalBid()));
        } else {
            log("UNSOLD: " + r.getPlayerName() + " (no bids)");
        }
    }

    private void onViewSquad() {
        Object[] teams = auction.getFranchises().toArray();
        Object choice = JOptionPane.showInputDialog(this, "Select a franchise:", "View Squad",
                JOptionPane.PLAIN_MESSAGE, null, teams, teams[0]);
        if (choice instanceof Franchise) {
            showTableDialog(((Franchise) choice).getFullName() + " - Squad", squadPanel((Franchise) choice));
        }
    }

    private void showFinalResults() {
        JTabbedPane tabs = new JTabbedPane();
        for (Franchise f : auction.getFranchises()) {
            tabs.addTab(f.getCode(), squadPanel(f));
        }
        tabs.addTab("Unsold", unsoldPanel());
        tabs.addTab("History", historyPanel());

        JPanel content = new JPanel(new BorderLayout(0, 8));
        content.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        String banner = auction.isComplete()
                ? "FINAL RESULTS - Auction complete"
                : "PROVISIONAL RESULTS - Auction still in progress";
        JLabel head = new JLabel(banner);
        head.setFont(new Font("SansSerif", Font.BOLD, 18));
        head.setForeground(auction.isComplete() ? new Color(0x1E7B45) : new Color(0xB5651D));
        content.add(head, BorderLayout.NORTH);
        content.add(tabs, BorderLayout.CENTER);

        JButton save = new JButton("Save report to output folder");
        save.addActionListener(e -> saveResults(true));
        JPanel bottom = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        bottom.add(save);
        content.add(bottom, BorderLayout.SOUTH);

        showTableDialog("Final Results", content);
    }

    private void saveResults(boolean showMessage) {
        try {
            Path folder = Paths.get("output");
            auction.exportResults(folder);
            if (showMessage) {
                JOptionPane.showMessageDialog(this, "Saved auction_history.csv, players_after_auction.csv and\nfinal_report.txt in:\n"
                        + folder.toAbsolutePath(), "Saved", JOptionPane.INFORMATION_MESSAGE);
            }
        } catch (java.io.IOException ex) {
            warn("Could not save results: " + ex.getMessage());
        }
    }

    private void checkCompletion() {
        if (auction.isComplete() && !completionShown) {
            completionShown = true;
            stopAuto();
            saveResults(false);
            boolean allOk = true;
            for (Franchise f : auction.getFranchises()) {
                allOk &= f.isSquadFull() && f.meetsRoleRequirements();
            }
            log("=== AUCTION COMPLETE ===");
            String msg = allOk
                    ? "The auction is complete! All four franchises have a full squad of 11 players.\nResults were saved in the 'output' folder."
                    : "The auction is complete, but some squads are not full (not enough players were sold).\nResults were saved in the 'output' folder.";
            JOptionPane.showMessageDialog(this, msg, "Auction Complete", JOptionPane.INFORMATION_MESSAGE);
            refresh();
            showFinalResults();
        }
    }

    private void confirmExit() {
        int answer = JOptionPane.showConfirmDialog(this, "Exit the auction?", "Exit", JOptionPane.YES_NO_OPTION);
        if (answer == JOptionPane.YES_OPTION) {
            stopAuto();
            dispose();
            System.exit(0);
        }
    }

    // =====================================================================
    //  Refresh everything that depends on the auction state
    // =====================================================================
    private void refresh() {
        soldLabel.setText(String.valueOf(auction.getSoldCount()));
        unsoldLabel.setText(String.valueOf(auction.getUnsoldCount()));
        remainingLabel.setText(String.valueOf(auction.getRemainingCount()));
        roundLabel.setText(String.valueOf(auction.getRound()));
        progressBar.setValue(auction.getSoldCount() + auction.getUnsoldCount());
        progressBar.setString(auction.getSoldCount() + " sold  |  " + auction.getUnsoldCount() + " unsold  |  "
                + auction.getRemainingCount() + " waiting  (of " + auction.getTotalPlayers() + " players)");

        Player p = auction.getCurrentPlayer();
        if (p == null) {
            if (lastSoldRecord != null) {
                playerName.setText(lastSoldRecord.getPlayerName());
                playerName.setForeground(GREEN);
                playerRole.setText("SOLD TO " + lastSoldRecord.getWinner() + "  (" + lastSoldRecord.getRole() + ")");
                playerRole.setForeground(GOLD);
                playerId.setText(lastSoldRecord.getPlayerId());
                playerAge.setText("-");
                playerCountry.setText("-");
                playerBase.setText(money(lastSoldRecord.getBasePrice()));
                playerStatus.setText("SOLD to " + lastSoldRecord.getWinner());
                playerStatus.setForeground(GREEN);
                bidAmount.setText(money(lastSoldRecord.getFinalBid()));
                bidder.setText("Acquired by " + lastSoldRecord.getWinner() + " (In Squad)");
                bidder.setForeground(GREEN);
                nextBid.setText("Player successfully assigned to " + lastSoldRecord.getWinner());
                bidCount.setText("Click 'Next Player' to bring next cricketer to block");
            } else {
                playerName.setText(auction.isComplete() ? "Auction complete" : "No player on the block");
                playerName.setForeground(TEXT);
                playerRole.setText(auction.isComplete() ? "See Final Results" : "Click NEXT PLAYER");
                playerRole.setForeground(GOLD);
                playerId.setText("-");
                playerAge.setText("-");
                playerCountry.setText("-");
                playerBase.setText("-");
                playerStatus.setText("-");
                bidAmount.setText(RUPEE + " 0.00 Cr");
                bidder.setText("No bids yet");
                bidder.setForeground(TEXT);
                nextBid.setText(" ");
                bidCount.setText(" ");
            }
        } else {
            playerName.setText(p.getName());
            playerRole.setText(p.getRole().getDisplayName().toUpperCase());
            playerId.setText(p.getId());
            playerAge.setText(p.getAge() + " years");
            playerCountry.setText(p.getCountry());
            playerBase.setText(money(p.getBasePrice()));
            playerStatus.setText(p.getStatusText());
            bidAmount.setText(money(auction.getCurrentBid()));
            Franchise hb = auction.getHighestBidder();
            if (hb == null) {
                bidder.setText("Opening price - no bids yet");
                bidder.setForeground(TEXT);
            } else {
                bidder.setText("Highest bidder: " + hb.getFullName());
                bidder.setForeground(brighten(TEAM_COLOR.get(hb.getCode())));
            }
            nextBid.setText("Next bid: " + money(auction.getNextBidAmount()) + "  (increment " + money(Auction.BID_INCREMENT) + ")");
            bidCount.setText("Bids placed for this player: " + auction.getCurrentBids().size());
        }

        for (FranchisePanel fp : franchisePanels.values()) {
            fp.update();
        }
        updateButtons();
    }

    private void updateButtons() {
        boolean complete = auction.isComplete();
        boolean auto = autoTimer != null;
        Player p = auction.getCurrentPlayer();
        boolean active = p != null && !complete;
        double next = auction.getNextBidAmount();

        for (Map.Entry<String, StyledButton> e : bidButtons.entrySet()) {
            StyledButton b = e.getValue();
            String code = e.getKey();
            String reason = null;
            boolean ok = false;
            if (active) {
                Franchise f = franchiseByCode(code);
                if (f == auction.getHighestBidder()) {
                    reason = code + " already holds the highest bid";
                } else {
                    reason = f.getBidBlockReason(p, next);
                }
                ok = reason == null && !auto;
            }
            b.setText(active ? "BID " + code + "  " + money(next) : "BID " + code);
            b.setEnabled(ok);
            b.setToolTipText(reason);
        }
        nextButton.setEnabled(!complete && p == null && !auto);
        sellButton.setEnabled(active && auction.getHighestBidder() != null && !auto);
        skipButton.setEnabled(active && !auto);
        autoPlayerButton.setEnabled(!complete && !auto);
        autoAuctionButton.setEnabled(!complete);
        autoAuctionButton.setText(auto ? "Stop Auto" : "Auto Auction");
    }

    private Franchise franchiseByCode(String code) {
        for (Franchise f : auction.getFranchises()) {
            if (f.getCode().equals(code)) {
                return f;
            }
        }
        throw new IllegalArgumentException(code);
    }

    private void log(String message) {
        feed.append(message + "\n");
        feed.setCaretPosition(feed.getDocument().getLength());
    }

    private void warn(String message) {
        JOptionPane.showMessageDialog(this, message, "Not allowed", JOptionPane.WARNING_MESSAGE);
    }

    // =====================================================================
    //  Tables and dialogs
    // =====================================================================
    private JPanel squadPanel(Franchise f) {
        String[] cols = {"#", "Player", "Role", "Age", "Country", "Price (Cr)"};
        Object[][] rows = new Object[f.getSquadSize()][];
        int i = 0;
        for (Player p : f.getSquad()) {
            rows[i] = new Object[]{i + 1, p.getName(), p.getRole(), p.getAge(), p.getCountry(),
                    String.format("%.2f", p.getFinalPrice())};
            i++;
        }
        JPanel panel = new JPanel(new BorderLayout(0, 8));
        panel.setBorder(BorderFactory.createEmptyBorder(8, 8, 8, 8));
        JLabel head = new JLabel(f.getFullName() + "  -  squad " + f.getSquadSize() + "/" + Franchise.SQUAD_SIZE);
        head.setFont(new Font("SansSerif", Font.BOLD, 16));
        panel.add(head, BorderLayout.NORTH);
        panel.add(new JScrollPane(makeTable(cols, rows)), BorderLayout.CENTER);

        String summary = String.format(
                "<html>Total spent: <b>%s</b> &nbsp;|&nbsp; Remaining purse: <b>%s</b><br>Composition (have/minimum): <b>%s</b> &nbsp; %s</html>",
                money(f.getTotalSpent()), money(f.getPurse()), f.getCompositionText(),
                f.meetsRoleRequirements() ? "(role requirements met)" : "(role requirements not met yet)");
        JLabel sum = new JLabel(summary);
        sum.setFont(new Font("SansSerif", Font.PLAIN, 13));
        panel.add(sum, BorderLayout.SOUTH);
        return panel;
    }

    private JPanel historyPanel() {
        String[] cols = {"Rd", "ID", "Player", "Role", "Base (Cr)", "Final Bid (Cr)", "Winner", "Status"};
        List<AuctionRecord> list = auction.getHistory().getAll();
        Object[][] rows = new Object[list.size()][];
        for (int i = 0; i < list.size(); i++) {
            AuctionRecord r = list.get(i);
            rows[i] = new Object[]{r.getRound(), r.getPlayerId(), r.getPlayerName(), r.getRole(),
                    String.format("%.2f", r.getBasePrice()),
                    r.isSold() ? String.format("%.2f", r.getFinalBid()) : "-", r.getWinner(), r.getStatus()};
        }
        return wrapTable("Auction history - " + list.size() + " entries", makeTable(cols, rows));
    }

    private JPanel unsoldPanel() {
        String[] cols = {"ID", "Player", "Role", "Age", "Country", "Base (Cr)"};
        List<Player> list = auction.getUnsoldPlayers();
        Object[][] rows = new Object[list.size()][];
        for (int i = 0; i < list.size(); i++) {
            Player p = list.get(i);
            rows[i] = new Object[]{p.getId(), p.getName(), p.getRole(), p.getAge(), p.getCountry(),
                    String.format("%.2f", p.getBasePrice())};
        }
        return wrapTable("Unsold players - " + list.size(), makeTable(cols, rows));
    }

    private JPanel wrapTable(String title, JTable table) {
        JPanel panel = new JPanel(new BorderLayout(0, 8));
        panel.setBorder(BorderFactory.createEmptyBorder(8, 8, 8, 8));
        JLabel head = new JLabel(title);
        head.setFont(new Font("SansSerif", Font.BOLD, 16));
        panel.add(head, BorderLayout.NORTH);
        panel.add(new JScrollPane(table), BorderLayout.CENTER);
        return panel;
    }

    private JTable makeTable(String[] columns, Object[][] data) {
        DefaultTableModel model = new DefaultTableModel(data, columns) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
        JTable table = new JTable(model);
        table.setRowHeight(26);
        table.setFont(new Font("SansSerif", Font.PLAIN, 13));
        table.setGridColor(new Color(0xDDE3F3));
        table.setSelectionBackground(new Color(0xFFE2C2));
        table.setSelectionForeground(Color.BLACK);
        for (int i = 0; i < table.getColumnCount(); i++) {
            String col = columns[i];
            int width = col.equals("Player") ? 210 : (col.equals("#") || col.equals("Rd") || col.equals("Age") || col.equals("ID")) ? 55 : 120;
            table.getColumnModel().getColumn(i).setPreferredWidth(width);
        }
        JTableHeader header = table.getTableHeader();
        header.setBackground(NAVY);
        header.setForeground(Color.WHITE);
        header.setFont(new Font("SansSerif", Font.BOLD, 13));
        header.setReorderingAllowed(false);
        table.setDefaultRenderer(Object.class, new DefaultTableCellRenderer() {
            @Override
            public Component getTableCellRendererComponent(JTable t, Object value, boolean sel, boolean focus, int row, int col) {
                Component c = super.getTableCellRendererComponent(t, value, sel, focus, row, col);
                if (!sel) {
                    c.setBackground(row % 2 == 0 ? Color.WHITE : new Color(0xF2F5FD));
                    c.setForeground("SOLD".equals(value) ? new Color(0x1E7B45) : "UNSOLD".equals(value) ? new Color(0xB03A2E) : Color.BLACK);
                }
                return c;
            }
        });
        return table;
    }

    private void showTableDialog(String title, JPanel content) {
        JDialog dialog = new JDialog(this, title, true);
        dialog.setContentPane(content);
        dialog.setSize(880, 560);
        dialog.setLocationRelativeTo(this);
        dialog.setVisible(true);
    }

    // =====================================================================
    //  Small helpers
    // =====================================================================
    private static String money(double value) {
        return String.format("%s %.2f Cr", RUPEE, value);
    }

    private static Color brighten(Color c) {
        // dark team colours (MI blue, KKR purple) are hard to read on navy, so lighten them
        float[] hsb = Color.RGBtoHSB(c.getRed(), c.getGreen(), c.getBlue(), null);
        return Color.getHSBColor(hsb[0], Math.min(hsb[1], 0.55f), Math.max(hsb[2], 0.95f));
    }

    private static JLabel statLabel() {
        JLabel l = new JLabel("0");
        l.setFont(new Font("SansSerif", Font.BOLD, 28));
        return l;
    }

    private static JLabel valueLabel() {
        JLabel l = new JLabel("-");
        l.setFont(new Font("SansSerif", Font.BOLD, 14));
        l.setForeground(TEXT);
        return l;
    }

    // =====================================================================
    //  Custom components
    // =====================================================================

    /** A panel with rounded corners and an optional glowing outline. */
    private static class RoundedPanel extends JPanel {
        private final Color fill;
        private final int arc;
        private Color outline;

        RoundedPanel(Color fill, int arc) {
            this.fill = fill;
            this.arc = arc;
            setOpaque(false);
        }

        void setOutline(Color outline) {
            this.outline = outline;
            repaint();
        }

        @Override
        protected void paintComponent(Graphics g) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setColor(fill);
            g2.fillRoundRect(0, 0, getWidth() - 1, getHeight() - 1, arc, arc);
            if (outline != null) {
                g2.setColor(outline);
                g2.setStroke(new java.awt.BasicStroke(3f));
                g2.drawRoundRect(1, 1, getWidth() - 3, getHeight() - 3, arc, arc);
            }
            g2.dispose();
            super.paintComponent(g);
        }
    }

    /** A flat rounded button that looks the same on every operating system. */
    private static class StyledButton extends JButton {
        private final Color base;
        private final Color textColor;

        StyledButton(String text, Color base, Color textColor) {
            super(text);
            this.base = base;
            this.textColor = textColor;
            setContentAreaFilled(false);
            setBorderPainted(false);
            setFocusPainted(false);
            setOpaque(false);
            setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        }

        @Override
        protected void paintComponent(Graphics g) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            Color fill = base;
            Color fg = textColor;
            if (!isEnabled()) {
                fill = new Color(0x2A3560);
                fg = new Color(0x7480A8);
            } else if (getModel().isPressed()) {
                fill = base.darker();
            } else if (getModel().isRollover()) {
                fill = brighten(base).equals(base) ? base.brighter() : mix(base, Color.WHITE, 0.18f);
            }
            g2.setColor(fill);
            g2.fillRoundRect(0, 0, getWidth() - 1, getHeight() - 1, 16, 16);
            g2.setFont(getFont());
            FontMetrics fm = g2.getFontMetrics();
            int x = (getWidth() - fm.stringWidth(getText())) / 2;
            int y = (getHeight() - fm.getHeight()) / 2 + fm.getAscent();
            g2.setColor(fg);
            g2.drawString(getText(), x, y);
            g2.dispose();
        }

        private static Color mix(Color a, Color b, float t) {
            return new Color((int) (a.getRed() + (b.getRed() - a.getRed()) * t),
                    (int) (a.getGreen() + (b.getGreen() - a.getGreen()) * t),
                    (int) (a.getBlue() + (b.getBlue() - a.getBlue()) * t));
        }
    }

    /** The card that shows one franchise: purse, squad size and role distribution. */
    private class FranchisePanel extends RoundedPanel {
        private final Franchise franchise;
        private final JLabel purse = new JLabel();
        private final JLabel squad = new JLabel();
        private final JLabel spent = new JLabel();
        private final JLabel latestAcquired = new JLabel("Latest: (none yet)");
        private final JProgressBar bar = new JProgressBar(0, Franchise.SQUAD_SIZE);
        private final Map<PlayerRole, JLabel> roleLabels = new LinkedHashMap<>();

        FranchisePanel(Franchise franchise) {
            super(PANEL, 22);
            this.franchise = franchise;
            setLayout(new BorderLayout(0, 8));
            setBorder(BorderFactory.createEmptyBorder(10, 12, 12, 12));

            Color teamColor = TEAM_COLOR.get(franchise.getCode());
            JPanel banner = new RoundedPanel(teamColor, 14);
            banner.setLayout(new GridLayout(2, 1));
            banner.setBorder(BorderFactory.createEmptyBorder(6, 12, 6, 12));
            JLabel code = new JLabel(franchise.getCode());
            code.setFont(new Font("SansSerif", Font.BOLD, 24));
            code.setForeground(TEAM_TEXT.get(franchise.getCode()));
            JLabel name = new JLabel(franchise.getFullName());
            name.setFont(new Font("SansSerif", Font.PLAIN, 12));
            name.setForeground(TEAM_TEXT.get(franchise.getCode()));
            banner.add(code);
            banner.add(name);
            add(banner, BorderLayout.NORTH);

            JPanel body = new JPanel(new GridLayout(6, 1, 0, 3));
            body.setOpaque(false);
            JLabel purseCaption = new JLabel("REMAINING PURSE");
            purseCaption.setFont(new Font("SansSerif", Font.BOLD, 11));
            purseCaption.setForeground(MUTED);
            purse.setFont(new Font("SansSerif", Font.BOLD, 24));
            purse.setForeground(GOLD);
            squad.setFont(new Font("SansSerif", Font.BOLD, 14));
            squad.setForeground(TEXT);
            spent.setFont(new Font("SansSerif", Font.PLAIN, 12));
            spent.setForeground(MUTED);
            latestAcquired.setFont(new Font("SansSerif", Font.PLAIN, 11));
            latestAcquired.setForeground(MUTED);
            bar.setForeground(GREEN);
            bar.setBackground(PANEL_LIGHT);
            bar.setBorder(BorderFactory.createEmptyBorder());
            bar.setPreferredSize(new Dimension(100, 10));
            body.add(purseCaption);
            body.add(purse);
            body.add(squad);
            body.add(bar);
            body.add(spent);
            body.add(latestAcquired);
            add(body, BorderLayout.CENTER);

            JPanel roles = new JPanel(new GridLayout(2, 2, 6, 4));
            roles.setOpaque(false);
            for (PlayerRole role : PlayerRole.values()) {
                JLabel l = new JLabel("", SwingConstants.CENTER);
                l.setFont(new Font("SansSerif", Font.BOLD, 12));
                l.setOpaque(true);
                l.setBackground(PANEL_LIGHT);
                l.setBorder(BorderFactory.createEmptyBorder(4, 2, 4, 2));
                roleLabels.put(role, l);
                roles.add(l);
            }
            add(roles, BorderLayout.SOUTH);
        }

        void update() {
            purse.setText(money(franchise.getPurse()));
            squad.setText("Squad: " + franchise.getSquadSize() + " / " + Franchise.SQUAD_SIZE + " players");
            bar.setValue(franchise.getSquadSize());
            spent.setText("Spent: " + money(franchise.getTotalSpent()));
            if (franchise.getSquad().isEmpty()) {
                latestAcquired.setText("Latest: (none yet)");
                latestAcquired.setForeground(MUTED);
            } else {
                Player last = franchise.getSquad().get(franchise.getSquad().size() - 1);
                latestAcquired.setText("<html>Latest: <font color='#2ECC71'><b>" + last.getName() + "</b> (" + money(last.getFinalPrice()) + ")</font></html>");
            }
            for (PlayerRole role : PlayerRole.values()) {
                int have = franchise.getRoleCount(role);
                int min = Franchise.getMinRequired(role);
                JLabel l = roleLabels.get(role);
                l.setText(role.getShortName() + "  " + have + " / " + min);
                l.setForeground(have >= min ? GREEN : new Color(0xFFB347));
            }
            boolean leading = auction.getCurrentPlayer() != null && auction.getHighestBidder() == franchise;
            setOutline(leading ? GOLD : null);

            StringBuilder sb = new StringBuilder("<html><b>" + franchise.getFullName() + " Squad (" + franchise.getSquadSize() + "/" + Franchise.SQUAD_SIZE + "):</b><br/>");
            if (franchise.getSquad().isEmpty()) {
                sb.append("<i>No players acquired yet</i><br/>");
            } else {
                for (Player pl : franchise.getSquad()) {
                    sb.append("• ").append(pl.getName()).append(" (").append(pl.getRole().getDisplayName()).append(") - ").append(money(pl.getFinalPrice())).append("<br/>");
                }
            }
            sb.append("</html>");
            setToolTipText(sb.toString());
        }
    }
}
