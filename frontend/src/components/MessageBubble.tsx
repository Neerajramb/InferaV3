import { Bot, User } from 'lucide-react';

import SourceList from './SourceList';
import type { SourceItem } from './SourceList';

interface MessageBubbleProps {
  role: 'user' | 'ai';
  text: string;
  sources?: SourceItem[];
}

export default function MessageBubble({ role, text, sources = [] }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-900 dark:bg-[#000000] dark:text-white'}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-3xl px-4 py-3 text-sm leading-6 ${
            isUser
              ? 'rounded-tr-md bg-black text-white dark:bg-white dark:text-black'
              : 'rounded-tl-md border border-gray-200 bg-white text-gray-900 dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-white'
          }`}
        >
          {text}
        </div>
        {!isUser ? <SourceList sources={sources} /> : null}
      </div>
    </div>
  );
}
