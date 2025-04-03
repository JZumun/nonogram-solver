export const count = <T = number>(
  n: number,
  map: (i: number) => T = (i) => i as T,
) => Array.from(new Array(n), (_, index) => map(index));

export const keys = (a: object) => Object.keys(a).map((i) => Number(i));

export const values = Object.values;

export function choose(max: number, pick: number, start = 0): number[][] {
  if (pick <= 0) {
    return [];
  }
  if (pick == 1) {
    return count(Math.max(max - start, 0), (i) => [start + i]);
  }

  const combs: number[][] = [];
  for (let i = start; i < max - 1; i++) {
    for (const subCombo of choose(max, pick - 1, i + 1)) {
      subCombo.unshift(i);
      combs.push(subCombo);
    }
  }
  return combs;
}
