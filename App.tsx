import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
  StyleProp,
  TextStyle,
  ViewStyle,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { makePuzzle, N, solveOneFromClueGrid } from "./src/core/blueberryCore";
import type { Puzzle } from "./src/core/blueberryCore";
import {
  scheduleSave,
  clearSavedGame,
  loadPoolProgress,
  getNextNotLoadedIndex,
  getRandomNotLoadedIndex,
  markPoolIndexLoaded,
  markPoolIndexSolved,
  resetPoolProgress,
  loadSavedGame,
} from "./src/core/gameSave";
import { computeViolations } from "./src/core/rulesCheck";

import type { PuzzlePoolV1, PoolId, PuzzleSource } from "./src/core/gameSave";
import type { PlayerCellState, Violations } from "./src/core/rulesCheck";

import HelpScreen from "./src/screens/HelpScreen";
import {
  initI18n,
  isSupportedLang,
  setAppLanguage,
  resetToSystemLanguage,
  getCurrentLanguage,
  type SupportedLang,
  I18N_STORAGE_KEY_LANGUAGE,
} from "./src/i18n";

initI18n();

// Pools JSON are bundled into the app
const RAW_POOLS: Record<PoolId, any> = {
  easy: require("./assets/pool/puzzlePool.easy.v1.json"),
  medium: require("./assets/pool/puzzlePool.medium.v1.json"),
  hard: require("./assets/pool/puzzlePool.hard.v1.json"),
};

function isInt(x: unknown): x is number {
  return typeof x === "number" && Number.isInteger(x);
}

function validatePoolOrThrow(x: unknown): PuzzlePoolV1 {
  if (!x || typeof x !== "object") throw new Error("Pool JSON is not an object");
  const o = x as any;

  if (o.version !== 1) throw new Error(`Unsupported pool version: ${String(o.version)}`);
  if (!isInt(o.N) || o.N !== N) throw new Error(`Pool N mismatch: file=${String(o.N)} code=${N}`);
  if (typeof o.generatedAtUtc !== "string") throw new Error("Pool generatedAtUtc missing/invalid");

  if (!Array.isArray(o.puzzles)) throw new Error("Pool puzzles must be an array");
  if (o.puzzles.length === 0) throw new Error("Pool puzzles is empty");

  for (let i = 0; i < o.puzzles.length; i++) {
    const p = o.puzzles[i];
    if (!p || typeof p !== "object") throw new Error(`Puzzle[${i}] is not an object`);
    if (typeof p.genSeconds !== "number" || !Number.isFinite(p.genSeconds) || p.genSeconds < 0) {
      throw new Error(`Puzzle[${i}].genSeconds invalid`);
    }
    if (typeof p.humanComplex !== "number" || !Number.isFinite(p.humanComplex)) {
      throw new Error(`Puzzle[${i}].humanComplex invalid`);
    }
    if (!Array.isArray(p.clues81) || p.clues81.length !== N * N) {
      throw new Error(`Puzzle[${i}].clues81 must be length ${N * N}`);
    }
    for (const v of p.clues81) {
      if (!isInt(v) || (v !== -1 && (v < 0 || v > 8))) {
        throw new Error(`Puzzle[${i}].clues81 contains invalid value: ${String(v)}`);
      }
    }
  }

  return o as PuzzlePoolV1;
}

function decodeClues81ToGrid(clues81: number[]): (number | null)[][] {
  if (clues81.length !== N * N) {
    throw new Error(`clues81 length mismatch: got ${clues81.length}, expected ${N * N}`);
  }
  const grid: (number | null)[][] = Array.from({ length: N }, () =>
    new Array<number | null>(N).fill(null),
  );
  let k = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = clues81[k++];
      grid[r][c] = v === -1 ? null : v;
    }
  }
  return grid;
}

function createEmptyPlayerBoard(): PlayerCellState[][] {
  return Array.from({ length: N }, () => new Array<PlayerCellState>(N).fill(0));
}

function getResponsiveCellSize(): number {
  const { width, height } = Dimensions.get("window");
  const isTablet = Math.min(width, height) >= 600;

  if (isTablet) {
    // On tablets, use vertical space efficiently
    const availableHeight = height * 0.7;
    const availableWidth = width * 0.95;
    const maxSize = Math.min(availableHeight, availableWidth) / N;
    return Math.floor(Math.min(maxSize, 60));
  }

  // On mobile, use 95% of screen width
  const availableWidth = width * 0.95;
  const cellSize = availableWidth / N;
  return Math.floor(cellSize);
}

