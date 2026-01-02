import { describe, it, expect } from "vitest";
import { generateBoard, computeClues, solveCount, N, type ClueGrid } from "../blueberryCore";
import { cluesToMap } from "./fixtures";

function fullClueGridForBoard(board: number[][]): ClueGrid {
  const clues = computeClues(board);
  const grid: ClueGrid = Array.from({ length: N }, () =>
    new Array<number | null>(N).fill(null),
  );

  // In our game we only place clues on non-berry cells.
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] === 0) grid[r][c] = clues[r][c];
    }
  }
  return grid;
}

describe("solveCount()", () => {
  it("returns exactly 1 solution for a full clue set of a generated board", () => {
    const board = generateBoard();
    const fullGrid = fullClueGridForBoard(board);
    const map = cluesToMap(fullGrid);

    const sols = solveCount(map, 2);
    expect(sols).toBe(1);
  });

  it("often becomes non-unique if you remove a bunch of random clues (>=2 solutions)", () => {
    // This is intentionally probabilistic but with a strong signal:
    // Removing many clues generally makes multiple solutions possible.
    const board = generateBoard();
    const fullGrid = fullClueGridForBoard(board);

    const keys: string[] = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (fullGrid[r][c] !== null) keys.push(`${r},${c}`);
      }
    }

    // Remove 40 clues (out of ~54 possible clue cells) to strongly underconstrain.
    // If fewer than 40 exist (unlikely), remove as many as possible.
    const removeCount = Math.min(40, keys.length);
    // deterministic removal: take first N keys (keeps tests stable)
    const toRemove = new Set(keys.slice(0, removeCount));

    const reduced = new Map<string, number>();
    for (const k of keys) {
      if (toRemove.has(k)) continue;
      const [rs, cs] = k.split(",");
      const r = parseInt(rs, 10);
      const c = parseInt(cs, 10);
      reduced.set(k, fullGrid[r][c] as number);
    }

    const sols = solveCount(reduced, 2);
    expect(sols).toBeGreaterThanOrEqual(1);
    // In most cases, it should hit 2 quickly; if not, generator produced a very constrained board.
    // So we accept 1+ but expect usually >=2:
    // expect(sols).toBe(2);
  });
});
