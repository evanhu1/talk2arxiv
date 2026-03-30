# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the Next.js App Router entrypoints, including the default redirect in `app/page.tsx` and the paper chat route in `app/pdf/[paper_id]/page.tsx`. Reusable UI lives in `components/` (`MessageForm`, `MessageList`, `PaperViewer`). Shared types and client-side API helpers live in `utils/`. Static assets belong in `public/`; repository images used in docs live in `images/`.

This repo is primarily the frontend. The chat and PDF ingestion backend is an external service referenced from `utils/llmtools.tsx`.

## Build, Test, and Development Commands
Use Yarn, since `yarn.lock` is checked in.

- `yarn`: install frontend dependencies.
- `yarn dev`: start the Next.js dev server at `http://localhost:3000`.
- `yarn build`: create the production build.
- `yarn start`: run the production build locally.
- `yarn lint`: run `next lint` with the shared Next.js rules.
- `poetry install`: install the Python dependencies declared in `pyproject.toml` if you need that environment for related tooling.

## Coding Style & Naming Conventions
The codebase uses TypeScript, React function components, and Tailwind CSS. Follow the existing pattern: component files in PascalCase (`MessageForm.tsx`), shared helpers/types in lower-case utility files (`llmtools.tsx`, `types.tsx`), and route folders that mirror URL structure.

Prefer 2-space indentation, single quotes, and semicolon-free style to match the current frontend files. Run `yarn lint` before opening a PR. Keep components focused; move API or prompt-building logic into `utils/` instead of embedding it in JSX-heavy files.

## Testing Guidelines
There is no automated test suite configured yet. For now, treat `yarn lint` and a manual check of the main flow as required: open `/pdf/<paper_id>.pdf`, verify the PDF renders, send a prompt, and confirm chat history persists in `localStorage`.

If you add tests, place them next to the feature or under a small `__tests__/` directory and use names like `MessageForm.test.tsx`.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries such as `added github icon` and `responsiveness`. Keep commit subjects brief, lowercase is acceptable, and scope each commit to one change.

PRs should include a clear description, manual verification steps, and screenshots or short recordings for UI changes. Link the relevant issue when one exists, and note any backend assumptions or API changes that affect `talk2arxiv-server`.

## Security & Configuration Tips
Do not commit API keys or sample secrets. The UI stores an optional OpenAI key in browser `localStorage`; keep that behavior in mind when changing auth or prompt flows.