const TOTAL_BERRIES_REQUIRED = 27;

type Screen = "start" | "game" | "help";

function poolTitleKey(id: PoolId): string {
  if (id === "easy") return "app.difficulty.easy";
  if (id === "medium") return "app.difficulty.medium";
  return "app.difficulty.hard";
}

type LangChoice = SupportedLang | "system";

const LANG_OPTIONS: Array<{
  key: LangChoice;
  label: string;
  badge: string;
}> = [
  { key: "system", label: "System (Auto)", badge: "🌐" },
  { key: "en", label: "English", badge: "EN" },
  { key: "es", label: "Español", badge: "ES" },
  { key: "de", label: "Deutsch", badge: "DE" },
];

function langLabel(choice: LangChoice): string {
  const opt = LANG_OPTIONS.find((o) => o.key === choice);
  return opt ? `${opt.badge} ${opt.label}` : "🌐 System (Auto)";
}

function RootApp() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState<Screen>("start");
  const [cellSize, setCellSize] = useState(getResponsiveCellSize());

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [puzzleSource, setPuzzleSource] = useState<PuzzleSource>("generated");

  const [playerBoard, setPlayerBoard] = useState<PlayerCellState[][]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [statusOk, setStatusOk] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [violations, setViolations] = useState<Violations>({
    row: new Array<boolean>(N).fill(false),
    col: new Array<boolean>(N).fill(false),
    block: new Array<boolean>(N).fill(false),
    clueArea: Array.from({ length: N }, () => new Array<boolean>(N).fill(false)),
  });

  const [history, setHistory] = useState<PlayerCellState[][][]>([]);
  const [future, setFuture] = useState<PlayerCellState[][][]>([]);

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  const totalBerries = playerBoard.reduce((acc, row) => acc + row.filter((v) => v === 1).length, 0);

  const readyToCheck = !!puzzle && !showSolution && totalBerries === TOTAL_BERRIES_REQUIRED;
  const checkPulse = useRef(new Animated.Value(1)).current;

  // --- pools ---
  const [poolId, setPoolId] = useState<PoolId>("easy");

  const [pools, setPools] = useState<Record<PoolId, PuzzlePoolV1 | null>>({
    easy: null,
    medium: null,
    hard: null,
  });

  const [poolErrors, setPoolErrors] = useState<Record<PoolId, string | null>>({
    easy: null,
    medium: null,
    hard: null,
  });

  const pool = pools[poolId];
  const poolError = poolErrors[poolId];

  const poolSize = pool?.puzzles.length ?? 0;

  const poolAvailable = useMemo(() => !!pool && poolSize > 0, [pool, poolSize]);

  // progress counts per pool
  const [poolLoadedCount, setPoolLoadedCount] = useState<Record<PoolId, number>>({
    easy: 0,
    medium: 0,
    hard: 0,
  });

  const poolProgressLoadedCount = poolLoadedCount[poolId];
  const poolRemaining = pool ? Math.max(0, poolSize - poolProgressLoadedCount) : 0;
  const poolHasRemaining = poolAvailable && poolRemaining > 0;

  const [currentPoolIndex, setCurrentPoolIndex] = useState<number | null>(null);
  const [activePoolIdForCurrentPuzzle, setActivePoolIdForCurrentPuzzle] = useState<PoolId | null>(
    null,
  );

  const [isSolved, setIsSolved] = useState(false);

  const titleText =
    puzzleSource === "pool" && currentPoolIndex !== null
      ? t("app.titleWithIndex", { index: currentPoolIndex + 1 })
      : t("app.title");

  // --- language selector ---
  const [langChoice, setLangChoice] = useState<LangChoice>("system");
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [langReady, setLangReady] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const saved = await AsyncStorage.getItem(I18N_STORAGE_KEY_LANGUAGE);
        if (!alive) return;

        if (saved && isSupportedLang(saved)) {
          await setAppLanguage(saved);
          setLangChoice(saved);
        } else {
          setLangChoice("system");
        }
      } catch {
        // ignore storage issues, just keep system language
        setLangChoice("system");
      } finally {
        if (alive) setLangReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function applyLanguage(choice: LangChoice) {
    setLangModalOpen(false);

    try {
      if (choice === "system") {
        await AsyncStorage.removeItem(I18N_STORAGE_KEY_LANGUAGE);
        await resetToSystemLanguage();
        setLangChoice("system");
      } else {
        await setAppLanguage(choice);
        await AsyncStorage.setItem(I18N_STORAGE_KEY_LANGUAGE, choice);
        setLangChoice(choice);
      }
    } catch {
      // ignore; keep UI responsive
    }
  }

  function resetGameState() {
    setPuzzle(null);
    setPlayerBoard([]);
    setShowSolution(false);
    setStatus("");
    setStatusOk(null);
    setHistory([]);
    setFuture([]);
    setViolations({
      row: new Array<boolean>(N).fill(false),
      col: new Array<boolean>(N).fill(false),
      block: new Array<boolean>(N).fill(false),
      clueArea: Array.from({ length: N }, () => new Array<boolean>(N).fill(false)),
    });
  }

  function startGameWithPuzzle(p: Puzzle, source: PuzzleSource) {
    const empty = createEmptyPlayerBoard();
    setPuzzle(p);
    setPuzzleSource(source);
    setPlayerBoard(empty);
    setViolations(computeViolations(empty, p));
    setHistory([]);
    setFuture([]);
    setShowSolution(false);
    setIsSolved(false);
    setStatus("");
    setStatusOk(null);
    setScreen("game");
  }

  // Generator params per pool:
  // - extraClues = how many extra clue cells to ADD after minimization.
  // - nonEmptyBlocks = ensure each 3x3 block has >= 1 clue.
  function genParamsForPool(id: PoolId): { extraClues: number; nonEmptyBlocks: boolean } {
    if (id === "easy") return { extraClues: 3, nonEmptyBlocks: true };
    if (id === "medium") return { extraClues: 1, nonEmptyBlocks: true };
    return { extraClues: 0, nonEmptyBlocks: false };
  }

  function generatePuzzleForDifficulty(id: PoolId) {
    setIsGenerating(true);
    setStatus("");
    setStatusOk(null);
    setShowSolution(false);

    setTimeout(() => {
      const params = genParamsForPool(id);
      const p = makePuzzle({ extraClues: params.extraClues, nonEmptyBlocks: params.nonEmptyBlocks });
      setCurrentPoolIndex(null);
      setActivePoolIdForCurrentPuzzle(null);
      startGameWithPuzzle(p, "generated");
      setIsGenerating(false);
    }, 0);
  }

  async function loadNextPuzzleFromPool() {
    if (!poolAvailable || !pool) return;
    setIsGenerating(true);
    setStatus("");
    setStatusOk(null);

    try {
      const progress = await loadPoolProgress(poolId, pool);
      const idx = getNextNotLoadedIndex(pool, progress);

      if (idx === null) {
        setStatus(t("status.poolExhausted"));
        setStatusOk(null);
        return;
      }

      const entry = pool.puzzles[idx];
      const puzzleClues = decodeClues81ToGrid(entry.clues81);

      const solution = solveOneFromClueGrid(puzzleClues);
      if (!solution) {
        setStatus(t("status.poolPuzzleUnsolvable", { index: idx }));
        setStatusOk(false);
        await markPoolIndexLoaded(poolId, pool, idx);
        const p2 = await loadPoolProgress(poolId, pool);
        setPoolLoadedCount((prev) => ({ ...prev, [poolId]: p2.loaded.length }));
        return;
      }

      const pz: Puzzle = { puzzleClues, solution };
      startGameWithPuzzle(pz, "pool");
      setCurrentPoolIndex(idx);
      setActivePoolIdForCurrentPuzzle(poolId);

      const updated = await markPoolIndexLoaded(poolId, pool, idx);
      setPoolLoadedCount((prev) => ({ ...prev, [poolId]: updated.loaded.length }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(t("status.loadNextPoolFailed", { msg }));
      setStatusOk(false);
    } finally {
      setIsGenerating(false);
    }
  }

  async function loadRandomPuzzleFromPool() {
    if (!poolAvailable || !pool) return;
    setIsGenerating(true);
    setStatus("");
    setStatusOk(null);

    try {
      const progress = await loadPoolProgress(poolId, pool);
      const idx = getRandomNotLoadedIndex(pool, progress);

      if (idx === null) {
        setStatus(t("status.poolExhausted"));
        setStatusOk(null);
        return;
      }

      const entry = pool.puzzles[idx];
      const puzzleClues = decodeClues81ToGrid(entry.clues81);

      const solution = solveOneFromClueGrid(puzzleClues);
      if (!solution) {
        setStatus(t("status.poolPuzzleUnsolvable", { index: idx }));
        setStatusOk(false);
        await markPoolIndexLoaded(poolId, pool, idx);
        const p2 = await loadPoolProgress(poolId, pool);
        setPoolLoadedCount((prev) => ({ ...prev, [poolId]: p2.loaded.length }));
        return;
      }

      const pz: Puzzle = { puzzleClues, solution };
      startGameWithPuzzle(pz, "pool");
      setCurrentPoolIndex(idx);
      setActivePoolIdForCurrentPuzzle(poolId);

      const updated = await markPoolIndexLoaded(poolId, pool, idx);
      setPoolLoadedCount((prev) => ({ ...prev, [poolId]: updated.loaded.length }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(t("status.loadRandomPoolFailed", { msg }));
      setStatusOk(false);
    } finally {
      setIsGenerating(false);
    }
  }

  function newGame() {
    setCurrentPoolIndex(null);
    setActivePoolIdForCurrentPuzzle(null);
    resetGameState();
    setIsSolved(false);
    void clearSavedGame();
    setScreen("start");
  }

  function handleCellPress(r: number, c: number) {
    if (!puzzle) return;
    const clue = puzzle.puzzleClues[r][c];
    if (clue !== null) return; // fixed clue, not editable
    if (showSolution) return; // don't edit while showing solution

    setStatus("");
    setStatusOk(null);

    setPlayerBoard((prevBoard) => {
      const prevSnapshot = prevBoard.map((row) => row.slice());
      const nextBoard = prevBoard.map((row) => row.slice());

      const current = nextBoard[r][c];
      let nextVal: PlayerCellState;
      // empty → X → berry → empty
      if (current === 0) nextVal = -1;
      else if (current === -1) nextVal = 1;
      else nextVal = 0;
      nextBoard[r][c] = nextVal;

      setHistory((h) => [...h, prevSnapshot]);
      setFuture([]);
      setViolations(computeViolations(nextBoard, puzzle));

      return nextBoard;
    });
  }

  function clearBoard() {
    if (!puzzle) return;
    const empty = createEmptyPlayerBoard();
    setPlayerBoard((prevBoard) => {
      const prevSnapshot = prevBoard.map((row) => row.slice());
      setHistory((h) => [...h, prevSnapshot]);
      setFuture([]);
      setViolations(computeViolations(empty, puzzle));
      setStatus("");
      setStatusOk(null);
      return empty;
    });
  }

  function undo() {
    if (!puzzle) return;
    setHistory((prevHist) => {
      if (prevHist.length === 0) return prevHist;
      const newHist = [...prevHist];
      const lastBoard = newHist.pop()!;
      setPlayerBoard((currentBoard) => {
        const currentSnapshot = currentBoard.map((row) => row.slice());
        setFuture((f) => [...f, currentSnapshot]);
        setViolations(computeViolations(lastBoard, puzzle));
        return lastBoard;
      });
      setStatus("");
      setStatusOk(null);
      return newHist;
    });
  }

  function redo() {
    if (!puzzle) return;
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const newFuture = [...prevFuture];
      const nextBoard = newFuture.pop()!;
      setPlayerBoard((currentBoard) => {
        const currentSnapshot = currentBoard.map((row) => row.slice());
        setHistory((h) => [...h, currentSnapshot]);
        setViolations(computeViolations(nextBoard, puzzle));
        return nextBoard;
      });
      setStatus("");
      setStatusOk(null);
      return newFuture;
    });
  }

  function checkSolution() {
    if (!puzzle) return;
    const { solution } = puzzle;

    let allMatch = true;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const solBerry = solution[r][c] === 1;
        const state = playerBoard[r]?.[c] ?? 0;
        const playerBerry = state === 1;

        if (solBerry !== playerBerry) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) break;
    }

    setViolations(computeViolations(playerBoard, puzzle));

    if (allMatch) {
      if (puzzleSource === "pool" && currentPoolIndex !== null && activePoolIdForCurrentPuzzle) {
        const p = pools[activePoolIdForCurrentPuzzle];
        if (p) void markPoolIndexSolved(activePoolIdForCurrentPuzzle, p, currentPoolIndex);
      }
      setIsSolved(true);
      setStatus(t("status.correctSolved"));
      setStatusOk(true);
    } else {
      setStatus(t("status.notSolvedYet"));
      setStatusOk(false);
    }
  }

  function toggleShowSolution() {
    setShowSolution((prev) => !prev);
    setStatus("");
    setStatusOk(null);
  }

  function getCellBorderStyle(r: number, c: number) {
    // Black borders (width 2) for outer edges and 3x3 block boundaries
    // Grey borders (width 1) for individual cells
    const isTopBlockEdge = r === 0 || r % 3 === 0;
    const isLeftBlockEdge = c === 0 || c % 3 === 0;
    const isRightBlockEdge = c === N - 1 || (c + 1) % 3 === 0;
    const isBottomBlockEdge = r === N - 1 || (r + 1) % 3 === 0;

    return {
      borderTopWidth: isTopBlockEdge ? 2 : 1,
      borderLeftWidth: isLeftBlockEdge ? 2 : 1,
      borderRightWidth: isRightBlockEdge ? 2 : 1,
      borderBottomWidth: isBottomBlockEdge ? 2 : 1,
      borderTopColor: isTopBlockEdge ? "#000" : "#999",
      borderLeftColor: isLeftBlockEdge ? "#000" : "#999",
      borderRightColor: isRightBlockEdge ? "#000" : "#999",
      borderBottomColor: isBottomBlockEdge ? "#000" : "#999",
    };
  }

  function renderCell(r: number, c: number) {
    if (!puzzle) return null;

    const clue = puzzle.puzzleClues[r][c];
    const solutionBerry = puzzle.solution[r][c] === 1;
    const state = playerBoard[r]?.[c] ?? 0;

    const blockIndex = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    const isUnitViolated = violations.row[r] || violations.col[c] || violations.block[blockIndex];
    const isClueAreaViolated = violations.clueArea[r]?.[c] ?? false;

    let text = "";

    const cellStyles: StyleProp<ViewStyle>[] = [
      styles.cell,
      { width: cellSize, height: cellSize },
      getCellBorderStyle(r, c),
    ];
    const textStyles: StyleProp<TextStyle>[] = [styles.cellText];

    if (showSolution) {
      if (solutionBerry) {
        text = "●";
        cellStyles.push(styles.cellSolutionBerry);
      } else if (clue !== null) {
        text = String(clue);
        textStyles.push(styles.cellClue);
      }
    } else {
      if (clue !== null) {
        text = String(clue);
        textStyles.push(styles.cellClue);
      } else if (state === 1) {
        text = "●";
        cellStyles.push(styles.cellPlayerBerry);
      } else if (state === -1) {
        text = "×";
        textStyles.push(styles.cellPlayerEmpty);
      }

      if (isUnitViolated) {
        cellStyles.push(styles.cellViolation);
      }
      if (isClueAreaViolated) {
        cellStyles.push(styles.cellClueAreaViolation);
      }
    }

    return (
      <Pressable key={`${r}-${c}`} style={cellStyles} onPress={() => handleCellPress(r, c)}>
        <Text style={textStyles}>{text}</Text>
      </Pressable>
    );
  }

  async function handleResetPoolProgress() {
    setStatus("");
    setStatusOk(null);

    try {
      await resetPoolProgress(poolId);

      // Update UI immediately
      setPoolLoadedCount((prev) => ({ ...prev, [poolId]: 0 }));

      setStatus(t("status.poolProgressReset", { poolId }));
      setStatusOk(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(t("status.resetPoolFailed", { msg }));
      setStatusOk(false);
    }
  }

  function handleHowToPlay() {
    setStatus("");
    setStatusOk(null);
    setScreen("help");
  }

  // Pulse animation for Check button
  useEffect(() => {
    if (!readyToCheck) {
      checkPulse.stopAnimation();
      checkPulse.setValue(1);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(checkPulse, {
          toValue: 1.12,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(checkPulse, {
          toValue: 1,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(200),
      ]),
    );

    anim.start();

    return () => {
      anim.stop();
      checkPulse.stopAnimation();
      checkPulse.setValue(1);
    };
  }, [readyToCheck, checkPulse]);

  // Autosave current game state (only while on game screen and puzzle exists)
  useEffect(() => {
    if (screen !== "game") return;
    if (!puzzle) return;

    scheduleSave({
      v: 1,
      savedAt: Date.now(),
      puzzle,
      playerBoard,
      history,
      future,
      useDense: false, // keep for compatibility

      puzzleSource,
      poolIndex: puzzleSource === "pool" ? currentPoolIndex : null,
      poolId: puzzleSource === "pool" ? activePoolIdForCurrentPuzzle : null,
    });
  }, [
    screen,
    puzzle,
    playerBoard,
    history,
    future,
    puzzleSource,
    currentPoolIndex,
    activePoolIdForCurrentPuzzle,
  ]);

  // Load + validate pools once
  useEffect(() => {
    (["easy", "medium", "hard"] as const).forEach((id) => {
      try {
        const validated = validatePoolOrThrow(RAW_POOLS[id]);
        setPools((prev) => ({ ...prev, [id]: validated }));
        setPoolErrors((prev) => ({ ...prev, [id]: null }));
        console.log(`Pool loaded (${id}): ${validated.puzzles.length} puzzles`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setPools((prev) => ({ ...prev, [id]: null }));
        setPoolErrors((prev) => ({ ...prev, [id]: msg }));
        console.warn(`Failed to load pool (${id}):`, msg);
      }
    });
  }, []);

  // Load progress for each pool (per key)
  useEffect(() => {
    (async () => {
      for (const id of ["easy", "medium", "hard"] as const) {
        const p = pools[id];
        if (!p) continue;
        const progress = await loadPoolProgress(id, p);
        setPoolLoadedCount((prev) => ({ ...prev, [id]: progress.loaded.length }));
      }
    })();
  }, [pools.easy, pools.medium, pools.hard]);

  // Restore last game (if any)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const saved = await loadSavedGame(N);
        if (!alive) return;
        if (!saved) return;

        setPuzzle(saved.puzzle);
        setPlayerBoard(saved.playerBoard);
        setHistory(saved.history);
        setFuture(saved.future);
        setShowSolution(false);
        setStatus("");
        setStatusOk(null);

        // restore meta (safe defaults)
        const src = saved.puzzleSource ?? "generated";
        setPuzzleSource(src);

        const restoredPoolId =
          saved.poolId === "easy" || saved.poolId === "medium" || saved.poolId === "hard"
            ? saved.poolId
            : null;

        setActivePoolIdForCurrentPuzzle(src === "pool" ? restoredPoolId : null);
        setCurrentPoolIndex(src === "pool" ? (saved.poolIndex ?? null) : null);

        setViolations(computeViolations(saved.playerBoard, saved.puzzle));
        setScreen("game");
      } catch {
        // ignore corrupted saves
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Update cell size on window resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", () => {
      setCellSize(getResponsiveCellSize());
    });

    return () => subscription?.remove();
  }, []);

  const startDisabled = isGenerating || !langReady; // avoid language flicker
  const poolDisabled = !poolHasRemaining || startDisabled || !!poolError;

  const subtitleText = t("app.subtitle", { count: 3 });

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {screen === "help" ? (
        <HelpScreen onBack={() => setScreen("start")} />
      ) : (
        <View style={styles.container}>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>

          {/* Language selector (start screen only) */}
          {screen === "start" && (
            <View style={styles.langRow}>
              <Pressable
                onPress={() => setLangModalOpen(true)}
                style={[styles.langButton, startDisabled && styles.buttonDisabled]}
                disabled={startDisabled}
                hitSlop={10}
              >
                <Text style={styles.langButtonText}>{langLabel(langChoice)}</Text>
                <Text style={styles.langChevron}>▾</Text>
              </Pressable>
            </View>
          )}

          {isGenerating && (
            <View style={styles.generating}>
              <ActivityIndicator size="small" />
              <Text style={styles.generatingText}>{t("app.preparingGame")}</Text>
            </View>
          )}

          {screen === "start" && (
            <>
              <View style={styles.startWrap}>
                {/* Help */}
                <Pressable
                  style={[styles.helpButton, startDisabled && styles.buttonDisabled]}
                  onPress={handleHowToPlay}
                  disabled={startDisabled}
                >
                  <Text style={styles.helpButtonText}>{t("app.howToPlay")}</Text>
                </Pressable>

                {/* Tabs */}
                <View style={styles.tabsRow}>
                  {(["easy", "medium", "hard"] as const).map((id) => (
                    <Pressable
                      key={id}
                      onPress={() => setPoolId(id)}
                      style={[
                        styles.tab,
                        poolId === id && styles.tabActive,
                        startDisabled && styles.tabDisabled,
                      ]}
                      disabled={startDisabled}
                    >
                      <Text style={[styles.tabText, poolId === id && styles.tabTextActive]}>
                        {t(poolTitleKey(id))}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {poolError && (
                  <Text style={[styles.status, styles.statusError]}>
                    {t("status.poolLoadFailed", { msg: poolError })}
                  </Text>
                )}

                <Text style={styles.startHint}>{t("start.chooseHowToStart")}</Text>

                {pool && (
                  <Text style={styles.startNote}>
                    {t("start.poolProgress", {
                      poolName: t(poolTitleKey(poolId)),
                      used: poolProgressLoadedCount,
                      total: poolSize,
                    })}
                  </Text>
                )}

                {/* Play */}
                <Pressable
                  style={[styles.buttonWide, poolDisabled && styles.buttonDisabled]}
                  onPress={loadNextPuzzleFromPool}
                  disabled={poolDisabled}
                >
                  <Text style={styles.buttonText}>
                    {pool
                      ? t("start.playNextWithLeft", { left: poolRemaining })
                      : t("start.playNextPoolUnavailable")}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.buttonWide, poolDisabled && styles.buttonDisabled]}
                  onPress={loadRandomPuzzleFromPool}
                  disabled={poolDisabled}
                >
                  <Text style={styles.buttonText}>
                    {pool
                      ? t("start.randomFromPoolWithLeft", { left: poolRemaining })
                      : t("start.randomFromPoolUnavailable")}
                  </Text>
                </Pressable>

                {/* Generate */}
                <Pressable
                  style={[styles.buttonWide, startDisabled && styles.buttonDisabled]}
                  onPress={() => generatePuzzleForDifficulty(poolId)}
                  disabled={startDisabled}
                >
                  <Text style={styles.buttonText}>
                    {t("start.generateNewForDifficulty", { difficulty: t(poolTitleKey(poolId)) })}
                  </Text>
                </Pressable>

                {/* Pool admin */}
                {poolAvailable && (
                  <Pressable
                    onPress={handleResetPoolProgress}
                    disabled={startDisabled}
                    style={[styles.linkWrap, startDisabled && styles.buttonDisabled]}
                  >
                    <Text style={styles.linkText}>{t("start.resetPoolProgress")}</Text>
                  </Pressable>
                )}

                <Text style={styles.startNote}>{t("start.tipPoolInstant")}</Text>
              </View>

              {status !== "" && (
                <Text
                  style={[
                    styles.status,
                    statusOk === true ? styles.statusOk : statusOk === false ? styles.statusError : null,
                  ]}
                >
                  {status}
                </Text>
              )}
            </>
          )}

          {screen === "game" && puzzle && (
            <>
              <View style={styles.grid}>
                {Array.from({ length: N }, (_, r) => (
                  <View key={r} style={styles.row}>
                    {Array.from({ length: N }, (_, c) => renderCell(r, c))}
                  </View>
                ))}
              </View>

              {/* Row: Check */}
              <View style={styles.checkWrap}>
                <Animated.View style={{ transform: [{ scale: checkPulse }] }}>
                  <Pressable
                    style={[styles.button, readyToCheck && styles.buttonCheckReady]}
                    onPress={checkSolution}
                    disabled={isGenerating}
                  >
                    <Text style={styles.buttonText}>{t("game.check")}</Text>
                  </Pressable>
                </Animated.View>
              </View>

              {/* Row: Undo / Redo / Clear */}
              <View style={styles.buttonsRow}>
                <Pressable
                  style={[styles.button, (!canUndo || isGenerating) && styles.buttonDisabled]}
                  onPress={undo}
                  disabled={!canUndo || isGenerating}
                >
                  <Text style={styles.buttonText}>{t("game.undo")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, (!canRedo || isGenerating) && styles.buttonDisabled]}
                  onPress={redo}
                  disabled={!canRedo || isGenerating}
                >
                  <Text style={styles.buttonText}>{t("game.redo")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, isGenerating && styles.buttonDisabled]}
                  onPress={clearBoard}
                  disabled={isGenerating}
                >
                  <Text style={styles.buttonText}>{t("game.clear")}</Text>
                </Pressable>
              </View>

              {/* Show / Hide solution */}
              {!isSolved && (
                <Pressable style={styles.toggle} onPress={toggleShowSolution} disabled={isGenerating}>
                  <Text style={styles.toggleText}>
                    {showSolution ? t("game.hideSolution") : t("game.showSolution")}
                  </Text>
                </Pressable>
              )}

              {/* New game */}
              <Pressable
                style={[styles.buttonWide, isGenerating && styles.buttonDisabled]}
                onPress={newGame}
                disabled={isGenerating}
              >
                <Text style={styles.buttonText}>{t("game.newGame")}</Text>
              </Pressable>

              {status !== "" && (
                <Text
                  style={[
                    styles.status,
                    statusOk === true ? styles.statusOk : statusOk === false ? styles.statusError : null,
                  ]}
                >
                  {status}
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Language modal */}
      <Modal
        visible={langModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLangModalOpen(false)}>
          <View />
        </Pressable>

        <View style={[styles.modalCard, { paddingBottom: (insets.bottom || 0) + 12 }]}>
          <Text style={styles.modalTitle}>Language</Text>
          <Text style={styles.modalSub}>
            {langChoice === "system"
              ? `Currently: ${langLabel("system")} • (${langLabel(getCurrentLanguage())})`
              : `Currently: ${langLabel(langChoice)}`}
          </Text>

          <View style={styles.modalList}>
            {LANG_OPTIONS.map((opt) => {
              const selected = langChoice === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => void applyLanguage(opt.key)}
                  style={[styles.modalRow, selected && styles.modalRowSelected]}
                >
                  <Text style={[styles.modalRowText, selected && styles.modalRowTextSelected]}>
                    {opt.badge} {opt.label}
                  </Text>
                  {selected && <Text style={styles.modalCheck}>✓</Text>}
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.modalClose} onPress={() => setLangModalOpen(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <RootApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#555",
    marginBottom: 10,
  },

  langRow: {
    width: "100%",
    maxWidth: 420,
    alignItems: "flex-end",
    marginBottom: 8,
  },
  langButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
  },
  langButtonText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 13,
  },
  langChevron: {
    color: "#6b7280",
    fontSize: 14,
    marginLeft: 6,
  },

  startWrap: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    marginTop: 8,
  },

  helpButton: {
    width: "100%",
    maxWidth: 420,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2563eb",
    backgroundColor: "#fff",
    alignItems: "center",
    marginBottom: 10,
  },
  helpButtonText: {
    color: "#2563eb",
    fontWeight: "700",
  },

  tabsRow: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 420,
    marginBottom: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  tabDisabled: {
    opacity: 0.6,
  },
  tabText: {
    color: "#111827",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },

  startHint: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 10,
  },
  startNote: {
    marginTop: 10,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    maxWidth: 360,
  },

  grid: {
    borderColor: "#000",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cellText: {
    fontSize: 16,
  },
  cellClue: {
    fontWeight: "600",
    color: "#333",
  },
  cellSolutionBerry: {
    backgroundColor: "#3b82f6",
  },
  cellPlayerBerry: {
    backgroundColor: "#10b981",
  },
  cellPlayerEmpty: {
    color: "#9ca3af",
    fontSize: 20,
    fontWeight: "700",
  },
  cellViolation: {
    borderColor: "#dc2626",
    borderWidth: 2,
  },
  cellClueAreaViolation: {
    backgroundColor: "#fef3c7",
  },

  buttonsRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 8,
  },

  button: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  buttonWide: {
    backgroundColor: "#2563eb",
    width: "100%",
    maxWidth: 420,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  buttonCheckReady: {
    borderWidth: 2,
    borderColor: "#111827",
  },

  toggle: {
    marginBottom: 6,
  },
  toggleText: {
    color: "#2563eb",
    textDecorationLine: "underline",
  },

  status: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  statusOk: {
    color: "#16a34a",
  },
  statusError: {
    color: "#dc2626",
  },

  generating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  generatingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  checkWrap: {
    marginBottom: 10,
  },

  linkWrap: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  linkText: {
    color: "#2563eb",
    textDecorationLine: "underline",
    fontSize: 12,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  modalSub: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  modalList: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  modalRowSelected: {
    backgroundColor: "#eff6ff",
  },
  modalRowText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },
  modalRowTextSelected: {
    color: "#1d4ed8",
  },
  modalCheck: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1d4ed8",
  },
  modalClose: {
    marginTop: 12,
    marginBottom: 8,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCloseText: {
    color: "#2563eb",
    fontWeight: "800",
  },
});
