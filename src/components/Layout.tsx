import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Shield, CreditCard, FileText, Lock, Settings,
  Search, Bell, LogOut, Menu, X, ChevronDown, Key, Users,
  Briefcase, Moon, Sun, Command
} from 'lucide-react';
import * as store from '../lib/store';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/vault', label: 'Vault', icon: Key },
  { path: '/accounts', label: 'Accounts', icon: Users },
  { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/security', label: 'Security', icon: Shield },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, lockVault, isVaultUnlocked, updateLastActivity } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('dv-theme') as 'light' | 'dark') || 'dark'
  );
  const [notifOpen, setNotifOpen] = useState(false);

  const notifications = user ? store.getNotifications(user.id) : [];
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClick = () => updateLastActivity();
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleClick);
    };
  }, [updateLastActivity]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('dv-theme', newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
  };

  // Search results
  const searchResults = user && searchQuery.length > 0 ? (() => {
    const q = searchQuery.toLowerCase();
    const creds = store.getCredentials(user.id).filter(c =>
      c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) || c.website.toLowerCase().includes(q)
    ).slice(0, 5);
    const accs = store.getAccounts(user.id).filter(a =>
      a.serviceName.toLowerCase().includes(q) || a.username.toLowerCase().includes(q)
    ).slice(0, 5);
    const subs = store.getSubscriptions(user.id).filter(s =>
      s.serviceName.toLowerCase().includes(q) || s.provider.toLowerCase().includes(q)
    ).slice(0, 5);
    return { credentials: creds, accounts: accs, subscriptions: subs };
  })() : null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6 dark:border-gray-800">
          <Lock size={24} className="text-blue-500" />
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Digital Vault</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Lock size={24} className="text-blue-500" />
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Digital Vault</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Menu size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 w-64"
            >
              <Search size={16} />
              <span>Search vault...</span>
              <kbd className="ml-auto hidden sm:inline-flex items-center gap-0.5 rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                <Command size={10} />K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isVaultUnlocked ? (
              <button onClick={lockVault} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20" title="Lock Vault">
                <Lock size={16} />
                <span className="hidden sm:inline">Lock</span>
              </button>
            ) : (
              <button onClick={() => navigate('/vault')} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" title="Unlock Vault">
                <Shield size={16} />
                <span className="hidden sm:inline">Unlock</span>
              </button>
            )}
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 z-50">
                  <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                      <button
                        onClick={() => { store.markAllNotificationsRead(user!.id); setNotifOpen(false); }}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400" title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-700">
              <Search size={18} className="text-gray-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search credentials, accounts, subscriptions..."
                className="flex-1 bg-transparent py-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-gray-100"
              />
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">ESC</kbd>
            </div>
            {searchResults && (
              <div className="max-h-80 overflow-y-auto p-2">
                {searchResults.credentials.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">Credentials</p>
                    {searchResults.credentials.map(c => (
                      <button key={c.id} onClick={() => { navigate('/vault'); setSearchOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                        <Key size={14} className="text-gray-400" />
                        <span>{c.name}</span>
                        <span className="text-xs text-gray-400">{c.username || c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.accounts.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">Accounts</p>
                    {searchResults.accounts.map(a => (
                      <button key={a.id} onClick={() => { navigate('/accounts'); setSearchOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                        <Users size={14} className="text-gray-400" />
                        <span>{a.serviceName}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.subscriptions.length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">Subscriptions</p>
                    {searchResults.subscriptions.map(s => (
                      <button key={s.id} onClick={() => { navigate('/subscriptions'); setSearchOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                        <Briefcase size={14} className="text-gray-400" />
                        <span>{s.serviceName}</span>
                        <span className="text-xs text-gray-400">{s.currency}{s.price}/{s.billingCycle.toLowerCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.credentials.length === 0 && searchResults.accounts.length === 0 && searchResults.subscriptions.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">No results found</p>
                )}
              </div>
            )}
            <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
              <div className="flex gap-2">
                <button onClick={() => { navigate('/vault?action=add'); setSearchOpen(false); }} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">+ Credential</button>
                <button onClick={() => { navigate('/accounts?action=add'); setSearchOpen(false); }} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">+ Account</button>
                <button onClick={() => { navigate('/subscriptions?action=add'); setSearchOpen(false); }} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">+ Subscription</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
