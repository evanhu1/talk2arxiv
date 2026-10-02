# Talk2Arxiv

Change `arxiv.org` to `talk2arxiv.org` in any paper link to read the paper and chat with an AI that has read all of it. For example, `arxiv.org/abs/1706.03762` becomes `talk2arxiv.org/abs/1706.03762`.

bioRxiv works the same way: `biorxiv.org/content/10.1101/2021.10.04.463034v2` becomes `talk2biorxiv.org/content/10.1101/2021.10.04.463034v2`.

![Screenshot](/images/screenshot.png?raw=true "Screenshot")

## Features

- **Clean HTML reader.** arXiv papers load from arXiv's HTML5 version (with [ar5iv](https://ar5iv.labs.arxiv.org) as a fallback), with native MathML equations. bioRxiv papers load from bioRxiv's full-text pages. Both get a table of contents and a reading-progress pill.
- **PDF fallback.** Papers with no HTML version yet (new bioRxiv preprints, some arXiv papers) open as a PDF, rendered with [EmbedPDF](https://www.embedpdf.com) (PDFium in WebAssembly). Highlighting and chat work there too; the model reads the PDF itself, figures included.
- **Highlight and ask.** Select any passage and click **Ask AI** or **Explain**. The passage goes to the chat with its equations as LaTeX.
- **Citation previews.** Click a bibliography citation in an HTML paper to preview it in a card, or a bottom sheet on mobile. **Ask about this paper** adds the cited paper to chat alongside the original. arXiv and bioRxiv references use full text or PDF when available; other matched references use their abstract and clearly identify that limitation. References without available text cannot be attached.
- **Mobile reading.** A section tracker at the top, a floating glass composer, and a swipe-dismissable chat sheet keep the paper in place. Drafts survive opening and closing chat.
- **Starting prompts.** Summarize the paper, map its claims to specific evidence, or ask about its method and limitations.
- **Whole-paper context.** No chunking, embeddings, or vector database. The full paper text goes into the model's context, and OpenAI's prompt cache reuses it for each question.
- **Cached answers.** Identical questions with the same paper and conversation reuse completed answers, including the starting prompts. Cache hits stream back into chat; **Regenerate** requests a fresh answer. Partial, stopped, and failed generations are never cached.
- **Author context.** Chat automatically gets one combined index of the paper authors’ other works: up to 100 unique papers ranked by citation count, available abstracts for the top 10, matching authors and links, then `+ N more`. Shared works and preprint/journal versions are merged, and the current paper is excluded.
- **Local history.** Each paper's chat stays in your browser's `localStorage`.

Papers that are too long for the context window (about 800K tokens) get a clear error message. So do papers that arXiv has not rendered as HTML.

## How it works

- **Vercel** hosts the React app (Vite, Tailwind CSS, Rare UI components) and both domains (talk2arxiv.org and talk2biorxiv.org). It rewrites `/api/*` to the Worker, so the browser sees one origin, and its CDN caches papers.
- **A Cloudflare Worker** runs the API:
  - `GET /api/paper/:id` fetches the arXiv HTML or bioRxiv full-text page, makes image and link URLs absolute, and extracts plain text with LaTeX math. bioRxiv blocks most servers but allows Cloudflare's network, so bioRxiv papers may fail from a local dev server.
  - `GET /api/pdf/:id` serves the paper's PDF, for the PDF fallback and for the model.
  - `GET /api/meta/:id` returns a paper's title and abstract. `middleware.ts` uses it to give link-preview bots "Talk to {title}" tags.
  - `GET /api/citation?paperId=...&referenceId=...` resolves a reference from the original bibliography using arXiv IDs, DOIs, or matching titles and authors. Metadata comes from arXiv and Crossref and is cached.
  - `POST /api/chat` puts the paper text and the conversation into one prompt. It sends the prompt to GPT-6 Luna (`openai/gpt-6-luna`) through OpenRouter, on the OpenAI provider, and streams the answer back.

Answer caching uses the Cloudflare Cache API, shared among readers at the same Cloudflare location. Entries expire after seven days (six hours for unversioned PDF URLs). Keys hash the exact model request, including model settings, system prompts, paper text, cited context, quotations, and conversation history; raw questions are not stored in cache URLs. A cache hit skips the model call. Cache failures fall back to normal chat, and responses sent to the browser remain `no-store`. `X-Answer-Cache` reports `HIT`, `MISS`, or `BYPASS` for verification.

Author context uses OpenAlex identities resolved from the current paper’s DOI or exact title and byline. It considers all authors, marks unresolved identities, and uses OR queries across authors before deduplicating by DOI, arXiv ID, and normalized title. Merged versions use their maximum citation count. It starts warming on paper load and caches the combined index for a day (five minutes for incomplete or unavailable results). Retrieval has a 20-second / 40-page budget; a partial lookup is identified as such in the model context, and `+ N more` counts omitted unique works actually retrieved. Provider failures do not prevent ordinary paper chat. The index is part of the answer-cache key and is omitted if it would exceed the paper-context budget. `X-Author-Index`, `X-Author-Index-Authors`, and `X-Author-Index-Papers` expose retrieval status and counts on chat responses. An optional `OPENALEX_API_KEY` Worker secret / local `.dev.vars` entry can authenticate provider requests; the unauthenticated path is supported.

## Development

1. Install dependencies:

   ```sh
   yarn
   ```

2. Put your OpenRouter key in `.dev.vars`:

   ```sh
   cp .dev.vars.example .dev.vars
   ```

3. Start the dev server. It runs the Worker in the real Workers runtime:

   ```sh
   yarn dev
   ```

Run `yarn test` for citation matching and chat-context checks, and `yarn build` to type-check and build both the app and Worker. Manually verify citation previews on desktop and mobile, passage selection, chat streaming, and history after reload.

## Deployment

1. Deploy the Worker, and set its OpenRouter key:

   ```sh
   yarn deploy:worker
   npx wrangler secret put OPENROUTER_API_KEY
   ```

2. If the Worker's URL changes, update the `/api` rewrite in `vercel.json`.
3. Push to `main`. Vercel builds and deploys the site.

## Credits

Papers come from [arXiv](https://arxiv.org). Thank you to arXiv for use of its open access interoperability.

Animated reader components come from [Rare UI](https://rareui.com), under its MIT + Commons Clause + Attribution license. Bottom sheets use [Vaul](https://vaul.emilkowal.ski/) and citation cards use [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover), styled with the app's theme.
