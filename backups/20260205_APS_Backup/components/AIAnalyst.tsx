
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '../services/languageService';

interface AIAnalystProps {
  simulationData?: any;
}

const AIAnalyst: React.FC<AIAnalystProps> = ({ simulationData }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('aps_chat_history');
    return saved ? JSON.parse(saved) : [
      {
        role: 'assistant',
        content: t('ai_welcome_msg'),
        key: 'ai_welcome_msg',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persistence effect
  useEffect(() => {
    localStorage.setItem('aps_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Effect to translate legacy messages or messages with keys when language changes
  useEffect(() => {
    const welcomeMsgEs = '¡Hola! Soy tu Analista IA. He analizado la simulación actual. ¿En qué puedo ayudarte con los retrasos o la carga de máquinas?';
    const errorMsgEs = 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.';

    setMessages(prev => prev.map(m => {
      // Migrate old messages without keys
      if (!m.key) {
        if (m.content === welcomeMsgEs) return { ...m, key: 'ai_welcome_msg' };
        if (m.content === errorMsgEs) return { ...m, key: 'ai_error_msg' };
      }
      return m;
    }));
  }, [t]); // Re-run when translator changes

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await sendMessageToGemini(input, simulationData);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: t('ai_error_msg'),
        key: 'ai_error_msg',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-full lg:w-[350px] flex flex-col border-l border-[var(--border-color)] bg-[var(--bg-sidebar)] shrink-0 h-full transition-colors">
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)]">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
          </div>
          <div>
            <h3 className="text-[var(--text-main)] text-sm font-black uppercase tracking-tighter">{t('ai_analyst_title')}</h3>
            <div className="flex items-center gap-1.5">
              <span className={`block size-1.5 rounded-full ${isTyping ? 'bg-indigo-400' : 'bg-emerald-500'} animate-pulse`}></span>
              <span className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest">{isTyping ? t('ai_analyzing') : t('ai_online')}</span>
            </div>
          </div>
        </div>
        <button className="text-[var(--text-muted)] hover:text-white transition-colors">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col scrollbar-thin scrollbar-thumb-[var(--border-color)]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${msg.role === 'assistant'
              ? 'bg-gradient-to-br from-indigo-600 to-purple-600'
              : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
              }`}>
              <span className="material-symbols-outlined text-white text-xs">
                {msg.role === 'assistant' ? 'smart_toy' : 'person'}
              </span>
            </div>
            <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`p-4 rounded-2xl border ${msg.role === 'assistant'
                ? 'bg-[var(--bg-card)] rounded-tl-none border-indigo-500/20 text-[var(--text-main)] shadow-sm'
                : 'bg-[var(--bg-main)] rounded-tr-none border-[var(--border-color)] text-[var(--text-muted)]'
                }`}>
                <div className="markdown-content text-sm leading-relaxed prose prose-invert prose-p:leading-relaxed prose-li:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.key ? t(msg.key) : msg.content}
                  </ReactMarkdown>
                </div>
              </div>
              <span className="text-[var(--text-muted)] text-[8px] font-bold px-1 uppercase">{msg.timestamp}</span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="size-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 animate-pulse">
              <span className="material-symbols-outlined text-white text-xs">smart_toy</span>
            </div>
            <div className="bg-[var(--bg-card)] p-4 rounded-2xl rounded-tl-none border border-indigo-500/20 flex gap-1.5 items-center">
              <div className="size-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="size-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="size-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder={t('ai_placeholder')}
            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 pr-14 text-sm text-[var(--text-main)] focus:border-indigo-500 outline-none resize-none h-14 min-h-[56px] max-h-32 transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-3 top-3 size-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white hover:bg-indigo-500 transition-all disabled:opacity-30 shadow-lg shadow-indigo-600/20"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
        <p className="text-center text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-3 opacity-60">{t('ai_support_tag')}</p>
      </div>
    </div>

  );
};

export default AIAnalyst;
