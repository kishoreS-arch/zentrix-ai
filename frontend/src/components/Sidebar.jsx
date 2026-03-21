import React, { useState } from 'react';

const SidebarMenu = ({ items, onItemClick }) => (
  <div className="absolute bottom-full left-0 mb-2 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl p-1 z-50 overflow-hidden text-sm slide-up-animation">
    {items.map((item, idx) => (
      <React.Fragment key={idx}>
        <button
          onClick={() => onItemClick(item.label)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-[#2a2a2a] ${item.danger ? 'text-red-500 hover:text-red-400' : 'text-[#e0e0e0] hover:text-white'}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
        {item.divider && <div className="h-px bg-[#2a2a2a] my-1 mx-2" />}
      </React.Fragment>
    ))}
  </div>
);

const Sidebar = ({ sessions = [], activeSessionId, onNewChat, onLoadSession, onDeleteSession, user, onLogout, isSidebarOpen, setSidebarOpen }) => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Group sessions by time
  const now = Date.now();
  const today = [];
  const yesterday = [];
  const older = [];

  sessions.forEach(session => {
    const age = now - session.createdAt;
    const oneDay = 86400000;
    if (age < oneDay) today.push(session);
    else if (age < oneDay * 2) yesterday.push(session);
    else older.push(session);
  });

  const SessionGroup = ({ label, items }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="px-3 pb-1 text-[11px] font-semibold text-[#a0a0a0]/60 uppercase tracking-widest">{label}</p>
        <div className="space-y-0.5">
          {items.map(session => (
            <SessionItem key={session.id} session={session} />
          ))}
        </div>
      </div>
    );
  };

  const SessionItem = ({ session }) => {
    const [hovered, setHovered] = useState(false);
    const isActive = session.id === activeSessionId;

    return (
      <div
        className={`relative group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? 'bg-[#2a2a2a] text-white'
            : 'text-[#c0c0c0] hover:bg-[#1e1e1e] hover:text-white'
        }`}
        onClick={() => { onLoadSession(session.id); setSidebarOpen?.(false); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <svg className="shrink-0 opacity-70" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>

        <span className="flex-1 truncate text-[14px] font-medium">{session.title}</span>



        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
            className="shrink-0 p-1 text-[#a0a0a0] hover:text-red-400 transition-colors rounded"
            title="Delete session"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        )}
      </div>
    );
  };

  const menuItems = [
    { label: 'My Profile', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { label: 'Personalization', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg> },
    { label: 'Apps', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>, divider: true },
    { label: 'Workspace', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg> },
    { label: 'Settings', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
    { label: 'Data Controls', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg> },
    { label: 'Security', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> },
    { label: 'About', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, divider: true },
    { label: 'Log out', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>, danger: true }
  ];

  const handleMenuClick = (action) => {
    setMenuOpen(false);
    if (action === 'Log out') {
      setShowLogoutConfirm(true);
    } else {
      // Fire an event that App.jsx can listen to and open a modal
      window.dispatchEvent(new CustomEvent('openPage', { detail: action }));
    }
  };

  const navClasses = `fixed top-0 left-0 md:relative z-50 bg-[#171717] w-[280px] h-[100dvh] flex flex-col transform transition-transform duration-300 ease-in-out border-r border-[#2a2a2a] shrink-0
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`;

  return (
    <>
      <div className={`${isSidebarOpen ? 'block z-40' : 'hidden z-[-1]'} md:hidden fixed inset-0 bg-black/60 transition-opacity w-[100vw] h-[100dvh]`} onClick={() => setSidebarOpen(false)} />
      
      <aside className={navClasses}>
        
        {/* ➕ New Chat Button & Hamburger for mobile closing */}
        <div className="p-3 flex items-center justify-between shrink-0">
          <button 
            onClick={() => { onNewChat(); setSidebarOpen?.(false); }}
            className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border-transparent hover:bg-[#2a2a2a] transition-colors text-white font-medium"
          >
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <span className="flex-1 text-left text-[15px]">New chat</span>
            <svg className="opacity-60" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          
          <button className="md:hidden ml-2 p-2 hover:bg-[#2a2a2a] rounded-lg text-[#a0a0a0] transition-colors" onClick={() => setSidebarOpen(false)}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 📂 Sessions List */}
        <div className="flex-1 overflow-y-auto px-2 py-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30 select-none text-center px-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <p className="text-xs text-[#a0a0a0]">No conversations yet.</p>
            </div>
          ) : (
            <>
              <SessionGroup label="Today" items={today} />
              <SessionGroup label="Yesterday" items={yesterday} />
              <SessionGroup label="Previous 30 Days" items={older} />
            </>
          )}
        </div>

        {/* 👤 Profile Footer */}
        <div className="shrink-0 p-3 pt-2">
          <div className="relative">
            {isMenuOpen && <SidebarMenu items={menuItems} onItemClick={handleMenuClick} />}
            <button 
              onClick={() => setMenuOpen(!isMenuOpen)}
              className="w-full flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#2a2a2a] transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full border border-[#2a2a2a]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00e5ff] to-teal-400 flex items-center justify-center text-white text-[13px] font-bold shrink-0">
                    {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[14px] font-semibold text-white truncate">{user?.displayName || 'User'}</p>
                  <p className="text-[11px] text-[#a0a0a0] truncate opacity-0 group-hover:opacity-100 transition-opacity">View Profile</p>
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#8e8ea0] shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#202123] rounded-2xl p-6 max-w-sm w-full border border-[#343541] shadow-2xl">
            <h3 className="text-white text-lg font-bold mb-2">Log out of Zentrix?</h3>
            <p className="text-[#8e8ea0] text-sm mb-6">You will need to sign back in to access your knowledge core and saved sessions.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 text-[#ececf1] font-medium hover:bg-[#343541] rounded-lg transition-colors">Cancel</button>
              <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">Log out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
