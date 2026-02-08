import { describe, it, expect } from "vitest";
import { makePuzzle, solveCount, computeClues, N } from "../blueberryCore";
import { cluesToMap, countClues } from "./fixtures";

describe("makePuzzle()", () => {
  it("returns a puzzle whose solution is valid & matches all shown clues", () => {
    const p = makePuzzle({ extraClues: 0, nonEmptyBlocks: false });

    // Check solution has correct row/col/block totals by indirect means:
    // full clue set must produce exactly 1 solution when used as constraints.
    // (This is a strong end-to-end invariant.)
    const clueMap = cluesToMap(p.puzzleClues);
    expect(solveCount(clueMap, 2)).toBe(1);

    // Every shown clue must match the solution's computed clue number,
    // and no clue can be on a berry cell.
    const computed = computeClues(p.solution);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = p.puzzleClues[r][c];
        if (v === null) continue;
        expect(p.solution[r][c]).toBe(0);
        expect(v).toBe(computed[r][c]);
      }
    }
  });

  it("nonEmptyBlocks:true enforces at least one clue per 3x3 block", () => {
  const p = makePuzzle({ nonEmptyBlocks: true });

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      let hasClue = false;
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) {
          if (p.puzzleClues[r][c] !== null) {
            hasClue = true;
            break;
          }
        }
        if (hasClue) break;
      }
      expect(hasClue).toBe(true);
    }
  }
});

  it("extraClues adds at least the requested number of extra clues (same RNG)", () => {
    function mulberry32(seed: number): () => number {
      let t = seed >>> 0;
      return () => {
        t += 0x6d2b79f5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
    }

    const countClues = (puz: Puzzle) => {
      let total = 0;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (puz.puzzleClues[r][c] !== null) total++;
        }
      }
      return total;
    };

    const seed = 12345;

    const base = makePuzzle({
      extraClues: 0,
      nonEmptyBlocks: false,
      rng: mulberry32(seed),
    });

    const extra = makePuzzle({
      extraClues: 3,
      nonEmptyBlocks: false,
      rng: mulberry32(seed),
    });

    expect(countClues(extra)).toBeGreaterThanOrEqual(countClues(base) + 3);
  });  
});
