import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { makePuzzle, N } from "./src/core/blueberryCore";
import type { Puzzle } from "./src/core/blueberryCore";

type PlayerCellState = -1 | 0 | 1; // -1 = marked empty, 0 = unknown, 1 = berry

export default function App() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [playerBoard, setPlayerBoard] = useState<PlayerCellState[][]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [statusOk, setStatusOk] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  function createEmptyPlayerBoard(): PlayerCellState[][] {
    return Array.from({ length: N }, () =>
      new Array<PlayerCellState>(N).fill(0),
    );
  }

  function generateNewPuzzle() {
    setIsGenerating(true);
    setStatus("");
    setStatusOk(null);
    setShowSolution(false);

    // Defer heavy generation slightly so the UI can render first
    setTimeout(() => {
      console.log("Generating puzzle...");
      const p = makePuzzle();
      console.log("Puzzle generated");
      setPuzzle(p);
      setPlayerBoard(createEmptyPlayerBoard());
      setIsGenerating(false);
    }, 0);
  }

  function handleCellPress(r: number, c: number) {
    if (!puzzle) return;
    const clue = puzzle.puzzleClues[r][c];
    if (clue !== null) return; // fixed clue, not editable
    if (showSolution) return; // don't edit while showing solution

    setStatus("");
    setStatusOk(null);

    setPlayerBoard((prev) => {
      const next = prev.map((row) => row.slice());
      const current = next[r][c];
      let nextVal: PlayerCellState;
      if (current === 0) nextVal = 1;
      else if (current === 1) nextVal = -1;
      else nextVal = 0;
      next[r][c] = nextVal;
      return next;
    });
  }

  function checkSolution() {
    if (!puzzle) return;
    const { solution } = puzzle;

    let allMatch = true;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const solBerry = solution[r][c] === 1;
        const state = playerBoard[r]?.[c] ?? 0;
        const playerBerry = state === 1;

        if (solBerry !== playerBerry) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) break;
    }

    if (allMatch) {
      setStatus("✅ Correct! Puzzle solved.");
      setStatusOk(true);
    } else {
      setStatus("❌ Not solved yet.");
      setStatusOk(false);
    }
  }

  function toggleShowSolution() {
    setShowSolution((prev) => !prev);
    setStatus("");
    setStatusOk(null);
  }

  function getCellBorderStyle(r: number, c: number) {
    const top = r === 0 ? 2 : r % 3 === 0 ? 2 : 1;
    const left = c === 0 ? 2 : c % 3 === 0 ? 2 : 1;
    const right =
      c === N - 1 ? 2 : (c + 1) % 3 === 0 ? 2 : 1;
    const bottom =
      r === N - 1 ? 2 : (r + 1) % 3 === 0 ? 2 : 1;

    return {
      borderTopWidth: top,
      borderLeftWidth: left,
      borderRightWidth: right,
      borderBottomWidth: bottom,
    };
  }

  function renderCell(r: number, c: number) {
    if (!puzzle) return null;

    const clue = puzzle.puzzleClues[r][c];
    const solutionBerry = puzzle.solution[r][c] === 1;
    const state = playerBoard[r]?.[c] ?? 0;

    let text = "";
    const cellStyles = [styles.cell, getCellBorderStyle(r, c)];

    if (showSolution) {
      if (solutionBerry) {
        text = "●";
        cellStyles.push(styles.cellSolutionBerry);
      } else if (clue !== null) {
        text = String(clue);
        cellStyles.push(styles.cellClue);
      }
    } else {
      if (clue !== null) {
        text = String(clue);
        cellStyles.push(styles.cellClue);
      } else if (state === 1) {
        text = "●";
        cellStyles.push(styles.cellPlayerBerry);
      } else if (state === -1) {
        text = "×";
        cellStyles.push(styles.cellPlayerEmpty);
      }
    }

    return (
      <Pressable
        key={`${r}-${c}`}
        style={cellStyles}
        onPress={() => handleCellPress(r, c)}
      >
        <Text style={styles.cellText}>{text}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.title}>Blueberry Trio</Text>
        <Text style={styles.subtitle}>3 berries per row, column & block</Text>

        {!puzzle && !isGenerating && (
          <Text style={styles.hint}>
            Press <Text style={styles.bold}>Generate puzzle</Text> to start.
          </Text>
        )}

        {isGenerating && (
          <View style={styles.generating}>
            <ActivityIndicator size="small" />
            <Text style={styles.generatingText}>Generating puzzle…</Text>
          </View>
        )}

        {puzzle && (
          <>
            <View style={styles.grid}>
              {Array.from({ length: N }, (_, r) => (
                <View key={r} style={styles.row}>
                  {Array.from({ length: N }, (_, c) => renderCell(r, c))}
                </View>
              ))}
            </View>

            <View style={styles.buttonsRow}>
              <Pressable
                style={styles.button}
                onPress={generateNewPuzzle}
                disabled={isGenerating}
              >
                <Text style={styles.buttonText}>New puzzle</Text>
              </Pressable>
              <Pressable
                style={styles.button}
                onPress={checkSolution}
                disabled={isGenerating}
              >
                <Text style={styles.buttonText}>Check</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.toggle}
              onPress={toggleShowSolution}
              disabled={isGenerating}
            >
              <Text style={styles.toggleText}>
                {showSolution ? "Hide solution" : "Show solution"}
              </Text>
            </Pressable>
          </>
        )}

        <Pressable
          style={[styles.buttonWide, isGenerating && styles.buttonDisabled]}
          onPress={generateNewPuzzle}
          disabled={isGenerating}
        >
          <Text style={styles.buttonText}>
            {puzzle ? "Generate another puzzle" : "Generate puzzle"}
          </Text>
        </Pressable>

        {status !== "" && (
          <Text
            style={[
              styles.status,
              statusOk === true
                ? styles.statusOk
                : statusOk === false
                ? styles.statusError
                : null,
            ]}
          >
            {status}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const CELL_SIZE = 32;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#555",
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    marginBottom: 10,
    color: "#555",
  },
  bold: {
    fontWeight: "700",
  },
  grid: {
    borderColor: "#000",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cellText: {
    fontSize: 16,
  },
  cellClue: {
    fontWeight: "600",
    color: "#333",
  },
  cellSolutionBerry: {
    backgroundColor: "#3b82f6",
  },
  cellPlayerBerry: {
    backgroundColor: "#10b981",
  },
  cellPlayerEmpty: {
    color: "#9ca3af",
  },
  buttonsRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  buttonWide: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  toggle: {
    marginBottom: 8,
  },
  toggleText: {
    color: "#2563eb",
    textDecorationLine: "underline",
  },
  status: {
    marginTop: 6,
    fontSize: 14,
  },
  statusOk: {
    color: "#16a34a",
  },
  statusError: {
    color: "#dc2626",
  },
  generating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  generatingText: {
    marginLeft: 8,
    fontSize: 14,
  },
});
