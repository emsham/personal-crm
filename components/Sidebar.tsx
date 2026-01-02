
import React from 'react';
import { LayoutDashboard, Users, BarChart3, Settings, LogOut } from 'lucide-react';
import { View } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const { user, signOut } = useAuth();

  const navItems = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: View.CONTACTS, label: 'Contacts', icon: Users },
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
    <div className="w-64 h-full bg-slate-900 text-white flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl">N</div>
        <h1 className="text-xl font-bold tracking-tight">Nexus</h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              currentView === item.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        {user && (
          <div className="flex items-center space-x-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                user.email?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.displayName || user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
          <Settings size={20} />
          <span className="text-sm font-medium">Settings</span>
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-xl transition-all cursor-pointer"
        >
          <LogOut size={20} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
