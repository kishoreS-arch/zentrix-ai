import React, { useState, useEffect, useRef } from 'react';

const ChatInput = ({ onSend, loading, backendStatus, onStop }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // 🎤 Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile(file);
    }
    e.target.value = null; // Clear input
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((input.trim() || attachedFile) && !loading && backendStatus === 'online') {
      onSend(input, attachedFile);
      setInput('');
      setAttachedFile(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-8 w-full animate-fade-in">
      
      {/* 📎 File Preview Bubble */}
      {attachedFile && (
        <div className="mb-3 flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-fit animate-fade-in shadow-xl">
          <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/10 flex items-center justify-center text-[#00e5ff]">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/></svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white truncate max-w-[150px]">{attachedFile.name}</span>
            <span className="text-[9px] text-[#a0a0a0] uppercase tracking-wider">{(attachedFile.size / 1024).toFixed(1)} KB</span>
          </div>
          <button 
            type="button"
            onClick={() => setAttachedFile(null)}
            className="p-1 hover:bg-[#2a2a2a] rounded-full text-[#a0a0a0] hover:text-white transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-2 px-4 shadow-2xl focus-within:border-[#00e5ff]/50 transition-all flex-nowrap relative">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
          accept=".txt,.pdf,.png,.jpg,.jpeg,.docx" 
        />
        
        {/* 🖇️ Attachment Button */}
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-[#a0a0a0] hover:text-white transition-all shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Ask Zentrix..."
          className="flex-1 bg-transparent border-none outline-none py-3 px-2 text-[15px] font-medium placeholder:text-[#a0a0a0] text-white min-w-0"
        />

        <div className="flex items-center gap-1 shrink-0">
           {/* 🎤 Voice Button */}
           <button 
            type="button" 
            onClick={toggleVoice}
            className={`p-2 rounded-lg transition-all ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-[#a0a0a0] hover:text-white'}`}
            title={isListening ? "Listening..." : "Voice Input"}
           >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><path d="M12 19v4M8 23h8"/></svg>
           </button>

           {/* 🚀 Send / Stop Button */}
           <button 
             type="button" 
             onClick={loading ? onStop : handleSubmit}
             disabled={(!input.trim() && !attachedFile) && !loading}
             className={`p-2 rounded-lg transition-all flex items-center justify-center w-10 h-10 ${
               (!input.trim() && !attachedFile) && !loading
                 ? 'text-[#a0a0a0]/30 cursor-not-allowed'
                 : loading
                 ? 'text-white bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#3a3a3a]'
                 : 'text-[#00e5ff] bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 active:scale-90'
             }`}
           >
              {loading ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              )}
           </button>
        </div>
      </form>
      
      {/* 🚀 Short Status Tag */}
      <div className="flex justify-center mt-3">
         <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 opacity-40">
            <div className={`w-1 h-1 rounded-full ${backendStatus === 'online' ? 'bg-[#00e5ff] shadow-[0_0_4px_#00e5ff]' : 'bg-red-500'}`}></div>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#a0a0a0]">ZENTRIX_NODE_{backendStatus === 'online' ? 'STABLE' : 'FAIL'}</span>
         </div>
      </div>
    </div>
  );
};

export default ChatInput;
