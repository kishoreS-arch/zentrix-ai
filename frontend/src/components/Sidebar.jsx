import React from 'react';

const Sidebar = ({ setLanguage, currentLanguage, sources = [], backendStatus, theme, toggleTheme, onNewChat, chatHistory = [] }) => {
  return (
    <aside className="w-64 bg-sec-panel border-r border-sec-border flex-col p-6 hidden md:flex h-full overflow-y-auto">
      {/* Logo Area */}
      <div className="mb-6 pb-4 border-b border-sec-border">
        <h1 className="text-lg font-black text-white tracking-tight">🎓 SEC AI Agent</h1>
        <p className="text-[10px] text-slate-500 font-mono mt-1">Sudharsan Engineering College</p>
      </div>
      
      {/* New Chat Button */}
      <button 
        onClick={onNewChat}
        className="w-full flex items-center justify-center gap-2 bg-sec-accent hover:bg-opacity-90 transition-all font-bold text-sm text-white py-2.5 rounded-xl shadow-lg shadow-sec-accent/20 mb-8"
      >
        <span>+</span> New Chat
      </button>

      {/* Chat History */}
      <div className="mb-8">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          🕒 Chat History
        </h2>
        <ul className="space-y-2">
          {chatHistory.length > 0 ? chatHistory.slice(-5).map((chat, idx) => (
             <li key={idx} className="flex items-center gap-3 text-xs hover:text-white transition-colors cursor-pointer group truncate">
                <span className="text-slate-500">💬</span>
                <span className="text-slate-300 truncate">{chat.question}</span>
             </li>
          )) : (
            <li className="text-xs text-slate-600">No recent history</li>
          )}
        </ul>
      </div>

      {/* Quick Questions */}
      <div className="mb-8">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">💡 Quick Questions</h2>
        <div className="space-y-2">
          {[
            "What courses are offered?",
            "What is the fee structure?",
            "Tell me about placements",
            "College rules",
            "Contact info",
            "Events and clubs"
          ].map(q => (
            <button
              key={q}
              onClick={() => {
                // Dispatch a custom event to fill the input
                window.dispatchEvent(new CustomEvent('quickQuestion', { detail: q }));
              }}
              className="w-full text-left text-[11px] text-slate-400 hover:text-white hover:bg-sec-border/30 px-3 py-2 rounded-lg transition-all truncate"
            >
              → {q}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="mb-6">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">🎨 Appearance</h2>
        <button 
          onClick={toggleTheme}
          className="flex items-center gap-2 w-full text-left text-xs text-slate-400 hover:text-white hover:bg-sec-border/30 px-3 py-2 rounded-lg transition-all"
        >
          {theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
        </button>
      </div>

      {/* Language */}
      <div className="mb-8">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">🌍 Language</h2>
        <div className="flex gap-2">
           {[
             { code: 'en', label: 'EN' },
             { code: 'ta', label: 'TA' }
           ].map(lang => (
              <button 
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${
                  currentLanguage === lang.code 
                    ? 'border-sec-accent bg-sec-accent text-white shadow-lg shadow-sec-accent/20' 
                    : 'border-sec-border text-slate-500 hover:border-slate-500'
                }`}
              >
                {lang.label}
              </button>
           ))}
        </div>
      </div>

      {/* System Status */}
      <div className="mt-auto pt-6 border-t border-sec-border">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">System Status</h2>
          <div className="space-y-1.5">
            <p className={`text-[10px] uppercase font-mono flex items-center gap-2 ${
              backendStatus === 'online' ? 'text-emerald-500' : 'text-red-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                backendStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500'
              }`}></span>
              Backend: {backendStatus}
            </p>
            <p className="text-[10px] uppercase font-mono text-emerald-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Frontend: Online
            </p>
            <p className="text-[10px] uppercase font-mono text-slate-600 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              Model: Llama 3 70B (Groq)
            </p>
          </div>
      </div>
    </aside>
  );
};

export default Sidebar;
