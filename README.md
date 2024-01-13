# Prepend any arxiv.org link with 'talk2' to load the paper into a responsive RAG chat application (e.g. www.arxiv.org/pdf/1706.03762.pdf -> www.talk2arxiv.org/pdf/1706.03762.pdf).
Talk2Arxiv is an open-source RAG (Retrieval-Augmented Generation) system specially built for academic paper PDFs. Powered by [talk2arxiv-server](https://github.com/evanhu1/talk2arxiv-server)

![Screenshot](/images/screenshot.png?raw=true "Screenshot")

## Installation
Just run `yarn` and then `yarn run dev`.

## Features
- PDF Parsing: Utilizes GROBID for efficient text extraction from PDFs.
- Chunking Algorithm: Custom-built algorithm for optimal text chunking. Chunks by logical section (intro, abstract, authors, etc.) and also utilizes recursive subdivision chunking (chunk at 512 characters, then 256, then 128...)
- Text Embedding: Uses Cohere's EmbedV3 model for accurate text embeddings.
- Vector Database Integration: Uses Qdrant for storing and querying embeddings. This also functions to cache research papers so a paper only ever needs to be embedded once.
- Contextual Relevance: Employs a reranking process to select the most relevant content based on user input.

## Technologies Used
Frontend: Developed using Typescript, ReactJS, TailwindCSS, and NextJS.
Backend: Powered by [talk2arxiv-server](https://github.com/evanhu1/talk2arxiv-server), which uses Flask, Gunicorn, and Nginx.

## Roadmap
- Improved chunking strategy
- Switch to extracting source LaTeX code to increase retrieval effectiveness for symbolic math formulas and non standard text elements
- Use visual understanding LLM models as well
- Account based personalization

## Known Issues
- The backend is not built to handle any level of scale, with lots of concurrent requests it will stall as it single threadedly handles them
  
