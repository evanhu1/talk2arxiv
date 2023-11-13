interface Message {
  text: string;
  sender: 'user' | 'bot';
}

interface MessageListProps {
  messages: Message[];
}
