# Repository Guidelines

## Project Structure & Module Organization
Vercel hosts the React single-page app and the domain. A Cloudflare Worker runs the API, and `vercel.json` rewrites `/api/*` to it. In local dev, Vite serves both.

- `src/`: the browser app (Vite, React, Tailwind CSS v4). `src/pages/` holds the two screens (`Home`, `PaperPage`). Reusable UI lives in `src/components/` (`ChatPanel`, `PaperView`, `SelectionPopover`). `src/components/ui/` holds Rare UI components installed with the shadcn CLI. Keep their license header, and keep the rareui.com credit in the home page footer and the README. Hooks and client helpers live in `src/lib/`.
- `worker/`: the Worker. `paper.ts` fetches and processes arXiv HTML, `chat.ts` builds the prompt and streams from OpenRouter, and `index.ts` routes `/api/*`.
- `shared/`: types used by both sides.
- `public/`: static assets. `images/`: images for the README.

Routes mirror arxiv.org (`/abs/<id>`, `/pdf/<id>.pdf`, `/html/<id>`), so swapping the domain in a paper link works.

## Build, Test, and Development Commands
Use Yarn, since `yarn.lock` is checked in.

- `yarn`: install dependencies.
- `yarn dev`: start Vite with the Worker in the local Workers runtime. It needs `OPENROUTER_API_KEY` in `.dev.vars` (see `.dev.vars.example`).
- `yarn build`: type-check and build the app and the Worker.
- `yarn deploy:worker`: build and deploy the Worker. Set its key with `npx wrangler secret put OPENROUTER_API_KEY`. Vercel deploys the site on push to `main`.
- `yarn cf-typegen`: regenerate `worker/worker-configuration.d.ts` after you change `wrangler.jsonc`.

## Coding Style & Naming Conventions
Use TypeScript, React function components, and Tailwind CSS. Name component files in PascalCase (`ChatPanel.tsx`) and helpers in camelCase (`useChat.ts`, `arxiv.ts`).

Use 2-space indentation, single quotes, and no semicolons. Keep components focused. Put API and prompt logic in `src/lib/` or `worker/`, not in JSX-heavy files. Theme colors are CSS variables in `src/index.css`, and styles for LaTeXML paper markup live under `.paper` in the same file.

## Testing Guidelines
There is no automated test suite yet. Treat `yarn build` and a manual check of the main flow as required:

1. Open `/abs/1706.03762` and verify that the paper, figures, and equations render.
2. Highlight a passage, click **Ask AI**, and send a question.
3. Reload and confirm that the chat history persists in `localStorage`.

If you add tests, place them next to the feature or under a small `__tests__/` directory, with names like `ChatPanel.test.tsx`.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries such as `added github icon` and `responsiveness`. Keep commit subjects brief, lowercase is acceptable, and scope each commit to one change.

PRs should include a clear description, manual verification steps, and screenshots or short recordings for UI changes. Link the relevant issue when one exists.

## Security & Configuration Tips
Do not commit API keys. The OpenRouter key is a Worker secret (`.dev.vars` locally, `wrangler secret` in production). `/api/chat` is rate-limited per IP by the `CHAT_LIMITER` binding in `wrangler.jsonc`. Paper HTML is sanitized with DOMPurify in `PaperView` before rendering. Keep it that way, because authors control that content.
