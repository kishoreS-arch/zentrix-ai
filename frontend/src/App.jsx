import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import { 
  auth, 
  googleProvider, 
  db, 
  signInWithPopup, 
  signInAnonymously,
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
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

// Detect if running on a mobile/PWA/APK environment
const isMobileOrPWA = () => {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
  return isMobile || isStandalone;
};

// Always use the Render backend in production; fall back to localhost only when running locally
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = import.meta.env.VITE_API_URL || (IS_LOCAL ? "http://localhost:8000" : "https://zentrix-backend-onve.onrender.com");

const App = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  
  // Custom Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Stop Generation Controller
  const [abortController, setAbortController] = useState(null);

  // 🚨 Handle redirect result — MUST run before auth state listener resolves
  // This catches the case where user comes back from Google OAuth redirect
  useEffect(() => {
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) {
          setLoginError('');
          // onAuthStateChanged will handle setting the user
        }
      })
      .catch(err => {
        // Ignore cancelled redirects — common when user cancels Google sign-in
        if (err.code && err.code !== 'auth/redirect-cancelled-by-user' && err.code !== 'auth/popup-closed-by-user') {
          const cleanMsg = err.message
            .replace('Firebase: ', '')
            .replace(/\s*\(auth\/[^)]+\)\.?/, '');
          setLoginError(cleanMsg || 'Google sign-in failed. Please try again.');
        }
      });
  }, []);

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

  // 🗂️ Session Management (Firebase Firestore Sub-collections)
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const loadSessionsForUser = useCallback(async (uid) => {
    try {
      const q = query(collection(db, 'chats'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const loadedSessions = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)); // Sort in-memory
      
      setSessions(loadedSessions);
      return loadedSessions;
    } catch(err) { 
      console.error("Load sessions error:", err);
      return []; 
    }
  }, []);

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

  // 🛡️ Auth Listener — single source of truth for user state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth State Changed:", currentUser ? currentUser.email : "Logged Out");
      
      if (currentUser) {
        // Prepare Firestore record in background (do NOT await)
        setDoc(doc(db, 'users', currentUser.uid), {
          name: currentUser.displayName || 'User',
          email: currentUser.email || '',
          profileImage: currentUser.photoURL || '',
          lastLogin: serverTimestamp(),
        }, { merge: true }).catch(err => console.warn('Sync to users collection failed:', err));
      } else {
        // Clear state on logout
        setSessions([]);
        setMessages([]);
        setActiveSessionId(null);
      }

      // Finalize loading state
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []); // Only run once on mount

  // 📂 Reactive Session Loading — runs whenever 'user' changes (Auth or Guest)
  useEffect(() => {
    if (user?.uid) {
      loadSessionsForUser(user.uid);
    }
  }, [user, loadSessionsForUser]);

  // ➕ Start a brand new blank session
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
  }, []);

  // 📂 Load an existing session and its messages
  const handleLoadSession = useCallback(async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    setLoading(true);
    setActiveSessionId(sessionId);
    
    try {
       const q = query(collection(db, 'chats', sessionId, 'messages'), orderBy('timestamp', 'asc'));
       const querySnapshot = await getDocs(q);
       const msgs = querySnapshot.docs.map(doc => doc.data());
       setMessages(msgs);
       setSidebarOpen(false); // Close sidebar on mobile after selection
    } catch (err) {
       console.error("Error loading messages:", err);
       setMessages(session.messages || []); // Fallback to local memory if any
    } finally {
       setLoading(false);
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
      try {
        const chatRef = doc(collection(db, 'chats'));
        currentSessionId = chatRef.id;
        
        const newChat = {
          userId: user.uid,
          title: '✦ Generating title...',
          createdAt: serverTimestamp(),
        };
        
        await setDoc(chatRef, newChat);
        setSessions(prev => [{ id: currentSessionId, ...newChat, createdAt: Date.now() }, ...prev]);
        setActiveSessionId(currentSessionId);
      } catch (err) {
        console.error("Error creating chat:", err);
        return;
      }
    }

    // 💾 Save User Message to Firestore sub-collection
    await addDoc(collection(db, 'chats', currentSessionId, 'messages'), {
       ...userMsg,
       content: text, // sync field names with user request
       timestamp: serverTimestamp()
    });

    try {
      // Use FormData for multi-modal (text + file)
      const formData = new FormData();
      formData.append("question", text || `File analysis: ${file?.name}`);
      formData.append("user_id", user.uid);
      if (file) formData.append("file", file);

      const controller = new AbortController();
      setAbortController(controller);

      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      
      const data = await response.json();
      const aiMsg = { 
        role: 'ai', 
        content: data.response, 
        source: data.source, 
        timestamp: serverTimestamp() 
      };
      
      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);

      // 💾 Save AI Response to Firestore
      await addDoc(collection(db, 'chats', currentSessionId, 'messages'), aiMsg);

      // 🏷️ Generate Title for New Session
      if (isFirstMessage) {
        try {
          const titleRes = await fetch(`${API_URL}/generate-title`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_message: text, ai_response: data.response })
          });
          const titleData = await titleRes.json();
          const smartTitle = titleData.title || text.slice(0, 30);
          
          await setDoc(doc(db, 'chats', currentSessionId), { title: smartTitle }, { merge: true });
          setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: smartTitle } : s));
        } catch {
          const fallbackTitle = text.slice(0, 30);
          await setDoc(doc(db, 'chats', currentSessionId), { title: fallbackTitle }, { merge: true });
          setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: fallbackTitle } : s));
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        const stopMsg = { role: 'ai', content: 'Generation explicitly stopped by user.', timestamp: serverTimestamp() };
        setMessages(prev => [...prev, stopMsg]);
        await addDoc(collection(db, 'chats', currentSessionId, 'messages'), stopMsg);
      } else {
        const errMsg = { role: 'ai', content: "⚠️ Error syncing with Knowledge Core. Please verify connection.", timestamp: serverTimestamp() };
        setMessages(prev => [...prev, errMsg]);
        await addDoc(collection(db, 'chats', currentSessionId, 'messages'), errMsg);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      if (isMobileOrPWA()) {
        // 📱 Mobile / APK / PWA: Use redirect (avoids popup blocker completely)
        await signInWithRedirect(auth, googleProvider);
        // Page will reload — onAuthStateChanged + getRedirectResult handles the rest
      } else {
        // 💻 Desktop: Use popup for instant UX
        const result = await signInWithPopup(auth, googleProvider);
        if (result?.user) setLoginError('');
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        const cleanMsg = err.message
          .replace('Firebase: ', '')
          .replace(/\s*\(auth\/[^)]+\)\.?/, '');
        setLoginError(cleanMsg || 'Google sign-in failed. Please try again.');
      }
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!email) return setLoginError("Please enter your email.");
    
    if (isSignUpMode) {
      // Password validation
      const pwdRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
      if (!pwdRegex.test(password)) {
        return setLoginError("Password must be 8+ chars and contain 1 uppercase, 1 number, and 1 special char.");
      }
    } else if (!password) {
      return setLoginError("Please enter your password.");
    }

    setAuthLoading(true);
    try {
      if (isSignUpMode) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const namePart = email.split('@')[0];
        await updateProfile(userCred.user, { displayName: namePart });
        setUser({ ...userCred.user, displayName: namePart }); // force ui update immediately
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      // Cleanup firebase error strings
      setLoginError(err.message.replace('Firebase: ', ''));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setAuthLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setLoginError("Guest sign-in failed: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // ─── Auth Loading Screen ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex h-[100dvh] w-screen bg-[#0f0f0f] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/zentrix-logo.png" alt="Zentrix" className="w-16 h-16 rounded-xl animate-pulse" />
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-[#00e5ff] rounded-full animate-bounce" style={{animationDelay:'0ms'}}></span>
            <span className="w-2 h-2 bg-[#00e5ff] rounded-full animate-bounce" style={{animationDelay:'150ms'}}></span>
            <span className="w-2 h-2 bg-[#00e5ff] rounded-full animate-bounce" style={{animationDelay:'300ms'}}></span>
          </div>
          <p className="text-[#a0a0a0] text-sm">Loading Zentrix...</p>
        </div>
      </div>
    );
  }

  // ─── Login Screen ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex h-[100dvh] w-screen bg-[#0f0f0f] items-center justify-center font-sans p-4 overflow-y-auto">
        <div className="bg-[#1a1a1a] p-8 sm:p-10 rounded-3xl border border-[#2a2a2a] w-full max-w-md text-center my-auto" style={{ animation: 'fadeIn 0.4s ease forwards' }}>
          <img src="/zentrix-logo.png" alt="Zentrix Logo" className="w-20 h-20 mx-auto mb-4 object-cover rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.3)] animate-pulse" />
          <h1 className="text-white font-black text-4xl mb-2">Zentrix</h1>
          <p className="text-[10px] text-[#a0a0a0] uppercase tracking-widest mb-8 opacity-60">Sudharsan Engineering College</p>
          
          <div className="mb-8">
            <h2 className="text-white text-xl font-bold mb-2">Welcome Back</h2>
            <p className="text-[#a0a0a0] text-sm leading-relaxed">Sign in to access your personalized SEC Knowledge Core with AI-powered assistance.</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs mb-6 break-words text-left">
              ⚠️ {loginError}
            </div>
          )}
          
          <form onSubmit={handleEmailAuth} className="space-y-3 mb-4">
            <input 
              type="email" 
              placeholder="Email address"
              autoComplete="email"
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white p-3 rounded-xl focus:border-[#00e5ff] outline-none transition-colors"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Password (8+ chars)"
              autoComplete={isSignUpMode ? 'new-password' : 'current-password'}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white p-3 rounded-xl focus:border-[#00e5ff] outline-none transition-colors"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button 
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#00e5ff] text-[#0f0f0f] font-bold py-3.5 rounded-xl hover:opacity-90 transition-all active:scale-95 flex justify-center items-center h-12"
            >
              {authLoading ? <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin"></div> : (isSignUpMode ? 'Create Account' : 'Log In')}
            </button>
            <p className="text-xs text-[#a0a0a0] mt-2 cursor-pointer hover:text-white transition-colors" onClick={() => { setIsSignUpMode(!isSignUpMode); setLoginError(''); }}>
              {isSignUpMode ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </p>
          </form>

          <div className="flex items-center gap-3 my-5 opacity-50 px-4">
            <div className="h-[1px] bg-[#4a4a4a] flex-1"></div>
            <span className="text-[10px] uppercase font-bold text-[#8a8a8a]">OR</span>
            <div className="h-[1px] bg-[#4a4a4a] flex-1"></div>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-95 shadow-[0_4px_14px_0_rgba(255,255,255,0.15)] disabled:opacity-60"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" className="w-5" alt="Google" />
              <span>Continue with Google</span>
            </button>
            
            <button 
              onClick={handleGuestLogin}
              disabled={authLoading}
              className="w-full bg-[#2a2a2a] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-[#3a3a3a] transition-all active:scale-95 border border-[#3a3a3a] disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#00e5ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Continue as Guest</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main App ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[100dvh] w-screen bg-[#0f0f0f] font-sans text-white overflow-hidden text-[15px]">
      
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
            {/* Quick New Chat Button for Mobile */}
            <button 
              className="md:hidden p-1 text-[#a0a0a0] hover:text-white" 
              onClick={handleNewChat}
              title="New Chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/5 ${backendStatus === 'online' ? 'text-[#00e5ff]' : 'text-red-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'online' ? 'bg-[#00e5ff]' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{backendStatus}</span>
            </div>
          </div>
        </header>

        {/* 💬 Chat Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-6 select-none px-4">
              <div className="text-center">
                <img src="/zentrix-logo.png" alt="Zentrix AI" className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover shadow-[0_0_20px_rgba(0,229,255,0.3)]" />
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
                    className="text-left p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-[#a0a0a0] hover:text-white hover:border-[#00e5ff]/40 hover:bg-[#1e1e1e] transition-all disabled:opacity-30 disabled:cursor-not-allowed leading-snug"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ChatWindow messages={messages} loading={loading} />
          )}
          <ChatInput onSend={handleSend} loading={loading} backendStatus={backendStatus} onStop={() => abortController?.abort()} />
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
                  <img src={user.photoURL} alt="avatar" className="w-24 h-24 rounded-full border-2 border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.3)] mb-4" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#00e5ff] to-[#a855f7] flex items-center justify-center text-white text-3xl font-bold shadow-xl mb-4">
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
