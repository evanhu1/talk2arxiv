import { Message } from './types';

const PROMPT_TEMPLATE = (history: string, context: string[], question: string, paperTitle: string) => `
You are a chatbot built to help readers understand research papers. Context information and chat history is provided below. Given the context information and not prior knowledge, provide detailed answer to the question. Use the context information whenever possible. ${paperTitle && "The current paper is " + paperTitle}}.

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

const GROBID_SERVER_URL = "http://localhost:5328";

const insertPDF = async (paper_id: string) => {
  try {
    const response = await fetch(GROBID_SERVER_URL + '/insert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ "paper_id": paper_id }),
    });
    await response.json();
  } catch (err) {
    console.error(err);
  }
}

const constructPrompt = async (message: string, messages: Message[], paper_id: string) => {
  const userInput = message;

  const lastFiveMessages = messages.slice(Math.max(messages.length - 5, 0)).reduce((acc, msg) => {
    if (msg.sender === 'user') {
      return acc + `User: ${msg.text}\nAI: `;
    } else {
      return acc + `User: \nAI: ${msg.text}\n`;
    }
  }, '');

  const context = await fetch(GROBID_SERVER_URL + '/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ "query": userInput, "paper_id": paper_id }),
  }).then((res) => res.json()).catch((err) => {console.log(err); return { status: 'error', data: [] }});

  if (context.status === 'success') {
    return PROMPT_TEMPLATE(lastFiveMessages, context.data, userInput, context.paper_title);
  }
  return "";
}

export { constructPrompt, insertPDF };
