# AGENTS.md

Compact guidance for working in this repo (qarjs — MongoDB-style queries for plain JS arrays).

## Package manager & commands

- Use **yarn** (there is a `yarn.lock`; CI runs `yarn install --ignore-engines`). Do not use npm/pnpm scripts.
- `yarn test` — run all Jest tests (`jest --verbose`).
- `yarn coverage` — Jest with coverage (`v8` provider).
- `yarn build` — runs `jest --verbose && node build.js`. **Tests run before the build**, so a failing test blocks the build.
- `yarn watch` — `node build.js --watch` (rebuilds `dist/` on change; does not run tests).
- Single test file: `npx jest test/utils/applyQuery.test.js` (or any path). Jest config lives in `jest.config.js` and uses the `jest-esbuild` transform — no Babel/TS compiler.
- `node integration-test.js` — standalone manual smoke test (not part of Jest). It imports `./src/qar.js` directly and prints pass/fail counts.

## Build & artifacts

- Build is **esbuild-based** (`build.js`), not a bundler config file. It bundles `src/qar.js` into `dist/qar.js` (ESM) and `dist/qar.cjs` (CJS), and copies `src/qar.d.ts` to `dist/qar.d.ts`.
- `build.js` also writes `bundle-llm.js.txt` (all `src/*.js` concatenated, for LLM context). This file is **gitignored** — do not commit it.
- `dist/`, `coverage/`, `node_modules/`, and `bundle-*.txt` are gitignored. The published package only ships `dist/*` (`files` in `package.json`).
- There is **no type-check / `tsc` step** in scripts or CI. `jsconfig.json` enables `checkJs`, but type errors do not fail the build.

## Source layout

- Entry point: `src/qar.js` (default export `Qar`). Public API: `find`, `findOne`, `count`, `exists`, `distinct`, `aggregate`, `toArray`.
- `src/utils/` holds the implementation: `applyQuery.js` (query matching), `queryCursor.js` (chainable `find` cursor: sort/skip/limit/project), `aggregate.js` (pipeline), `expressions.js` (`$expr` operators), `projection.js`, `object.js`, `typeOf.js`, `validate.js`.
- Tests mirror this layout under `test/` (one `*.test.js` per source module). Keep that 1:1 mapping when adding features.

## CI

- `.github/workflows/main.yml`: on push/PR to `main`, runs `yarn install --ignore-engines` → `yarn build` → `yarn test` → `yarn coverage` (uploads to Codecov) on Node 22.x and 24.x.
- `.github/workflows/publish.yml`: on GitHub release publish, builds and publishes to npm via Trusted Publishing (`provenance: true`). No manual publish step.

## Testing expectations

- Maintain **100% code coverage**. CI runs `yarn coverage` and uploads to Codecov on every push/PR; new code must not drop coverage. Add or extend a `test/` case for any changed/added behavior.

## Conventions

- ESM-only source (`"type": "module"`). Import with extensions (e.g. `import { ... } from './utils/applyQuery.js'`).
- `find()` returns a cursor; call `.toArray()` to execute. `findOne`/`count`/`exists`/`distinct` execute immediately.
- `toArray()` returns a **deep copy** of the data — mutations don't leak back into the source array.
- Index hints (`{ indexes: { field: Map } }`) only speed up top-level `$eq`/direct-equality queries in `find`/`findOne`/`count`/`exists`/`distinct`.
