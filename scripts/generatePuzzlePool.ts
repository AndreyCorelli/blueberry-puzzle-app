#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import { makePuzzle, N } from "../src/core/blueberryCore";

// ---------- CLI parsing ----------

type Args = {
  count: number;
  outPath: string;
  sort: boolean;

  // NEW generator knobs
  extraClues: number;      // -x N (>= 0)
  nonEmptyBlocks: boolean; // -ne (ensure every 3x3 block has >=1 clue)
};

function parseArgs(argv: string[]): Args {
  let count = 1;
  let outPath = "assets/pool/puzzlePool.v1.json";
  let sort = false;

  // new
  let extraClues = 0;
  let nonEmptyBlocks = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--count" || a === "-n") {
      const v = argv[i + 1];
      if (!v) throw new Error("Missing value for --count");
      count = Number(v);
      if (!Number.isFinite(count) || count <= 0) {
        throw new Error(`Invalid --count: ${v}`);
      }
      i++;
    } else if (a === "--out" || a === "-o") {
      const v = argv[i + 1];
      if (!v) throw new Error("Missing value for --out");
      outPath = v;
      i++;
    } else if (a === "--sort") {
      sort = true;
    } else if (a === "-x" || a === "--extra-clues") {
      const v = argv[i + 1];
      if (!v) throw new Error("Missing value for -x/--extra-clues");
      extraClues = Number(v);
      if (!Number.isFinite(extraClues) || !Number.isInteger(extraClues) || extraClues < 0) {
        throw new Error(`Invalid -x/--extra-clues: ${v} (must be integer >= 0)`);
      }
      i++;
    } else if (a === "-ne" || a === "--non-empty-blocks") {
      nonEmptyBlocks = true;
    } else if (a === "--help" || a === "-h") {
      printHelpAndExit();
    }
  }

  return { count, outPath, sort, extraClues, nonEmptyBlocks };
}

function printHelpAndExit(): never {
  console.log(`
Generate and maintain a pool of Blueberry puzzles.

Generate / append:
  npm run pool:gen -- --count 300 -x 5 [-ne] [--out <path>]

Sort existing pool in-place:
  npm run pool:sort -- [--out <path>]

Options:
  --count, -n               Number of puzzles to generate (required for generation)
  -x, --extra-clues <N>     Extra clues to add after minimization (integer >= 0, default: 0)
  -ne, --non-empty-blocks   Ensure each 3x3 block has >= 1 clue; if empty, add a random clue in it
  --out, -o                 Output JSON file path (default: assets/pool/puzzlePool.v1.json)
  --sort                    Sort pool by score and save back

Notes:
  -x controls how much easier the puzzle is (more clues = easier).
  -ne guarantees no completely empty 3x3 clue-blocks (useful for early onboarding).
`);
  process.exit(0);
}

// ---------- Pool format ----------

type PuzzleEntryV1 = {
  genSeconds: number;   // duration to generate (rough complexity proxy)
  humanComplex: number; // heuristic score, optional usage
  clues81: number[];    // length 81; -1 = empty cell; 0..8 = clue value
};

type PuzzlePoolV1 = {
  version: 1;
  N: number; // 9
  generatedAtUtc: string;

  // NEW metadata (optional, but super helpful)
  extraClues: number;
  nonEmptyBlocks: boolean;

  puzzles: PuzzleEntryV1[];
};

// ---------- Encoding helpers ----------

function encodeCluesTo81(puzzleClues: (number | null)[][]): number[] {
  const out: number[] = new Array(N * N);
  let k = 0;
  for (let r = 0; r < N; r++) {
    const row = puzzleClues[r];
    for (let c = 0; c < N; c++) {
      const v = row[c];
      out[k++] = v === null ? -1 : v;
    }
  }
  return out;
}

function validateClues81(arr: number[]): void {
  if (arr.length !== N * N) throw new Error(`clues81 must be length ${N * N}`);
  for (const v of arr) {
    if (v !== -1 && !(Number.isInteger(v) && v >= 0 && v <= 8)) {
      throw new Error(`Invalid clues81 value: ${v}`);
    }
  }
}

// ---------- File IO ----------

