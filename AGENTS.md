# Repository Guidelines

This repository is a Next.js 16 TypeScript application for storing, reviewing, and processing study records for postgraduate-exam Mathematics and 408. Keep changes focused, type-safe, and consistent with the App Router structure.

## Project Structure & Module Organization

- `src/app/` contains pages, layouts, and App Router API handlers under `src/app/api/`. Pages: record list (`/`), new-record form (`/new`), record detail (`/records/[id]`), review flow (`/review`), stats (`/stats`), and backup (`/backup`).
- `src/components/` contains reusable UI components: the workspace, OCR upload, Markdown/LaTeX preview, shared `RecordForm` (used by create and edit flows), record details, review flow, and bottom/sidebar navigation.
- `src/lib/` contains SQLite access (`db.ts`), temporary/permanent image handling (`images.ts`), OCR prompts (`ocr.ts`), SM-2 scheduling (`sm2.ts`), input validation (`validate.ts`), constants, and shared types.
- `public/` contains static assets. Do not add a new public route that exposes local study data.
- `data/` is runtime state: SQLite files, WAL files, temporary images, and uploaded images. Treat it as local application data, not source code.
- Root configuration lives in `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, and `postcss.config.mjs`.

## Database Conventions

- Image attachments live in the `record_images(record_id, kind, name, position)` child table; `Record.question_images` / `Record.answer_images` are comma-joined aggregates over it. Never write image names directly into `records`.
- Review history lives in `review_log`; per-card scheduling state lives in `review_state`. Both cascade-delete with their record (foreign keys are enabled in `getDb`).
- Schema changes must be added as a new numbered block in `migrate()` guarded by `PRAGMA user_version`; never edit in-place migrations for released schemas.
- `db.test.ts` runs against an in-memory database via `DB_PATH`; keep DB logic testable by taking the connection from `getDb()` lazily.

## Build, Test, and Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start the local development server
npm test          # Run the Vitest regression suite
npm run lint      # Run ESLint with Next.js and TypeScript rules
npm run build     # Create a production build and type-check the app
npm start         # Serve the production build locally
```

The local app reads OCR settings from `.env.local`: `OCR_API_BASE`, `OCR_API_KEY`, and `OCR_MODEL`.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, double quotes, and the existing `@/*` alias for imports from `src`. Name React components and component files in PascalCase; use camelCase for functions and variables. Keep route directories and API paths lowercase. Match the existing Tailwind utility-class style and avoid unrelated formatting changes.

Use the shared Markdown + LaTeX renderer for user-authored or OCR-produced content. Keep question-image and answer-image flows separate. New records must not be changed to auto-generate answers from question images.

## Testing Guidelines

Focused regression tests live beside the implementation as `*.test.ts` or `*.test.tsx` files and run with Vitest. Cover OCR prompt separation, Markdown/LaTeX rendering, image-name handling, and review scheduling when those areas change.

For every change, run `npm test`, `npm run lint`, and `npm run build`. For UI or API changes, also exercise the affected flow with `npm run dev` or a production server, including record creation, question/answer OCR, upload cleanup, detail editing, deletion, and review actions when relevant.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects such as `Fix review-state update`. Pull requests should explain the behavior change, list validation commands, link an issue when applicable, and include screenshots or a short recording for UI changes. Call out changes to local data or environment configuration.

After finishing any code change, update AGENTS.md and README.md to reflect it (project structure, commands, conventions, or feature list) in the same commit, then commit and push to the GitHub remote automatically.

## Security & Framework Notes

Keep secrets and machine-specific settings in `.env.local`; never commit them. SQLite files and uploaded images are local runtime data and must not be exposed through new public routes without deliberate access controls. Temporary uploads should only be promoted to permanent attachments when a record is saved. Before changing Next.js APIs, consult the version-matched guidance in `node_modules/next/dist/docs/`.
