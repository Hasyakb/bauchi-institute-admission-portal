import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import { LogOut, User, LayoutDashboard, FileText, Settings, ShieldCheck, Menu, X, BookOpen, Users, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import NotificationBell from './NotificationBell';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, refreshUser } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    try {
      setIsMenuOpen(false);
      await fetch('/api/auth/logout', { method: 'POST' });
      await refreshUser();
      navigate('/');
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  const navItems = user ? [
    { name: 'Dashboard', path: isAdmin ? '/admin' : '/dashboard', icon: LayoutDashboard },
    ...(isAdmin ? [
      { name: 'Applications', path: '/admin', icon: FileText },
      { name: 'Programs', path: '/admin/programs', icon: BookOpen },
      { name: 'Users', path: '/admin/users', icon: Users },
      { name: 'Settings', path: '/admin/settings', icon: Settings },
    ] : [
      { name: 'My Application', path: '/apply', icon: FileText },
    ]),
  ] : [
    { name: 'Home', path: '/', icon: null },
    { name: 'Admissions', path: '/login', icon: null },
  ];

  if (user) {
    return (
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className={cn(
          "bg-slate-900 text-white flex flex-col transition-all duration-300 z-50",
          "w-64 fixed inset-y-0 left-0 lg:relative",
          isMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded" />
              ) : (
                <div className="w-10 h-10 bg-emerald-600 rounded flex items-center justify-center font-bold text-xl text-white">
                  {settings?.schoolShortName?.[0] || 'B'}
                </div>
              )}
              <div>
                <h1 className="text-[10px] font-bold leading-tight uppercase tracking-wider text-white">
                  {settings?.schoolName || 'Bauchi Institute'}
                </h1>
                <p className="text-[9px] text-slate-400 uppercase">Admission Portal</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  location.pathname === item.path 
                    ? "bg-emerald-600/10 text-emerald-400 border-l-4 border-emerald-600" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                {item.icon && <item.icon className="w-5 h-5" />}
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4">
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-[10px] text-slate-400 mb-1 uppercase font-bold">Portal Support</p>
              <p className="text-xs font-medium truncate">{settings?.contactEmail || 'helpdesk@biais.edu.ng'}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className="w-full mt-4 flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-lg text-sm font-medium transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {isMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-slate-600"
              >
                <Menu className="w-6 h-6" />
              </button>
              <span className="text-slate-400 text-sm hidden sm:inline">
                / {navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{user.fullName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none">
                  ROLE: {user.role}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                <User className="w-5 h-5" />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-slate-50">
            {children}
            <footer className="bg-white border-t border-slate-200 px-8 py-3 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest gap-2">
              <span>© 2026 {settings?.schoolName || 'Bauchi Institute for Arabic and Islamic Studies'}</span>
              <div className="flex gap-4">
                <a href="#" className="hover:text-emerald-600">Terms</a>
                <a href="#" className="hover:text-emerald-600">Privacy</a>
              </div>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                ) : (
                  <div className="w-10 h-10 bg-emerald-600 rounded flex items-center justify-center text-white font-bold text-xl uppercase">
                    {settings?.schoolShortName?.[0] || 'B'}
                  </div>
                )}
                <div className="hidden sm:block leading-none">
                  <h1 className="text-sm font-bold uppercase tracking-wider">{settings?.schoolName || 'Bauchi Institute'}</h1>
                  <p className="text-[10px] text-slate-500 uppercase">Admission Portal</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-emerald-600",
                    location.pathname === item.path ? "text-emerald-600" : "text-slate-600"
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <Link to="/login" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Login</Link>
              <Link to="/register" className="btn-primary py-2 px-4">Apply Now</Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center text-white font-bold uppercase">
                  {settings?.schoolShortName?.[0] || 'B'}
                </div>
              )}
              <h3 className="text-white font-display text-lg tracking-tight leading-none">
                {settings?.schoolShortName || 'Bauchi Institute'}
              </h3>
            </div>
            <p className="text-sm max-w-xs">{settings?.schoolDescription || 'Dedicated to Islamic excellence and academic growth.'}</p>
          </div>
          <div className="flex gap-12">
            <div>
               <h4 className="text-slate-100 text-xs font-bold uppercase tracking-widest mb-4">Support</h4>
               <p className="text-sm">{settings?.contactEmail || 'helpdesk@biais.edu.ng'}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
