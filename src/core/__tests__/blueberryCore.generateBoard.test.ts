import { describe, it, expect } from "vitest";
import { N, generateBoard } from "../blueberryCore";
import {
  countRow,
  countCol,
  countBlock,
  totalBerries,
} from "./fixtures";

describe("generateBoard()", () => {
  it("returns a 9x9 board with only 0/1 values", () => {
    const b = generateBoard();
    expect(b).toHaveLength(N);
    for (const row of b) {
      expect(row).toHaveLength(N);
      for (const v of row) {
        expect([0, 1]).toContain(v);
      }
    }
  });

  it("has exactly 3 berries in each row", () => {
    const b = generateBoard();
    for (let r = 0; r < N; r++) {
      expect(countRow(b, r)).toBe(3);
    }
  });

  it("has exactly 3 berries in each column", () => {
    const b = generateBoard();
    for (let c = 0; c < N; c++) {
      expect(countCol(b, c)).toBe(3);
    }
  });

  it("has exactly 3 berries in each 3x3 block", () => {
    const b = generateBoard();
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        expect(countBlock(b, br, bc)).toBe(3);
      }
    }
  });

  it("has exactly 27 berries total", () => {
    const b = generateBoard();
    expect(totalBerries(b)).toBe(27);
  });
});
