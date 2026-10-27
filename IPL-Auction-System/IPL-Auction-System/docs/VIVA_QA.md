# Java Viva Questions and Answers

## A. About this project

**1. What is your project?**
An IPL Player Auction Management System in Java Swing. Four franchises bid for 100 players read from a CSV file; each must build a squad of exactly 11 players within a ₹100 Crore purse.

**2. Why did you keep rules in `Auction` and `Franchise` and not in the GUI?**
So the logic is independent of the interface (separation of concerns). The same engine is used by the GUI, `ConsoleDemo` and the tests.

**3. How do you stop a franchise from spending all its money early?**
`Franchise.getBidBlockReason()` forces it to keep ₹0.50 Cr (cheapest base price) for every empty squad slot after the purchase.

**4. How do you guarantee the minimum 4 Batters / 3 Bowlers / 2 All-Rounders / 1 Wicketkeeper?**
Before every bid we compute the deficit (players still needed per role after buying this player). If the deficit is bigger than the remaining slots, the bid is blocked.

**5. What happens if a player gets no bids?**
The auctioneer clicks Skip Player; he is marked unsold and added to the unsold list. If squads are still incomplete when the queue ends, unsold players come back in a second round.

**6. How is the CSV validated?**
`PlayerDatabase` checks the header, the number of columns, id format and uniqueness, name uniqueness, age, role, base price and finally the totals (100 players; 35/30/20/15). Errors include the line number.

**7. Why `double` for money – isn't it inaccurate?**
Doubles are inexact for values like 0.1, but all prices here are multiples of 0.50 which are exactly representable, so there are no rounding errors. (`BigDecimal` would be the choice for real money.)

**8. Where did you use file handling?**
Reading `players.csv` (`BufferedReader`), writing `auction_history.csv`, `players_after_auction.csv` and `final_report.txt` (`BufferedWriter`, `Files.writeString`).

**9. Which collections did you use and why?**
`ArrayList` for squads and history (ordered, indexed), `LinkedList` as the queue of waiting players, `LinkedHashMap` for franchises by code (fast lookup, keeps order), `EnumMap` for role counts (efficient map keyed by an enum).

**10. Which design principle does `InvalidBidException extends AuctionException` show?**
Inheritance: callers can catch the general `AuctionException` or the specific `InvalidBidException`.

## B. Core Java / OOP

**11. What are the four pillars of OOP?** Encapsulation, inheritance, polymorphism, abstraction.

**12. What is encapsulation? Where is it used here?**
Hiding fields (`private`) and exposing them through methods. `Player` and `Franchise` keep their data private and change it only through validated methods.

**13. What is a constructor? Can it be overloaded?**
A special method that initialises an object, same name as the class, no return type. Yes, constructors can be overloaded.

**14. What is an enum and why use it for roles?**
A fixed set of named constants (type-safe). It prevents invalid roles such as "Spinner" in the code.

**15. Difference between `ArrayList` and `LinkedList`?**
ArrayList uses an array (fast random access, slow insert in the middle); LinkedList uses nodes (fast add/remove at ends, slow `get(i)`).

**16. Difference between `HashMap` and `LinkedHashMap`?**
HashMap has no order; LinkedHashMap keeps insertion order.

**17. Checked vs unchecked exceptions?**
Checked exceptions (subclasses of `Exception` except `RuntimeException`) must be caught or declared; unchecked (`RuntimeException`) need not. Our `AuctionException` is checked, so the compiler forces the GUI to handle it.

**18. What does `try-with-resources` do?**
Automatically closes resources (like `BufferedReader`) at the end of the block, even when an exception occurs.

**19. `final` keyword?**
Final variable = constant after assignment; final method = cannot be overridden; final class = cannot be extended. Example: `private final String id` in `Player`.

**20. `static` keyword?**
A static member belongs to the class, not to objects, e.g. `Franchise.STARTING_PURSE`.

**21. Method overloading vs overriding?**
Overloading: same name, different parameters (compile time). Overriding: subclass replaces a superclass method (runtime), e.g. `toString()`.

**22. What is polymorphism here?**
`toString()` is overridden in several classes; `AuctionException` can hold an `InvalidBidException` object.

**23. What is composition? Example?**
"Has-a" relationship. `Auction` has franchises, `Franchise` has players.

**24. Abstract class vs interface?**
Abstract class can have state and constructors, single inheritance; interface defines a contract, a class can implement many.

**25. What is the use of `this`?**
Refers to the current object; used to separate fields from parameters (`this.name = name`).

## C. Swing

**26. What is Swing? Difference from AWT?**
Swing is Java's GUI toolkit; components are lightweight (drawn by Java), AWT components use native OS widgets.

**27. What is an event listener? How do buttons work?**
An object that reacts to events. `button.addActionListener(e -> onSell())` runs `onSell()` when the button is clicked (lambda expression).

**28. Why `SwingUtilities.invokeLater`?**
Swing is not thread-safe; all GUI work must run on the Event Dispatch Thread.

**29. What is a layout manager? Which did you use?**
It positions components automatically. `BorderLayout`, `GridLayout` and `FlowLayout`.

**30. What does `javax.swing.Timer` do in your project?**
Runs the Auto Auction step every 350 ms on the Event Dispatch Thread, so the GUI stays responsive.

**31. What is `JOptionPane`?**
A ready-made dialog class used for warnings, confirmation and messages.

**32. What is a model–view separation in JTable?**
`DefaultTableModel` stores data, `JTable` displays it.

**33. What is an inner class and why use it?**
A class defined inside another class. `RoundedPanel`, `StyledButton` and `FranchisePanel` are used only by `AuctionGUI`, so they are nested there.
