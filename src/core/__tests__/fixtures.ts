import { N, type Board, type ClueGrid } from "../blueberryCore";

export function emptyBoard(): Board {
  return Array.from({ length: N }, () => new Array<number>(N).fill(0));
}

export function cloneBoard(b: Board): Board {
  return b.map((row) => row.slice());
}

export function countRow(b: Board, r: number): number {
  return b[r].reduce((a, v) => a + v, 0);
}

export function countCol(b: Board, c: number): number {
  let s = 0;
  for (let r = 0; r < N; r++) s += b[r][c];
  return s;
}

export function countBlock(b: Board, br: number, bc: number): number {
  let s = 0;
  for (let r = br * 3; r < br * 3 + 3; r++) {
    for (let c = bc * 3; c < bc * 3 + 3; c++) {
      s += b[r][c];
    }
  }
  return s;
}

export function totalBerries(b: Board): number {
  let s = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) s += b[r][c];
  }
  return s;
}

/**
 * Build a clues map in the exact format solveCount expects: key "r,c" -> clue number
 */
export function cluesToMap(puzzleClues: ClueGrid): Map<string, number> {
  const m = new Map<string, number>();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = puzzleClues[r][c];
      if (v !== null) m.set(`${r},${c}`, v);
    }
  }
  return m;
}

/**
 * Count how many clues are present (non-null) in a puzzle clue grid.
 */
export function countClues(puzzleClues: ClueGrid): number {
  let cnt = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (puzzleClues[r][c] !== null) cnt++;
    }
  }
  return cnt;
}

/**
 * A tiny hand-crafted board with a few berries, to test computeClues.
 * (Not necessarily satisfying the "3 per row/col/block" constraints — that's fine for clue tests.)
 */
export function miniClueBoard(): Board {
  const b = emptyBoard();
  // Place a few berries in easy-to-reason positions
  // (1,1), (1,2), (2,1) around (2,2) etc.
  b[1][1] = 1;
  b[1][2] = 1;
  b[2][1] = 1;

  // one berry in corner neighborhood
  b[0][8] = 1;

  return b;
}
