# Repository Guidelines

## Project Structure & Module Organization
LinkDAO keeps code inside `app/`. `app/frontend` contains the Next.js client with domain folders (`components`, `hooks`, `services`), tests in `src/__tests__`, assets under `public`. `app/backend` exposes the Express/TypeScript API with layered `controllers`, `services`, `routes`, `db`, and scenario suites in `src/tests`. Contracts, mobile builds, and shared automation sit in `app/contracts`, `app/mobile`, and `app/scripts`. Root-level scripts and infra configs support deployments.

## Build, Test, and Development Commands
Run `npm install` at the root, then inside each module on first clone. `npm run dev` (root) installs and starts the frontend on :3006; `npm run build` emits its production bundle. Inside `app/frontend`, use `npm run lint` and `npm run type-check` before merging. For the API, `cd app/backend && npm run dev` starts ts-node, `npm start` runs the optimized build, and migrations use `npm run migrate` or `npm run seed:test`. `start-services.sh` orchestrates full-stack bootstrapping.

## Coding Style & Naming Conventions
Stick to 2-space indentation and TypeScript-first files. React pages and components stay PascalCase (`FeedView.tsx`), hooks begin with `use`, utilities remain camelCase. Resolve imports via the `@/` alias shared by tsconfig and Jest. Run `npm run lint` in the frontend and keep Tailwind classes sorted; backend middleware should remain thin and delegate to services and typed DTOs.

## Testing Guidelines
Frontend tests use Jest with `jsdom`; target suites via `npm run test:unit`, `...:integration`, `...:e2e`, or `npm run test:coverage` to satisfy the ≥80% global / ≥85% components thresholds. Feed and community modules have dedicated configs (`npm run test:feed`, `npm run test:community`). Backend suites live in `app/backend/tests`; use `npm test` for the full run, `npm run test:marketplace:*` for domain checks, and `npm run test:infrastructure:*` before deployments. Coverage reports land in `app/backend/coverage`.

## Commit & Pull Request Guidelines
Commit subjects should mirror recent history: short, present-tense summaries under 72 characters (`redesign the marketplace ui`). Expand details in the body when cross-cutting changes ship and reference issues as `Refs #123`. Pull requests need: concise context bullets, a testing section listing the executed commands, and screenshots or curl traces for any UI or API change. Tag both frontend and backend owners when contracts move.

## Security & Configuration Tips
Prime local secrets with `node app/setup-env.js`, then replace placeholders such as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. Keep `.env*` files out of Git and store production keys in your secret manager. Drizzle migrations read environment variables, so sync database settings before `npm run migrate`. Run `npm run health` inside `app/backend` to confirm the API is ready on port 10000 before pushing a release.
