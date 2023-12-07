# talk2arxiv
## Talk to any ArXiv paper using ChatGPT!
Talk2Arxiv is an innovative open-source RAG (Retrieval-Augmented Generation) system specially built for academic paper PDFs. Powered by [talk2arxiv-server](https://github.com/evanhu1/talk2arxiv-server)

![Screenshot](/images/screenshot.png?raw=true "Screenshot")

## Usage
Simply prepend any arxiv.org link with 'talk2' to load the paper into a responsive RAG chat application (e.g. www.arxiv.org/pdf/1706.03762.pdf -> www.talk2arxiv.org/pdf/1706.03762.pdf).

## Installation
Just run `yarn` and then `yarn run dev`.

## Features
- PDF Parsing: Utilizes GROBID for efficient text extraction from PDFs.
- Chunking Algorithm: Custom-built algorithm for optimal text chunking.
- Text Embedding: Uses Cohere's EmbedV3 model for accurate text embeddings.
- Vector Database Integration: Uses Pinecone for storing and querying embeddings.
- Contextual Relevance: Employs a reranking process to select the most relevant content based on user input.

## Technologies Used
Frontend: Developed using Typescript, ReactJS, TailwindCSS, and NextJS.
Backend: Powered by [talk2arxiv-server](https://github.com/evanhu1/talk2arxiv-server), which uses Flask, Gunicorn, and Nginx.

## Roadmap
- Improved chunking strategy
- Use visual understanding LLM models as well
- Account based personalization

## Known Issues
- The backend is not built to handle any level of scale, might fail with a lot of concurrent requests
