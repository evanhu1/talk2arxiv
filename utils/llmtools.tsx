import { Message, LLMStatus } from './types';
import OpenAI from "openai";

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

const GROBID_SERVER_URL = "https://server.talk2arxiv.org";
// const GROBID_SERVER_URL = "http://18.191.167.109:5328";

const getBotReply = async (message: string, messages: Message[], paper_id: string, setLlmStatus: any, openAIKey: string) => {
  setLlmStatus(LLMStatus.THINKING);
  const prompt = await getContextAndConstructPrompt(message, messages, paper_id);
  console.log(prompt);
  const memoizedOpenAI = new OpenAI({apiKey: openAIKey, dangerouslyAllowBrowser: true });

  if (prompt === "") {
    setLlmStatus(LLMStatus.ERROR);
    return "Embedding server is down. Please try again later."
  }
  
  if (openAIKey !== "") {
    return await memoizedOpenAI.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo-1106",
      temperature: 0,
    })
    .then((res) => {
      setLlmStatus(LLMStatus.SUCCESS);
      return res.choices[0].message.content
    })
    .catch((err) => {
      setLlmStatus(LLMStatus.ERROR);
      return err.toString();
    });
  } else {
    const response = await chatOpenAIBackend(prompt)
    if (response === "") {
      setLlmStatus(LLMStatus.ERROR);
      return "OpenAI is unreachable. Please try again later."
    }
    setLlmStatus(LLMStatus.SUCCESS);
    return response;
  }
}

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

const chatOpenAIBackend = async (prompt: string) => {
  try {
    const response = await fetch(GROBID_SERVER_URL + '/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ "prompt": prompt }),
    });
    return await response.json();
  } catch (err) {
    console.error(err);
    return "";
  }
}

const getContextAndConstructPrompt = async (message: string, messages: Message[], paper_id: string) => {
  const userInput = message;

  const lastMessages = messages.slice(Math.max(messages.length - 2, 0)).reduce((acc, msg) => {
    if (msg.sender === 'user') {
      return acc + `User: ${msg.text}\nAI: `;
    } else {
      return acc + `User: \nAI: ${msg.text}\n`;
    }
  }, '');

  let context;
  let attempts = 4;
  while (attempts > 0) {
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, 4 - attempts) * 1000));
    try {
      context = await fetch(GROBID_SERVER_URL + '/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "query": userInput, "paper_id": paper_id }),
      }).then((res) => res.json());
      break; // Break the loop if fetch is successful
    } catch (err) {
      attempts--;
      if (attempts === 0) {
        context = { status: 'error', data: [] };
      }
    }
  }

  if (context.status === 'success') {
    return PROMPT_TEMPLATE(lastMessages, context.data, userInput, context.paper_title);
  }
  return "";
}

export { getContextAndConstructPrompt as constructPrompt, insertPDF, chatOpenAIBackend, getBotReply };
