
import React from 'react';
import { LayoutDashboard, Users, BarChart3, Settings, LogOut, Github } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: View.CONTACTS, label: 'Contacts', icon: Users },
    { id: View.ANALYTICS, label: 'Analytics', icon: BarChart3 },
  ];

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
        <div className="flex items-center space-x-3 px-4 py-3 text-slate-400">
          <Settings size={20} />
          <span className="text-sm font-medium">Settings</span>
        </div>
        <div className="flex items-center space-x-3 px-4 py-3 text-red-400 cursor-pointer">
          <LogOut size={20} />
          <span className="text-sm font-medium">Sign Out</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
