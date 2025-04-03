// Rules
export interface RuleEntry {
  count: number;
  val: number;
}
export type Rule = RuleEntry[];

export interface Rules {
  column: Rule[];
  row: Rule[];
}

// Moves
export type Move = {
  tile: {
    x: number;
    y: number;
  };
  next: number;
};

// Solutions
export type Board = number[][];
export interface Solution {
  board: Board;
  solved: boolean;
  unsolved: {
    rows: number[];
    columns: number[];
  };
}
