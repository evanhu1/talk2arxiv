interface Message {
  sender: 'user' | 'bot';
  text: string;
}
interface MessageListProps {
  messages: Message[];
}

enum LLMStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  THINKING = 'thinking',
  SUCCESS = 'success',
  ERROR = 'error',
}

export type { Message, MessageListProps };
export { LLMStatus };
