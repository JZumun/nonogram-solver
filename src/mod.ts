import type { Board, Move, Rule, Rules, Solution } from "./types.ts";
import { choose, count, keys, values } from "./utils.ts";

type Line = number[];
type PruneResult = [Line[], number];
type SolutionMap<Dim extends "x" | "y"> = Record<
  number,
  {
    solns: Line[];
  } & (Dim extends "x" ? { x: number } : { y: number })
>;

export type { Board, Move, Rule, Rules, Solution };

/**
 * Thrown when the solver cannot find a solution.
 */
export class SolveError {
  /** Reason why the solver failed */
  message: string;
  /** The row indices that have unsolved tiles */
  unsolvedRows: number[];
  /** The column indices that have unsolved tiles */
  unsolvedColumns: number[];
  constructor(
    message: string,
    unsolvedRows: SolutionMap<"x">,
    unsolvedColumns: SolutionMap<"y">,
  ) {
    this.message = message;
    this.unsolvedRows = keys(unsolvedRows);
    this.unsolvedColumns = keys(unsolvedColumns);
  }
}

/**
 * Given the rules that describes a puzzle, will attempt to generate a completely solved board.
 * 
 * ```ts
 * const board = solve(rules);
 * if (board.solved) {
 *   renderBoard(board.board);
 * } else {
 *   printError(board.message);
 *   highlightUnsolved(board.unsolved.rows, board.unsolved.columns);
 * }
 * ```
 * 
 * @param rules - the rules describing the board
 * @returns the result of the solution attempt.
 */
export function solve(rules: Rules): Solution {
  const board = generateEmptyBoardFor(rules);
  try {
    for (const move of generateMoves(rules, board)) { }
  } catch (err) {
    if (err instanceof SolveError) {
      return {
        board,
        solved: false,
        unsolved: {
          rows: err.unsolvedRows,
          columns: err.unsolvedColumns,
        },
      };
    } else {
      throw err;
    }
  }
  return {
    board,
    solved: true,
    unsolved: {
      rows: [],
      columns: [],
    },
  };
}

/**
 * Given the rules that describe a puzzle, will yield moves that can be used to fill up a board.
 * Useful for creating animations.
 * 
 * ```ts
 * try {
 *   for (const move of generateMoves(rules)) {
 *     board[move.x][move.y] = move.next;
 *     renderBoard(board);
 *   }
 * } catch (err) {
 *     printError(err.message);
 *     highlightUnsolved(err.unsolvedRows, err.unsolvedColumns);
 * }
 * ```
 * 
 * @param rules - rules that describe a board
 * @param board - a board that will be mutated by applying the provided moves to them.
 * @throws {SolveError} if the board cannot be fully solved
 * @returns a generator of {@link Move}s to apply to a board
 */
export function* generateMoves(
  rules: Rules,
  board: Board = generateEmptyBoardFor(rules),
): Generator<Move> {
  const width = rules.column.length;
  const height = rules.row.length;

  const rowMap = Object.fromEntries(
    rules.row.map((
      row,
      x,
    ) => [x, { x, solns: generateLineSolns(width, row) }]),
  );
  const colMap = Object.fromEntries(
    rules.column.map((
      col,
      y,
    ) => [y, { y, solns: generateLineSolns(height, col) }]),
  );

  let unsolvedRowCount = rules.row.length;
  let unsolvedColCount = rules.column.length;
  while (unsolvedRowCount && unsolvedColCount) {
    const unsolvedRows = values(rowMap);
    const unsolvedCols = values(colMap);

    // Find moves forced by the rules of each line individually
    const unsolvedRowIdxs = keys(rowMap);
    const unsolvedColIdxs = keys(colMap);

    const rowMoves = unsolvedRows.flatMap((row) =>
      findMovesFromRow(row.x, unsolvedColIdxs, row.solns)
    );
    const colMoves = unsolvedCols.flatMap((col) =>
      findMovesFromCol(col.y, unsolvedRowIdxs, col.solns)
    );

    //  Yield moves to caller.
    for (const move of rowMoves) {
      if (board[move.tile.x][move.tile.y] !== 0) {
        continue;
      }
      board[move.tile.x][move.tile.y] = move.next;
      yield move;
    }
    for (const move of colMoves) {
      if (board[move.tile.x][move.tile.y] !== 0) {
        continue;
      }
      board[move.tile.x][move.tile.y] = move.next;
      yield move;
    }

    // Remove invalidated possibilities
    let prunedCount = 0;
    for (const row of unsolvedRows) {
      if (isLineSolved(row.solns)) {
        delete rowMap[row.x];
        unsolvedRowCount--;
        prunedCount++;
      } else if (isLineConflict(row.solns)) {
        throw new SolveError(
          `Row ${row.x} has no solutions`,
          rowMap,
          colMap,
        );
      } else {
        const [solns, pruned] = pruneRowByMoves(
          row.solns,
          movesForRow(row.x, colMoves),
        );
        row.solns = solns;
        prunedCount += pruned;
      }
    }
    for (const col of unsolvedCols) {
      if (isLineSolved(col.solns)) {
        delete colMap[col.y];
        unsolvedColCount--;
        prunedCount++;
      } else if (isLineConflict(col.solns)) {
        throw new SolveError(
          `Column ${col.y} has no solutions`,
          rowMap,
          colMap,
        );
      } else {
        const [solns, pruned] = pruneColByMoves(
          col.solns,
          movesForCol(col.y, rowMoves),
        );
        col.solns = solns;
        prunedCount += pruned;
      }
    }

    if (prunedCount > 0) {
      continue;
    }

    // Optional step. If nothing is pruned,
    // try finding invalid moves checking in both dimensions.
    for (const x of unsolvedRowIdxs) {
      for (const y of unsolvedColIdxs) {
        const colColors = getPossibleColors(colMap[y].solns, x);
        const rowColors = getPossibleColors(rowMap[x].solns, y);

        const combinedPossibleColors: Set<number> = colColors
          .intersection(rowColors);

        const [colSolns, colPruned] = pruneByColors(
          colMap[y].solns,
          combinedPossibleColors,
          x,
        );
        const [rowSolns, rowPruned] = pruneByColors(
          rowMap[x].solns,
          combinedPossibleColors,
          y,
        );
        colMap[y].solns = colSolns;
        rowMap[x].solns = rowSolns;
        prunedCount += colPruned + rowPruned;
      }
    }

    // If nothing is still pruned, give up
    if (prunedCount == 0) {
      throw new SolveError("Ran out of moves", rowMap, colMap);
    }
  }
}

