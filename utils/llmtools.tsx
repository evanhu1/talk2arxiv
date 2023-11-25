import { Message } from './types';

const PROMPT_TEMPLATE = (history: string, context: string[], question: string) => `
You are a chatbot built to help readers understand research papers. Context information and chat history is provided below. Given the context information and not prior knowledge, provide detailed answer to the question. Use the context information whenever possible.

### Context:
---------------------
${context}
---------------------

### Chat History:
---------------------
${history}
---------------------

### Question: ${question}
`

const constructPrompt = async (message: string, messages: Message[]) => {
  const userInput = message;

  const lastFiveMessages = messages.slice(Math.max(messages.length - 5, 0)).reduce((acc, msg) => {
    if (msg.sender === 'user') {
      return acc + `User: ${msg.text}\nAI: `;
    } else {
      return acc + `User: \nAI: ${msg.text}\n`;
    }
  }, '');

  const context = await fetch('http://localhost:3000/api/embeddings/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ "query": userInput, "pdfId": window.location.pathname.substring(1) }),
  }).then((res) => res.json()).catch((err) => {console.log(err); return { status: 'error', data: [] }});

  if (context.status === 'success') {
    return PROMPT_TEMPLATE(lastFiveMessages, context.data, userInput);
  }
  return "";
}

export { constructPrompt };
