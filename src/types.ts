// RULES
/**
 * A single entry in a rule for a line (column or row).
 */
export interface RuleEntry {
  /**
   * the number of tiles
   */
  count: number;
  /**
   * The tile color. Must be nonnegative to represent a real color.
   */
  val: number;
}
/**
 * A rule for a full line (column or a row).
 */
export type Rule = RuleEntry[];

/**
 * The rules for a full board.
 */
export interface Rules {
  /**
   * rules for columns. The length of this array corresponds to the width of the board.
   */
  column: Rule[];
  /**
   * rules for rows. The length of this array corresponds to the height of the board.
   */
  row: Rule[];
}

// MOVES
/**
 * Represents a tile in the board being set to a specific color.
 */
export type Move = {
  /**
   * The tile being set.
   */
  tile: {
    /** row of the tile */
    x: number;
    /** column of the tile */
    y: number;
  };
  /**
   * the color to set the tile to.
   * 
   * If the tile must be a color, the value will be nonnegative(based on {@link RuleEntry.val}).
   * 
   * If the tile must be blank, this will be -1
   */
  next: number;
};

// SOLUTIONS
/**
 * 2D representation of the nonogram board, indexed by row, then column.
 * 
 * 
 * Board[x][y] is the color of the tile at (x, y).
 * If a tile has a color, the value will be nonnegative, (based on {@link RuleEntry.val})
 * 
 * If a tile is blank, the value will be -1
 * 
 * If a tile is unknown, the value will be 0
 */
export type Board = number[][];

/**
 * Results of a solve attempt.
 */
export interface Solution {
  /** The board with all possible moves applied. 
   * 
   *   If the solution is successful, the board will be fully filled,
   *   (containing only nonnegative numbers to represent colors, and -1 to represent blanks).
   * 
   *   Otherwise, it will contain 0s representing tiles with unknown values.*/
  board: Board;
  /** whether the board has a complete solution */
  solved: boolean;
  unsolved: {
    /** the row indices that have unsolved tiles */
    rows: number[];
    /** the column indices that have unsolved tiles */
    columns: number[];
  };
}
