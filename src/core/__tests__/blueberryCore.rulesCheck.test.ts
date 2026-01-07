import { describe, test, expect } from "vitest";
import { N, type ClueGrid, type Puzzle } from "../blueberryCore";
import { computeViolations, type PlayerCellState } from "../rulesCheck";

function emptyPlayerBoard(fill: PlayerCellState = 0): PlayerCellState[][] {
  return Array.from({ length: N }, () => new Array<PlayerCellState>(N).fill(fill));
}

function makePuzzleWithClues(puzzleClues: ClueGrid): Puzzle {
  // computeViolations only needs puzzleClues; solution is irrelevant here.
  const solution = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  return { solution, puzzleClues };
}

function emptyClueGrid(): ClueGrid {
  return Array.from({ length: N }, () => new Array<number | null>(N).fill(null));
}

describe("rulesCheck.computeViolations", () => {
  describe("row rule (exactly 3 berries feasible)", () => {
    test("violates if row cannot reach 3 because all remaining are marked empty (-1)", () => {
      const board = emptyPlayerBoard(-1);
      // Row 0: 2 berries, rest empty => berries=2 unknown=0 => impossible => violation
      board[0][0] = 1;
      board[0][1] = 1;

      const puzzle = makePuzzleWithClues(emptyClueGrid());
      const v = computeViolations(board, puzzle);

      expect(v.row[0]).toBe(true);
    });

    test("does NOT violate if row can still reach 3 thanks to unknown cells (0)", () => {
      const board = emptyPlayerBoard(-1);
      // Row 0: 2 berries, 1 unknown, rest empty => berries=2 unknown=1 => feasible => no violation
      board[0][0] = 1;
      board[0][1] = 1;
      board[0][2] = 0;

      const puzzle = makePuzzleWithClues(emptyClueGrid());
      const v = computeViolations(board, puzzle);

      expect(v.row[0]).toBe(false);
    });

    test("violates if row already has more than 3 berries", () => {
      const board = emptyPlayerBoard(0);
      board[0][0] = 1;
      board[0][1] = 1;
      board[0][2] = 1;
      board[0][3] = 1; // 4 berries

      const puzzle = makePuzzleWithClues(emptyClueGrid());
      const v = computeViolations(board, puzzle);

      expect(v.row[0]).toBe(true);
    });

    test("violates if row fully decided (no unknowns) but berries != 3", () => {
      const board = emptyPlayerBoard(-1);
      // fully decided: no unknowns, berries=3 OK -> not violated
      board[0][0] = 1;
      board[0][1] = 1;
      board[0][2] = 1;

      // another row fully decided but wrong
      board[1][0] = 1; // berries=1, unknown=0 => violation
      // rest of row 1 already -1

      const puzzle = makePuzzleWithClues(emptyClueGrid());
      const v = computeViolations(board, puzzle);

      expect(v.row[0]).toBe(false);
      expect(v.row[1]).toBe(true);
    });
  });

  describe("column rule", () => {
    test("violates if column cannot reach 3 (too many empties)", () => {
      const board = emptyPlayerBoard(-1);
      // Col 0: 2 berries, everything else empty => berries=2 unknown=0 => violation
      board[0][0] = 1;
      board[1][0] = 1;

      const puzzle = makePuzzleWithClues(emptyClueGrid());
      const v = computeViolations(board, puzzle);

      expect(v.col[0]).toBe(true);
    });

    test("does NOT violate if column can still reach 3 (has unknown)", () => {
      const board = emptyPlayerBoard(-1);
      board[0][0] = 1;
      board[1][0] = 1;
      board[2][0] = 0; // unknown

      const puzzle = makePuzzleWithClues(emptyClueGrid());
      const v = computeViolations(board, puzzle);

      expect(v.col[0]).toBe(false);
    });
  });

  describe("block rule (3x3)", () => {
    test("violates if 3x3 block cannot reach 3 due to all empties", () => {
      const board = emptyPlayerBoard(-1);

      // Top-left block (br=0, bc=0): put 2 berries, rest empty => impossible => violation
      board[0][0] = 1;
      board[0][1] = 1;

      const puzzle = makePuzzleWithClues(emptyClueGrid());
      const v = computeViolations(board, puzzle);

      expect(v.block[0]).toBe(true); // blockIndex = 0*3 + 0
    });

    test("does NOT violate if 3x3 block can still reach 3 (has unknown)", () => {
      const board = emptyPlayerBoard(-1);

      board[0][0] = 1;
      board[0][1] = 1;
      board[0][2] = 0; // unknown inside block

      const puzzle = makePuzzleWithClues(emptyClueGrid());
      const v = computeViolations(board, puzzle);

      expect(v.block[0]).toBe(false);
    });

    test("violates if 3x3 block has more than 3 berries", () => {
      const board = emptyPlayerBoard(0);

      // Put 4 berries in top-left block
      board[0][0] = 1;
      board[0][1] = 1;
      board[0][2] = 1;
      board[1][0] = 1;

      const puzzle = makePuzzleWithClues(emptyClueGrid());
      const v = computeViolations(board, puzzle);

      expect(v.block[0]).toBe(true);
    });
  });

  describe("clue-area feasibility (minesweeper-style)", () => {
    test("marks clue cell violated when berries+unknown < clue (too many empties around)", () => {
      const clues = emptyClueGrid();
      clues[4][4] = 3;

      const board = emptyPlayerBoard(-1);
      // Around (4,4): make 2 berries, rest empty => unknown=0 -> berries+unknown < 3 => violation
      board[3][3] = 1;
      board[3][4] = 1;
      // everything else around stays -1

      const puzzle = makePuzzleWithClues(clues);
      const v = computeViolations(board, puzzle);

      expect(v.clueArea[4][4]).toBe(true);
    });

    test("marks clue cell violated when berries > clue", () => {
      const clues = emptyClueGrid();
      clues[4][4] = 2;

      const board = emptyPlayerBoard(0);
      // 3 berries around a '2' => violation
      board[3][3] = 1;
      board[3][4] = 1;
      board[3][5] = 1;

      const puzzle = makePuzzleWithClues(clues);
      const v = computeViolations(board, puzzle);

      expect(v.clueArea[4][4]).toBe(true);
    });

    test("does NOT mark violated when clue is still feasible (berries <= clue <= berries+unknown)", () => {
      const clues = emptyClueGrid();
      clues[4][4] = 3;

      const board = emptyPlayerBoard(-1);
      // 2 berries + 1 unknown + rest empty => feasible (2 <= 3 <= 3)
      board[3][3] = 1;
      board[3][4] = 1;
      board[3][5] = 0; // unknown

      const puzzle = makePuzzleWithClues(clues);
      const v = computeViolations(board, puzzle);

      expect(v.clueArea[4][4]).toBe(false);
    });

    test("clueArea marks only the clue cell (neighbors remain false unless they are clues)", () => {
      const clues = emptyClueGrid();
      clues[4][4] = 1;

      const board = emptyPlayerBoard(0);
      board[3][3] = 1;

      const puzzle = makePuzzleWithClues(clues);
      const v = computeViolations(board, puzzle);

      expect(v.clueArea[4][4]).toBe(false);

      // neighbors aren't clues => should stay false
      expect(v.clueArea[3][3]).toBe(false);
      expect(v.clueArea[4][3]).toBe(false);
      expect(v.clueArea[5][5]).toBe(false);
    });
  });
});
