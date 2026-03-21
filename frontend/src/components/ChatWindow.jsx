import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const ZENTRIX_LOGO = (
  <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-1">
    ZX
  </div>
);

const ChatWindow = ({ messages, loading }) => {
  const scrollRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ''));
    window.speechSynthesis.speak(utterance);
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-[#0f0f0f]"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}
    >
      <div className="max-w-[720px] mx-auto px-4 py-10 flex flex-col gap-6">
        
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

            {/* Avatar */}
            {msg.role === 'ai' ? ZENTRIX_LOGO : (
              <div className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center shrink-0 mt-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
                </svg>
              </div>
            )}

            {/* Bubble */}
            <div className="flex flex-col gap-1 max-w-[85%]">
              <div className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#2a2a2a] text-white rounded-tr-none'
                  : 'bg-[#1e1e1e] text-white rounded-tl-none'
              }`}>
                {/* 📎 User Attachment Preview */}
                {msg.role === 'user' && msg.attachment && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-white/5 w-fit">
                    <div className="w-6 h-6 rounded bg-[#10a37f]/20 flex items-center justify-center text-[#10a37f]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/></svg>
                    </div>
                    <span className="text-[10px] font-bold truncate max-w-[120px]">{msg.attachment.name}</span>
                  </div>
                )}
                {/* Render markdown properly for AI, plain text for user */}
                {msg.role === 'ai' ? (
                  <div className="prose prose-invert prose-sm max-w-none
                    prose-p:my-1 prose-p:leading-relaxed
                    prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1
                    prose-strong:text-white prose-strong:font-semibold
                    prose-headings:text-white prose-headings:font-semibold prose-headings:my-2">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>

              {/* Action row — only for AI messages */}
              {msg.role === 'ai' && (
                <div className="flex items-center gap-1 px-1 opacity-0 hover:opacity-100 transition-opacity duration-200 group">
                  <button
                    onClick={() => speak(msg.text)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#a0a0a0] hover:text-white hover:bg-[#1e1e1e] transition-all"
                    title="Read aloud"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07"/>
                    </svg>
                    <span>Read</span>
                  </button>
                  <button
                    onClick={() => copy(msg.text)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#a0a0a0] hover:text-white hover:bg-[#1e1e1e] transition-all"
                    title="Copy"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2v-2M16 4h2a2 2 0 012 2v4M12 12h8m0 0l-3-3m3 3l-3 3"/>
                    </svg>
                    <span>Copy</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {loading && (
          <div className="flex gap-3">
            {ZENTRIX_LOGO}
            <div className="bg-[#1e1e1e] rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1.5 items-center h-5">
                <span className="w-1.5 h-1.5 bg-[#a0a0a0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#a0a0a0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#a0a0a0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
};

export default ChatWindow;
