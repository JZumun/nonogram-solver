import type { Board } from "./types.ts";

function tile(x: number) {
  return x == 0 ? "?" : x == -1 ? " " : String.fromCharCode(x + 64);
}

export function draw(board: Board) {
  return board.map((row) => row.map(tile).join("")).join("\n");
}
