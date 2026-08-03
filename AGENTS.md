# Repository Guidelines

This repository is a Next.js 16 TypeScript application for storing, reviewing, and processing study records for postgraduate-exam Mathematics and 408. Keep changes focused, type-safe, and consistent with the App Router structure.

## Project Structure & Module Organization

- `src/app/` contains pages, layouts, and App Router API handlers under `src/app/api/`.
- `src/components/` contains reusable UI components for the workspace, OCR upload, Markdown/LaTeX preview, record details, and review flow.
- `src/lib/` contains SQLite access, temporary/permanent image handling, OCR prompts, SM-2 scheduling, constants, and shared types.
- `public/` contains static assets. Do not add a new public route that exposes local study data.
- `data/` is runtime state: SQLite files, WAL files, temporary images, and uploaded images. Treat it as local application data, not source code.
- Root configuration lives in `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, and `postcss.config.mjs`.

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

## Security & Framework Notes

Keep secrets and machine-specific settings in `.env.local`; never commit them. SQLite files and uploaded images are local runtime data and must not be exposed through new public routes without deliberate access controls. Temporary uploads should only be promoted to permanent attachments when a record is saved. Before changing Next.js APIs, consult the version-matched guidance in `node_modules/next/dist/docs/`.
