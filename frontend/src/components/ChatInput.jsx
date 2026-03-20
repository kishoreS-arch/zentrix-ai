import React, { useState, useEffect } from 'react';

const ChatInput = ({ onSend, loading }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Listen for quick question events from sidebar
  useEffect(() => {
    const handler = (e) => {
      setText(e.detail);
    };
    window.addEventListener('quickQuestion', handler);
    return () => window.removeEventListener('quickQuestion', handler);
  }, []);

  // 🎙️ Voice Input
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !loading) {
      onSend(text.trim());
      setText('');
    }
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <section className="bg-sec-dark/70 backdrop-blur-md border-t border-sec-border p-4 md:p-6 flex items-center justify-center shrink-0">
      <form onSubmit={handleSubmit} className="w-full max-w-4xl relative overflow-hidden rounded-2xl border border-sec-border bg-sec-panel shadow-2xl flex items-center p-1.5 md:p-2 group transition-all focus-within:ring-2 focus-within:ring-sec-accent focus-within:border-sec-accent">
        
        {/* 🎙️ Microphone */}
        <button 
           type="button" 
           onClick={startVoiceInput}
           className={`p-2.5 md:p-3 rounded-xl transition-all shrink-0 ${
             isListening 
               ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' 
               : 'hover:bg-slate-800 text-slate-400 hover:text-white'
           }`}
           title={isListening ? "Listening..." : "Voice Input"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "AI is thinking..." : "Ask about SEC — courses, fees, placements, events..."}
          className="flex-1 bg-transparent border-none outline-none text-slate-200 px-3 md:px-4 text-sm md:text-base font-medium placeholder:text-slate-600 disabled:opacity-50 min-w-0"
          disabled={loading}
          autoFocus
        />

        {/* 🚀 Send */}
        <button 
           type="submit" 
           disabled={loading || !text.trim()}
           className="bg-sec-accent hover:bg-blue-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold tracking-wider uppercase transition-all flex items-center gap-2 text-sm shrink-0"
        >
          {loading ? (
             <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>Send ⚡</>
          )}
        </button>
      </form>
    </section>
  );
};

export default ChatInput;
