
import React from 'react';
import { Brain, Users, BarChart3, Settings, LogOut, CheckSquare, Sparkles } from 'lucide-react';
import { View } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const { user, signOut } = useAuth();

  const navItems = [
    { id: View.DASHBOARD, label: 'Nexus Brain', icon: Brain },
    { id: View.CONTACTS, label: 'Contacts', icon: Users },
    { id: View.TASKS, label: 'Tasks', icon: CheckSquare },
    { id: View.ANALYTICS, label: 'Analytics', icon: BarChart3 },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="w-72 h-full glass-strong flex flex-col fixed left-0 top-0 z-50">
      {/* Logo Section */}
      <div className="p-6 flex items-center space-x-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles size={20} className="text-white" />
          </div>
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 opacity-30 blur-lg -z-10" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Nexus</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">AI-Powered CRM</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <p className="px-4 mb-3 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Navigation</p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${
              currentView === item.id
                ? 'text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {/* Active background */}
            {currentView === item.id && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-xl" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-violet-500 to-cyan-500 rounded-r-full" />
              </>
            )}

            {/* Hover background */}
            <div className={`absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity ${
              currentView === item.id ? 'hidden' : ''
            }`} />

            <item.icon size={20} className="relative z-10" />
            <span className="font-medium relative z-10">{item.label}</span>

            {/* Active indicator dot */}
            {currentView === item.id && (
              <div className="ml-auto relative z-10">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/5">
        {/* User Info */}
        {user && (
          <div className="flex items-center space-x-3 px-4 py-3 mb-3 rounded-xl glass-light">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden ring-2 ring-white/10">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.email?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-dark-900 shadow-lg shadow-emerald-500/50" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.displayName || user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-1">
          <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group">
            <Settings size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm font-medium">Settings</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-4 py-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all group"
          >
            <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
