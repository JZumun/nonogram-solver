# Nonogram Solver

Nonogram solver algorithm used by [nonochill](https://nonochill.jzumun.ph/), my nonogram puzzle generator/game [(source code)](https://github.com/JZumun/nonochill-v2). 

The algorithm is based on the procedure described in [this article by Hennie de Harder](https://towardsdatascience.com/solving-nonograms-with-120-lines-of-code-a7c6e0f627e4/), modified to support multiple colors in the puzzle.

I've used it to solve boards up to 20x20 with 5 colors. It currently has no ability to do a search, so fails for any puzzle that requires bifurcation.

## Installation:
```bash
# deno
deno add jsr:@jzumun/nonogram-solver@0.1.0

#node
npx jsr add @jzumun/nonogram-solver
```

## Usage
```ts
import { solve } from "jsr:@jzumun/nonogram-solver"

const solution = solve({
    row: [
        [{ count: 1, val: 1 }],
        [],
    ],
    column: [
        [{ count: 1, val: 1 }],
        [],
    ]
})
```