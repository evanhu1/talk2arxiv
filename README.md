# Talk2Arxiv

Change `arxiv.org` to `talk2arxiv.org` in any paper link to read the paper and chat with an AI that has read all of it. For example, `arxiv.org/abs/1706.03762` becomes `talk2arxiv.org/abs/1706.03762`.

bioRxiv works the same way: `biorxiv.org/content/10.1101/2021.10.04.463034v2` becomes `talk2biorxiv.org/content/10.1101/2021.10.04.463034v2`.

![Screenshot](/images/screenshot.png?raw=true "Screenshot")

## Features

- **Clean HTML reader.** arXiv papers load from arXiv's HTML5 version (with [ar5iv](https://ar5iv.labs.arxiv.org) as a fallback), with native MathML equations. bioRxiv papers load from bioRxiv's full-text pages. Both get a table of contents and a reading-progress pill.
- **PDF fallback.** Papers with no HTML version yet (new bioRxiv preprints, some arXiv papers) open as a PDF, rendered with [EmbedPDF](https://www.embedpdf.com) (PDFium in WebAssembly). Highlighting and chat work there too; the model reads the PDF itself, figures included.
- **Highlight and ask.** Select any passage and click **Ask AI** or **Explain**. The passage goes to the chat with its equations as LaTeX.
- **Whole-paper context.** No chunking, embeddings, or vector database. The full paper text goes into the model's context, and OpenAI's prompt cache reuses it for each question.
- **Local history.** Each paper's chat stays in your browser's `localStorage`.

Papers that are too long for the context window (about 800K tokens) get a clear error message. So do papers that arXiv has not rendered as HTML.

## How it works

- **Vercel** hosts the React app (Vite, Tailwind CSS, Rare UI components) and both domains (talk2arxiv.org and talk2biorxiv.org). It rewrites `/api/*` to the Worker, so the browser sees one origin, and its CDN caches papers.
- **A Cloudflare Worker** runs the API:
  - `GET /api/paper/:id` fetches the arXiv HTML or bioRxiv full-text page, makes image and link URLs absolute, and extracts plain text with LaTeX math. bioRxiv blocks most servers but allows Cloudflare's network, so bioRxiv papers may fail from a local dev server.
  - `GET /api/pdf/:id` serves the paper's PDF, for the PDF fallback and for the model.
  - `GET /api/meta/:id` returns a paper's title and abstract. `middleware.ts` uses it to give link-preview bots "Talk to {title}" tags.
  - `POST /api/chat` puts the paper text and the conversation into one prompt. It sends the prompt to GPT-6 Luna (`openai/gpt-6-luna`) through OpenRouter, on the OpenAI provider, and streams the answer back.

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

Animated components (`src/components/ui/`) come from [Rare UI](https://rareui.com), under its MIT + Commons Clause + Attribution license.
