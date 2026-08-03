# remote-shogiban

## Commands

| Command | Action |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` — typecheck first |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest (watch mode) |
| `npm run coverage` | Vitest with coverage |

Run `lint` before committing. `npm test` is fast (single test file).

## Architecture

- **Entry**: `index.html` → `src/Main.tsx` → `src/App.tsx` → `src/components/ShogiBan.tsx`
- **Model** (`src/models/shogi.ts`): `Kyokumen` (board state), `Kifu` (tree of `Sashite` nodes), no external state library — plain React state + immer (unused).
- **UI**: Two components (`ShogiBan`, `KomaDai`), one hook (`useShogiAi`), one API client (`aiClient.ts`).
- **Pieces**: SVG images in `public/koma/`. Reversed view uses `_rev` suffix (e.g. `fu_rev.png`). Path is `import.meta.env.BASE_URL + "koma/..."`.

## Key model conventions

- Drop moves: `fromRow` = 10–16 (Sente) or 20–26 (Gote). See `getFromRow()` / `getDroppedKomaKind()`.
- `Kifu` navigates via `path: number[]` (branch indices). `tesuu` is 1‑based (0 = root sentinel).
- `isLegal()` validates move rules but **not** check evasion — use `isSucidalMove()` for that.
- Board is `9×9`, `ban[row][col]`, row 0 = top (Gote's back rank).

## TypeScript rules

- `verbatimModuleSyntax` → use `import type` for type-only imports.
- `erasableSyntaxOnly` → no enums, no `namespace`.

## Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin. Import is `@import "tailwindcss"` (no config file needed).

Extract long/conditional class strings to variables. Short ones inline.

## Testing

- Single file: `src/models/shogi.test.ts` using Vitest.
- Helpers `appendSashite()` and `setPiece()` take Japanese notation (suji/dan, 1‑indexed from top‑right).
- Run: `npm test` (watch) or `npx vitest run`.

## Specs

Design docs in `/specs/` (Japanese). Consult before changing model behavior.

## Existing agent rules

`.agent/rules/` contains Cline-specific rules. Respect them but AGENTS.md takes precedence for OpenCode.
