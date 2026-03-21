import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import { 
  auth, 
  googleProvider, 
  db, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  doc,
  setDoc
} from './firebase';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"; 

const App = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState(null);

  // Listen to openPage events triggered by the Sidebar
  useEffect(() => {
    const handleOpenPage = (e) => {
      setActivePage(e.detail);
    };
    window.addEventListener('openPage', handleOpenPage);
    return () => window.removeEventListener('openPage', handleOpenPage);
  }, []);

  // 🗂️ Session Management — keyed per user, loaded on login
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Save sessions to localStorage under this user's UID key
  const saveSessionsForUser = useCallback((uid, updatedSessions) => {
    localStorage.setItem(`sec_sessions_${uid}`, JSON.stringify(updatedSessions));
  }, []);

  // Load sessions from localStorage for a given UID
  const loadSessionsForUser = useCallback((uid) => {
    try {
      return JSON.parse(localStorage.getItem(`sec_sessions_${uid}`) || '[]');
    } catch { return []; }
  }, []);

  // Sync sessions to localStorage whenever they change (only when user is logged in)
  useEffect(() => {
    if (user?.uid) {
      saveSessionsForUser(user.uid, sessions);
    }
  }, [sessions, user?.uid, saveSessionsForUser]);

  // 📡 Backend Health Check
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        setBackendStatus(res.ok ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  // 🛡️ Auth Listener — always start fresh on login, load user's history into sidebar
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // New login: load this user's sessions into sidebar but start with empty chat
        const userSessions = loadSessionsForUser(currentUser.uid);
        setSessions(userSessions);
        setMessages([]);          // ← Always fresh empty chat on login
        setActiveSessionId(null); // ← No active session on login

        // Save user details to Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(userRef, {
            name: currentUser.displayName || 'User',
            email: currentUser.email || '',
            profileImage: currentUser.photoURL || '',
            lastLogin: serverTimestamp(),
          }, { merge: true });

          // Also save to a login_history subcollection
          await addDoc(collection(db, 'users', currentUser.uid, 'login_history'), {
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent
          });
        } catch (err) {
          console.error('Failed to log user data to Firestore:', err);
        }

      } else {
        // Logout: clear everything from memory
        setSessions([]);
        setMessages([]);
        setActiveSessionId(null);
      }
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [loadSessionsForUser]);

  // ➕ Start a brand new blank session
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
  }, []);

  // 📂 Load an existing session
  const handleLoadSession = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages);
      setActiveSessionId(sessionId);
    }
  }, [sessions]);

  // 🗑️ Delete a session
  const handleDeleteSession = useCallback((sessionId) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setMessages([]);
      setActiveSessionId(null);
    }
  }, [activeSessionId]);

  // 💬 Send a message
  const handleSend = async (text, file = null) => {
    if (!user) return;

    // Build the user message object (with attachment info if present)
    const userMsg = { 
      role: 'user', 
      text, 
      attachment: file ? { name: file.name, size: file.size, type: file.type } : null 
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    // Detect if this is the FIRST message in a new session
    const isFirstMessage = !activeSessionId;
    let currentSessionId = activeSessionId;

    if (isFirstMessage) {
      const newSessionId = `session_${Date.now()}`;
      const placeholderSession = {
        id: newSessionId,
        title: '✦ Generating title...',
        createdAt: Date.now(),
        messages: [userMsg],
      };
      setSessions(prev => [placeholderSession, ...prev]);
      setActiveSessionId(newSessionId);
      currentSessionId = newSessionId;
    }

    try {
      // Use FormData for multi-modal (text + file)
      const formData = new FormData();
      formData.append("question", text || `File analysis: ${file?.name}`);
      formData.append("user_id", user.uid);
      if (file) formData.append("file", file);

      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        body: formData // multipart/form-data
      });
      
      const data = await response.json();
      const aiMsg = { role: 'ai', text: data.response, source: data.source };
      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);

      // 💾 Update session with real messages
      setSessions(prev => prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: finalMessages, updatedAt: Date.now() }
          : s
      ));

      // 🏷️ Ask AI to generate a smart title (only for the first exchange)
      if (isFirstMessage) {
        try {
          const titleRes = await fetch(`${API_URL}/generate-title`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_message: text,
              ai_response: data.response
            })
          });
          const titleData = await titleRes.json();
          const smartTitle = titleData.title || text.slice(0, 30);

          // Update session title with the AI-generated name
          setSessions(prev => prev.map(s =>
            s.id === currentSessionId
              ? { ...s, title: smartTitle }
              : s
          ));
        } catch {
          // Fallback: use first 30 characters of question
          setSessions(prev => prev.map(s =>
            s.id === currentSessionId
              ? { ...s, title: text.slice(0, 30) }
              : s
          ));
        }
      }

    } catch (err) {
      const errMsg = { role: 'ai', text: "⚠️ Error syncing with Knowledge Core. Please verify the backend connection." };
      setMessages(prev => [...prev, errMsg]);

      // Update session even on error
      setSessions(prev => prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: [...updatedMessages, errMsg], title: text.slice(0, 30) }
          : s
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setLoginError("Google sign-in failed. Try again.");
    }
  };

  // ─── Login Screen ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex h-screen w-screen bg-[#0f0f0f] items-center justify-center font-sans p-4 overflow-hidden">
        <div className="bg-[#1a1a1a] p-10 rounded-3xl border border-[#2a2a2a] w-full max-w-md text-center" style={{ animation: 'fadeIn 0.4s ease forwards' }}>
          <img src="/zentrix-logo.png" alt="Zentrix Logo" className="w-20 h-20 mx-auto mb-4 object-cover rounded-xl shadow-[0_0_20px_rgba(16,163,127,0.3)] animate-pulse" />
          <h1 className="text-white font-black text-4xl mb-2">Zentrix</h1>
          <p className="text-[10px] text-[#a0a0a0] uppercase tracking-widest mb-10 opacity-60">Sudharsan Engineering College</p>
          
          <div className="mb-10">
            <h2 className="text-white text-xl font-bold mb-2">Welcome Back</h2>
            <p className="text-[#a0a0a0] text-sm leading-relaxed">Sign in to access your personalized SEC Knowledge Core with AI-powered assistance.</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs mb-6">
              {loginError}
            </div>
          )}
          
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-95 shadow-2xl"
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" className="w-5" alt="Google" />
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Main App ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen bg-[#0f0f0f] font-sans text-white overflow-hidden text-[15px]">
      
      <Sidebar 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
        backendStatus={backendStatus}
        user={user}
        onLogout={() => signOut(auth)}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-[#0f0f0f]">
        {/* 🧭 Top Navigation */}
        <header className="h-[56px] flex items-center justify-between px-6 border-b border-[#2a2a2a] bg-[#0f0f0f] shrink-0 z-10 w-full">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1 text-[#a0a0a0] hover:text-white" onClick={() => setSidebarOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <span className="font-semibold text-white">
              {activeSessionId
                ? sessions.find(s => s.id === activeSessionId)?.title || 'Zentrix'
                : 'Zentrix Core'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/5 ${backendStatus === 'online' ? 'text-[#10a37f]' : 'text-red-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'online' ? 'bg-[#10a37f]' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{backendStatus}</span>
            </div>
          </div>
        </header>

        {/* 💬 Chat Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-6 select-none px-4">
              <div className="text-center">
                <img src="/zentrix-logo.png" alt="Zentrix AI" className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover shadow-[0_0_20px_rgba(16,163,127,0.3)]" />
                <h2 className="text-2xl font-bold text-white">How can I help you?</h2>
                <p className="text-sm text-[#a0a0a0] mt-2">Ask me anything about Sudharsan Engineering College</p>
              </div>

              {/* Quick question buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {[
                  "What courses are offered at SEC?",
                  "What is the fee for CSE management quota?",
                  "Which companies visited SEC for placements?",
                  "What is the counselling code for SEC?"
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={loading}
                    className="text-left p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-[#a0a0a0] hover:text-white hover:border-[#10a37f]/40 hover:bg-[#1e1e1e] transition-all disabled:opacity-30 disabled:cursor-not-allowed leading-snug"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ChatWindow messages={messages} loading={loading} />
          )}
          <ChatInput onSend={handleSend} loading={loading} backendStatus={backendStatus} />
        </div>
      </div>
      {/* ⚙️ Full Page Settings Overlay */}
      {activePage && (
        <div className="fixed inset-0 bg-[#0f0f0f] z-50 flex flex-col slide-up-animation overflow-y-auto">
          <div className="flex items-center gap-4 p-4 border-b border-[#2a2a2a] sticky top-0 bg-[#0f0f0f]/90 backdrop-blur pointer-events-auto z-10">
            <button onClick={() => setActivePage(null)} className="p-2 hover:bg-[#2a2a2a] rounded-full text-[#a0a0a0] transition-colors">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h2 className="text-xl font-bold font-sans tracking-wide text-white">{activePage}</h2>
          </div>
          <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
            {activePage === 'My Profile' ? (
              <div className="flex flex-col items-center mt-6">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="avatar" className="w-24 h-24 rounded-full border-2 border-[#ff8c00] shadow-[0_0_15px_rgba(255,140,0,0.3)] mb-4" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#10a37f] to-[#ff8c00] flex items-center justify-center text-white text-3xl font-bold shadow-xl mb-4">
                    {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <h3 className="text-2xl font-bold">{user?.displayName}</h3>
                <p className="text-[#a0a0a0] mt-1">{user?.email}</p>
                <button className="mt-4 border border-[#2a2a2a] rounded-full py-2 px-6 text-sm font-semibold hover:bg-[#1a1a1a] transition-colors">
                  Edit profile
                </button>
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
                  <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#2a2a2a]">
                    <h4 className="text-sm font-semibold text-[#a0a0a0] mb-2">Account ID</h4>
                    <p className="font-mono text-xs text-white break-all">{user?.uid}</p>
                  </div>
                  <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#2a2a2a]">
                    <h4 className="text-sm font-semibold text-[#a0a0a0] mb-2">Last Sign In</h4>
                    <p className="text-sm text-white">{new Date(user?.metadata.lastSignInTime).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-[#a0a0a0] py-20">
                <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{activePage} Components</h3>
                <p className="text-sm">These settings are currently in development.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