function ensureDirForFile(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function readPoolIfExists(filePath: string, meta: { extraClues: number; nonEmptyBlocks: boolean }): PuzzlePoolV1 {
  if (!fs.existsSync(filePath)) {
    return {
      version: 1,
      N,
      generatedAtUtc: new Date().toISOString(),
      extraClues: meta.extraClues,
      nonEmptyBlocks: meta.nonEmptyBlocks,
      puzzles: [],
    };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as PuzzlePoolV1;

  // minimal sanity checks
  if (parsed.version !== 1) throw new Error(`Unsupported pool version: ${parsed.version}`);
  if (parsed.N !== N) throw new Error(`Pool N mismatch: file=${parsed.N}, code=${N}`);
  if (!Array.isArray(parsed.puzzles)) throw new Error("Pool puzzles must be an array");

  // If file meta differs from CLI meta, we keep the file puzzles but overwrite meta to reflect current settings.
  parsed.extraClues = meta.extraClues;
  parsed.nonEmptyBlocks = meta.nonEmptyBlocks;

  return parsed;
}

function writePoolAtomic(filePath: string, pool: PuzzlePoolV1): void {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(pool, null, 2), "utf8");
  fs.renameSync(tmpPath, filePath);
}

// ---------- Main ----------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, "..");

  const outFile = path.resolve(projectRoot, args.outPath);
  ensureDirForFile(outFile);

  const pool = readPoolIfExists(outFile, {
    extraClues: args.extraClues,
    nonEmptyBlocks: args.nonEmptyBlocks,
  });

  if (args.sort) {
    // eslint-disable-next-line no-console
    console.log(`Sorting pool in: ${args.outPath}`);
    // eslint-disable-next-line no-console
    console.log(`Pool size: ${pool.puzzles.length}`);

    sortPoolInPlace(pool);
    pool.generatedAtUtc = new Date().toISOString();
    writePoolAtomic(outFile, pool);

    // eslint-disable-next-line no-console
    console.log("Done.");
    return;
  }

  // Handle Ctrl+C gracefully: write what we have so far.
  let interrupted = false;
  process.on("SIGINT", () => {
    interrupted = true;
    // eslint-disable-next-line no-console
    console.log("\nSIGINT received. Saving progress and exiting...");
  });

  // eslint-disable-next-line no-console
  console.log(`Appending ${args.count} puzzle(s) to: ${args.outPath}`);
  // eslint-disable-next-line no-console
  console.log(`Mode: extraClues=${args.extraClues}, nonEmptyBlocks=${args.nonEmptyBlocks ? "ON" : "OFF"}`);
  // eslint-disable-next-line no-console
  console.log(`Already in pool: ${pool.puzzles.length}`);

  for (let i = 0; i < args.count; i++) {
    if (interrupted) break;

    const t0 = performance.now();
    const p = makePuzzle({
      extraClues: args.extraClues,
      nonEmptyBlocks: args.nonEmptyBlocks,
    });
    const t1 = performance.now();

    const genSeconds = (t1 - t0) / 1000;
    const clues81 = encodeCluesTo81(p.puzzleClues);
    validateClues81(clues81);

    // very rough heuristic: fewer extra clues => harder
    const humanComplex = 200 + Math.max(0, 20 - args.extraClues) * 10 + (args.nonEmptyBlocks ? -15 : 0);

    const entry: PuzzleEntryV1 = {
      genSeconds: Number(genSeconds.toFixed(3)),
      humanComplex,
      clues81,
    };

    pool.puzzles.push(entry);

    // write incrementally so you don't lose progress on long runs
    pool.generatedAtUtc = new Date().toISOString();
    pool.extraClues = args.extraClues;
    pool.nonEmptyBlocks = args.nonEmptyBlocks;
    writePoolAtomic(outFile, pool);

    // eslint-disable-next-line no-console
    console.log(`#${pool.puzzles.length} generated in ${entry.genSeconds}s (this run ${i + 1}/${args.count})`);
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Pool size: ${pool.puzzles.length}`);
}

function score(entry: { humanComplex: number; genSeconds: number }): number {
  // Sort criteria:
  // humanComplex + 100 * sqrt(genSeconds)
  return entry.humanComplex + 100 * Math.sqrt(Math.max(0, entry.genSeconds));
}

function sortPoolInPlace(pool: PuzzlePoolV1): void {
  // stable sort: keep original order for equal scores
  const withIndex = pool.puzzles.map((p, i) => ({ p, i, s: score(p) }));
  withIndex.sort((a, b) => a.s - b.s || a.i - b.i);
  pool.puzzles = withIndex.map((x) => x.p);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