function generateEmptyBoardFor(rules: Rules): Board {
  return count(rules.column.length, (_) => count(rules.row.length, (_) => 0));
}

function isSameColorAsPrevious(rule: Rule, i: number) {
  return rule[i - 1]?.val === rule[i].val;
}
function generateLineSolns(
  lineLength: number,
  rule: Rule,
): Line[] {
  // Provide an all crossed out solution for lines with no rules
  if (rule.length == 0) {
    return [count(lineLength, () => -1)];
  }

  const nGroups = rule.length;
  const taggedRule = rule.map((r, i) => ({
    count: r.count,
    val: r.val,
    same: isSameColorAsPrevious(rule, i),
  }));
  const mandatorySpaces = taggedRule.filter((r) => r.same).length;
  const sumOfColoredSpaces = rule.reduce((a, r) => a + r.count, 0);
  const freeSpaces = lineLength - mandatorySpaces - sumOfColoredSpaces;
  const totalSlots = freeSpaces + nGroups;

  // generate all the ways the free spaces can be arranged within the line
  const arrangements = choose(totalSlots, nGroups);

  // convert each arrangement to an actual line solution
  return arrangements.map((a) => {
    const slots: ((typeof taggedRule[0]) | undefined)[] = count(
      totalSlots,
      () => undefined,
    );
    a.forEach((slot, i) => {
      slots[slot] = taggedRule[i];
    });
    return slots.flatMap((slot) => {
      if (!slot) {
        return [-1];
      }
      const val = count(slot.count, () => slot.val);
      if (slot.same) {
        val.unshift(-1);
      }
      return val;
    });
  });
}

const findMovesFromCol = (
  y: number,
  unsolvedX: number[],
  lines: Line[],
) => findValidMoves(lines, unsolvedX, (x, next) => ({ tile: { x, y }, next }));
const findMovesFromRow = (
  x: number,
  unsolvedY: number[],
  lines: Line[],
) => findValidMoves(lines, unsolvedY, (y, next) => ({ tile: { x, y }, next }));
function findValidMoves(
  lines: Line[],
  indices: number[],
  solnMapper: (pos: number, i: number) => Move,
): Move[] {
  const moves: Move[] = [];
  const length = lines[0].length;

  function allEqualAt(i: number) {
    return lines.every((n) => n[i] === lines[0][i]);
  }
  for (let i = 0; i < length; i++) {
    if (!indices.includes(i)) {
      continue;
    }
    if (allEqualAt(i)) {
      moves.push(solnMapper(i, lines[0][i]));
    }
  }
  return moves;
}

function isLineConflict(solns: Line[]) {
  return solns.length == 0;
}
function isLineSolved(solns: Line[]) {
  return solns.length == 1;
}

const movesForCol = (y: number, moves: Move[]) => filterMoves("y", y, moves);
const movesForRow = (x: number, moves: Move[]) => filterMoves("x", x, moves);
function filterMoves(dim: "x" | "y", i: number, moves: Move[]) {
  return moves.filter((move) => move.tile[dim] == i);
}

const pruneColByMoves = (solns: Line[], moves: Move[]) =>
  pruneByMoves("x", solns, moves);
const pruneRowByMoves = (solns: Line[], moves: Move[]) =>
  pruneByMoves("y", solns, moves);
function pruneByMoves(
  dim: "x" | "y",
  solns: Line[],
  moves: Move[],
): PruneResult {
  const initialCount = solns.length;
  const newSolns = solns.filter((soln) => {
    return moves.every((m) => soln[m.tile[dim]] === m.next);
  });
  return [newSolns, initialCount - newSolns.length];
}

function getPossibleColors(solns: Line[], i: number) {
  const colorSet: Set<number> = new Set();
  for (const soln of solns) {
    colorSet.add(soln[i]);
  }
  return colorSet;
}
function pruneByColors(
  solns: Line[],
  allowedColors: Set<number>,
  i: number,
): PruneResult {
  const initialLength = solns.length;
  const filteredSolns = solns.filter((soln) => allowedColors.has(soln[i]));
  return [filteredSolns, initialLength - filteredSolns.length];
}
