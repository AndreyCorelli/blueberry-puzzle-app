export const NEIGHBOR_DIRS_8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
] as const;

export type PlayerCellState = -1 | 0 | 1; // -1 = marked empty, 0 = unknown, 1 = berry
export type ClueGrid = (number | null)[][];

export type ClueAreaResult = {
  clueArea: boolean[][];
  violatedClues: Array<{ r: number; c: number; clue: number; berries: number; unknown: number }>;
};

/**
 * Returns a boolean grid "clueArea" where true means:
 * - the cell is a violated clue OR
 * - it is a neighbor of a violated clue
 *
 * Violation rule for a clue value v:
 *  - berries > v  -> violated
 *  - berries + unknown < v -> violated (not enough capacity left)
 *
 * Note:
 *  - unknown = cells with state 0 only
 *  - state -1 (marked empty) reduces capacity (i.e. it's NOT unknown)
 */
export function computeClueAreaViolations(
  playerBoard: PlayerCellState[][],
  puzzleClues: ClueGrid,
): ClueAreaResult {
  const n = puzzleClues.length;
  const clueArea: boolean[][] = Array.from({ length: n }, () =>
    new Array<boolean>(n).fill(false),
  );
  const violatedClues: ClueAreaResult["violatedClues"] = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const clueVal = puzzleClues[r][c];
      if (clueVal === null) continue;

      let berries = 0;
      let unknown = 0;

      for (const [dr, dc] of NEIGHBOR_DIRS_8) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;

        const v = playerBoard[nr]?.[nc] ?? 0;
        if (v === 1) berries++;
        else if (v === 0) unknown++; // IMPORTANT: -1 is NOT unknown
      }

      const violated = berries > clueVal || berries + unknown < clueVal;

      if (violated) {
        violatedClues.push({ r, c, clue: clueVal, berries, unknown });

        // highlight clue itself
        clueArea[r][c] = true;

        // highlight its neighbors
        for (const [dr, dc] of NEIGHBOR_DIRS_8) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
          clueArea[nr][nc] = true;
        }
      }
    }
  }

  return { clueArea, violatedClues };
}
