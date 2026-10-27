#!/bin/sh
# Compile and run the IPL Auction (Linux / macOS). Run from the project root.
mkdir -p out
javac -d out src/ipl/*.java && java -cp out ipl.Main
