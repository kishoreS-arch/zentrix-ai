import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const App = () => {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('sec_chat_messages');
    if (saved) return JSON.parse(saved);
    return [{ role: 'ai', text: '// SYSTEM_CORE INITIALIZED // v2.0\nWelcome! I am the SEC AI — the official virtual assistant for Sudharsan Engineering College.\n\nI can help you with:\n• 📚 Departments & Courses\n• 💰 Fee Structure & Scholarships\n• 🎓 Placements & Training\n• 📅 Events & Clubs\n• 📞 Contact Information\n• 📜 College Rules & FAQs\n\nAsk me anything about SEC!' }];
  });
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sources, setSources] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('sec_theme') || 'light');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sec_user');
    if (saved) return JSON.parse(saved);
    return null;
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Save messages to local storage
  useEffect(() => {
    localStorage.setItem('sec_chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sec_theme', theme);
  }, [theme]);

  // Save user context
  useEffect(() => {
    if (user) {
      localStorage.setItem('sec_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sec_user');
    }
  }, [user]);

  // 🏥 Health check on load
  useEffect(() => {
    checkHealth();
    loadSources();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('error');
      }
    } catch {
      setBackendStatus('offline');
    }
  };

  const loadSources = async () => {
    try {
      const res = await fetch(`${API_URL}/sources`);
      const data = await res.json();
      setSources(data.sources || []);
    } catch {
      setSources([]);
    }
  };

  const handleSend = async (question) => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: question }]);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, language, user_id: user?.user_id || "guest" })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: data.response,
        source: data.source,
        timestamp: data.timestamp
      }]);
      setBackendStatus('online');
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: '⚠️ Could not reach the AI backend server.\n\nPlease make sure:\n1. Backend is running on port 8000\n2. Run: python -m uvicorn main:app --reload --port 8000'
      }]);
      setBackendStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      { role: 'ai', text: '// CHAT_HISTORY_CLEARED\nReady for new questions about Sudharsan Engineering College.' }
    ]);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUser({ user_id: data.user_id, email: loginEmail });
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (err) {
      setLoginError('Could not reach backend');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen bg-sec-dark items-center justify-center font-sans">
        <div className="bg-sec-panel p-8 rounded-2xl border border-sec-border shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-sec-accent font-black text-3xl mb-2">SEC AI</h1>
            <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Member Login</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {loginError && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-500 text-xs text-center">{loginError}</div>}
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 ml-1">Email</label>
              <input 
                type="email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="kishore@gmail.com" 
                className="bg-slate-900 border border-sec-border py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-sec-accent text-white"
                required 
              />
            </div>
            <div className="flex flex-col gap-1.5 mb-2">
              <label className="text-xs font-semibold text-slate-300 ml-1">Password</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••" 
                className="bg-slate-900 border border-sec-border py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-sec-accent text-white"
                required 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="bg-sec-accent hover:opacity-90 transition-all py-3 rounded-xl font-bold text-white shadow-lg shadow-sec-accent/20 flex items-center justify-center"
            >
              {loading ? 'Authenticating...' : 'Sign In with Google / Email'}
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-4">
              Demo Account: kishore@gmail.com / 1234
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-sec-dark font-sans selection:bg-sec-accent selection:text-white">
      {/* 📁 Sidebar with live sources */}
      <Sidebar 
        setLanguage={setLanguage} 
        currentLanguage={language} 
        sources={sources}
        backendStatus={backendStatus}
        theme={theme}
        toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        onNewChat={handleClearChat}
        chatHistory={messages.filter(m => m.role === 'user')}
      />

      {/* 🌌 Main Chat Canvas */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 px-4 md:px-8 border-b border-sec-border bg-sec-panel/50 backdrop-blur-xl flex items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
              <span className="text-sec-accent font-black tracking-tighter text-xl md:text-2xl drop-shadow-[0_0_10px_rgba(47,129,247,0.5)]">SEC AI</span>
              <div className="h-8 w-[1px] bg-sec-border hidden sm:block"></div>
              <span className="text-[10px] uppercase font-mono text-slate-500 tracking-widest hidden sm:block">College.Agent.v2.0</span>
           </div>
           
           <div className="flex items-center gap-3 md:gap-6">
              <div className={`flex gap-2 items-center text-[10px] font-mono ${
                backendStatus === 'online' ? 'text-emerald-500' : 
                backendStatus === 'offline' ? 'text-red-500' : 'text-yellow-500'
              }`}>
                 <span className={`w-2 h-2 rounded-full ${
                   backendStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 
                   backendStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                 }`}></span>
                 {backendStatus === 'online' ? 'AI ONLINE' : 
                  backendStatus === 'offline' ? 'OFFLINE' : 'CHECKING...'}
              </div>
              <button 
                onClick={handleClearChat}
                className="text-slate-400 hover:text-white transition-all text-xs border border-sec-border p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800"
                title="Clear Chat"
              >
                🗑️ Clear
              </button>
               <button 
                 onClick={checkHealth}
                 className="text-slate-400 hover:text-white transition-all text-xs border border-sec-border p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800"
                 title="Reconnect"
               >
                 🔄
               </button>
               <button 
                 onClick={() => setUser(null)}
                 className="text-slate-400 hover:text-white transition-all text-xs border border-sec-border p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800 ml-2"
                 title="Logout"
               >
                 👤 {user.email.split('@')[0]} (Logout)
               </button>
            </div>
         </header>

        {/* 🧊 Chat Messages */}
        <ChatWindow messages={messages} loading={loading} />

        {/* ⌨️ Input */}
        <ChatInput onSend={handleSend} loading={loading} />
      </main>
    </div>
  );
};

export default App;
