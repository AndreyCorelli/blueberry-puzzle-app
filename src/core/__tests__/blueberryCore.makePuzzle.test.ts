import { describe, it, expect } from "vitest";
import { makePuzzle, solveCount, computeClues, N } from "../blueberryCore";
import { cluesToMap, countClues } from "./fixtures";

describe("makePuzzle()", () => {
  it("returns a puzzle whose solution is valid & matches all shown clues", () => {
    const p = makePuzzle({ dense: false });

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

  it("dense:true enforces minimum clue density constraints", () => {
    const p = makePuzzle({ dense: true });
  
    // 1) At least 22 clues
    let total = 0;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (p.puzzleClues[r][c] !== null) total++;
      }
    }
    expect(total).toBeGreaterThanOrEqual(22);
  
    // 2) At least one clue in each 3x3 block
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
});
