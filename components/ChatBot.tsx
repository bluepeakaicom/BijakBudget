
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ExternalLink } from 'lucide-react';
import { sendMessageToChat } from '../services/gemini';
import { ChatMessage, GroundingChunk, UserData } from '../types';

interface ChatBotProps {
    user: UserData;
}

export const ChatBot: React.FC<ChatBotProps> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `Hi ${user.name}! Bossku, how can I help you save money today? Ask me about grocery prices, SARA eligibility, or shops near ${user.address ? 'your area' : 'you'}.` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [groundingChunks, setGroundingChunks] = useState<Record<string, GroundingChunk[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessageToChat(userMsg.text, user);
      const botMsgId = (Date.now() + 1).toString();
      
      const botMsg: ChatMessage = { 
        id: botMsgId, 
        role: 'model', 
        text: response.text || "Sorry boss, I couldn't think of an answer." 
      };
      
      setMessages(prev => [...prev, botMsg]);
      if (response.groundingChunks && response.groundingChunks.length > 0) {
        setGroundingChunks(prev => ({ ...prev, [botMsgId]: response.groundingChunks }));
      }
    } catch (error: any) {
      const msg = error.message && error.message.includes("Quota") 
        ? "Sorry boss, server busy (Quota Exceeded). Try again later." 
        : "Sorry boss, connection error. Please try again.";
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: msg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSources = (msgId: string) => {
    const chunks = groundingChunks[msgId];
    if (!chunks) return null;
    
    // Deduplicate and filter sources
    const uniqueSources: { uri: string; title: string }[] = [];
    const seenUris = new Set<string>();

    chunks.forEach(chunk => {
      if (chunk.web && chunk.web.uri && chunk.web.title) {
        if (!seenUris.has(chunk.web.uri)) {
          seenUris.add(chunk.web.uri);
          uniqueSources.push({
            uri: chunk.web.uri,
            title: chunk.web.title
          });
        }
      }
    });
      
    if (uniqueSources.length === 0) return null;

    return (
      <div className="mt-2 pt-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-1">Sources:</p>
        <div className="flex flex-wrap gap-2">
          {uniqueSources.map((s, i) => (
             <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded hover:underline hover:bg-teal-100 transition-colors hover:shadow-sm">
               <ExternalLink className="w-3 h-3" />
               {s.title || "Source"}
             </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in hover:shadow-xl transition-shadow duration-300 ring-1 ring-slate-100">
      <div className="bg-gradient-to-r from-teal-50 to-white p-4 border-b border-teal-100 flex items-center gap-2">
        <div className="bg-teal-100 p-1.5 rounded-lg shadow-sm">
           <Sparkles className="w-5 h-5 text-teal-600" />
        </div>
        <h2 className="font-bold text-gray-800">Bijak AI Assistant</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''} group`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110 ${msg.role === 'user' ? 'bg-indigo-100' : 'bg-teal-100'}`}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-indigo-600" /> : <Bot className="w-5 h-5 text-teal-600" />}
            </div>
            <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all hover:shadow-md ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm hover:-translate-x-1' 
                : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100 hover:translate-x-1'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {renderSources(msg.id)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm">
               <Bot className="w-5 h-5 text-teal-600" />
            </div>
            <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex space-x-1.5 items-center h-5">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about subsidies, savings..."
            className="flex-1 pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:bg-white focus:border-teal-500 text-sm hover:border-teal-300 transition-all shadow-inner"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1.5 bg-teal-600 text-white p-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
