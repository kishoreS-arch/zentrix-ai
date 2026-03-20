import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const ChatWindow = ({ messages, loading }) => {
  const endRef = useRef(null);
  const [speakingIdx, setSpeakingIdx] = useState(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const speakText = (text, idx) => {
    if ('speechSynthesis' in window) {
      if (speakingIdx === idx) {
        window.speechSynthesis.cancel();
        setSpeakingIdx(null);
        return;
      }
      
      window.speechSynthesis.cancel(); // Stop playing current
      
      // Clean up markdown syntax for better speech
      const cleanText = text.replace(/[*_#]/g, '').replace(/📄 Found in local records.*:/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      utterance.onend = () => setSpeakingIdx(null);
      setSpeakingIdx(idx);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar flex flex-col space-y-6 bg-sec-dark bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-sec-dark to-sec-dark transition-colors">
      {messages.map((msg, i) => (
        <div 
          key={i} 
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
        >
          <div 
            className={`max-w-[90%] md:max-w-[75%] p-4 md:p-5 rounded-2xl shadow-xl relative transition-all
              ${msg.role === 'user' 
                ? 'bg-sec-accent text-white rounded-br-none' 
                : 'bg-sec-panel text-slate-200 rounded-bl-none border border-sec-border/50'
              }`}
          >
            {msg.role === 'ai' && (
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-sec-border/30">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">🤖</span>
                  <span className="text-[10px] font-bold text-sec-accent uppercase tracking-widest">
                    SEC AI
                  </span>
                  {msg.source && (
                    <span className={`hidden sm:inline-block text-[8px] px-1.5 py-0.5 rounded-full uppercase font-mono ${
                      msg.source === 'groq' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {msg.source === 'groq' ? '✨ AI Core' : '📁 Local DB'}
                    </span>
                  )}
                </div>
                
                {/* 🔊 Voice Output Button */}
                <button 
                  onClick={() => speakText(msg.text, i)}
                  className="p-1 rounded bg-black/20 hover:bg-black/40 text-slate-400 hover:text-white transition-colors"
                  title={speakingIdx === i ? "Stop Speaking" : "Read Aloud"}
                >
                  {speakingIdx === i ? '🔇' : '🔊'}
                </button>
              </div>
            )}
            
            {msg.role === 'user' && (
              <div className="flex items-center justify-end gap-2 mb-2 pb-2 border-b border-white/20">
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                  You
                </span>
                <span className="text-base leading-none">🧑‍💻</span>
              </div>
            )}
            
            <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert text-white' : 'dark:prose-invert text-slate-800 dark:text-slate-300'}`}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        </div>
      ))}

      {/* Loading Animation */}
      {loading && (
        <div className="flex justify-start animate-fadeIn">
          <div className="bg-sec-panel text-slate-400 p-5 rounded-2xl rounded-bl-none border border-sec-border/50 shadow-xl">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-sec-border/30">
              <span className="text-[10px] font-bold text-sec-accent uppercase tracking-widest">🤖 SEC AI</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 uppercase font-mono animate-pulse">Thinking...</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-sec-accent rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                <span className="w-2 h-2 bg-sec-accent rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                <span className="w-2 h-2 bg-sec-accent rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
              </div>
              <span className="text-xs text-slate-500 font-mono">Processing your query...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
};

export default ChatWindow;
