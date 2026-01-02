import { describe, it, expect } from "vitest";
import { computeClues } from "../blueberryCore";
import { miniClueBoard } from "./fixtures";

describe("computeClues()", () => {
  it("counts 8-neighborhood berries correctly on a hand-crafted board", () => {
    const b = miniClueBoard();
    const clues = computeClues(b);

    // Around (2,2): neighbors include (1,1), (1,2), (2,1) => 3
    expect(clues[2][2]).toBe(3);

    // At (1,1) itself (a berry cell): clues still counts neighbors (not including itself)
    // Neighbors of (1,1) include (1,2) and (2,1) => 2
    expect(clues[1][1]).toBe(2);

    // At (0,0): its neighbors are (0,1),(1,0),(1,1) and (1,1) is a berry => 1
    expect(clues[0][0]).toBe(1);

    // At (0,8): berry in top-right corner; its neighbors are (0,7),(1,7),(1,8)
    // none of those are berries => 0
    expect(clues[0][8]).toBe(0);

    // At (1,8): neighbor includes (0,8) => 1
    expect(clues[1][8]).toBe(1);

    // At (0,7): neighbor includes (0,8) => 1
    expect(clues[0][7]).toBe(1);
  });
});
