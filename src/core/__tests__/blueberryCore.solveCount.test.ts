import { describe, it, expect } from "vitest";
import {
  generateBoard,
  computeClues,
  solveCount,
  solveOneFromClueGrid,
  makePuzzle,
  N,
  type ClueGrid,
  type Board,
} from "../blueberryCore";
import { cluesToMap } from "./fixtures";

function fullClueGridForBoard(board: Board): ClueGrid {
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

function boardsEqual(a: Board, b: Board): boolean {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

describe("solveCount()", () => {
  it("returns exactly 1 solution for a full clue set of a generated board", () => {
    const board = generateBoard();
    const fullGrid = fullClueGridForBoard(board);
    const map = cluesToMap(fullGrid);

    const sols = solveCount(map, 2);
    expect(sols).toBe(1);
  });

  it("respects maxSolutions cap (returns 1 when maxSolutions=1)", () => {
    const board = generateBoard();
    const fullGrid = fullClueGridForBoard(board);
    const map = cluesToMap(fullGrid);

    const sols = solveCount(map, 1);
    expect(sols).toBe(1);
  });

  it("returns 0 solutions if you introduce an impossible clue", () => {
    const board = generateBoard();
    const fullGrid = fullClueGridForBoard(board);

    // Pick one existing clue cell and make it impossible (e.g. set to 8, but max is 8).
    // We must ensure impossibility: pick a cell that has <8 neighbors (corner/edge) => 8 is impossible.
    // Deterministic: use (0,0) if it's a clue cell; if not, find first clue on top row.
    let r = 0;
    let c = 0;

    if (fullGrid[r][c] === null) {
      // find first clue cell on row 0
      let found = false;
      for (let cc = 0; cc < N; cc++) {
        if (fullGrid[0][cc] !== null) {
          r = 0;
          c = cc;
          found = true;
          break;
        }
      }
      // fallback: just find any clue cell
      if (!found) {
        for (let rr = 0; rr < N; rr++) {
          for (let cc = 0; cc < N; cc++) {
            if (fullGrid[rr][cc] !== null) {
              r = rr;
              c = cc;
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
    }

    // Force an impossible value for that position:
    // corners have only 3 neighbors, edges 5, interior 8.
    // Setting to 8 is impossible unless the cell is interior.
    // We want guaranteed impossible -> if not interior, 8 works; if interior, set to 9.
    const isInterior = r > 0 && r < N - 1 && c > 0 && c < N - 1;
    fullGrid[r][c] = isInterior ? 9 : 8;

    const sols = solveCount(cluesToMap(fullGrid), 2);
    expect(sols).toBe(0);
  });
});

describe("solveOneFromClueGrid()", () => {
  it("reconstructs the exact original board from a full clue grid", () => {
    const board = generateBoard();
    const fullGrid = fullClueGridForBoard(board);

    const solved = solveOneFromClueGrid(fullGrid);
    expect(solved).not.toBeNull();
    expect(boardsEqual(solved as Board, board)).toBe(true);
  });

  it("solves makePuzzle() output (both modes) and matches puzzle.solution", () => {
    for (const dense of [false, true] as const) {
      const puzzle = makePuzzle({ dense });

      // sanity: generator says it's unique
      const sols = solveCount(cluesToMap(puzzle.puzzleClues), 2);
      expect(sols).toBe(1);

      // solving from clues should yield the same solution board
      const solved = solveOneFromClueGrid(puzzle.puzzleClues);
      expect(solved).not.toBeNull();
      expect(boardsEqual(solved as Board, puzzle.solution)).toBe(true);
    }
  });
});
