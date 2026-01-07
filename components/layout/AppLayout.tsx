import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { View } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentView = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/contacts')) return View.CONTACTS;
    if (path.startsWith('/tasks')) return View.TASKS;
    if (path.startsWith('/analytics')) return View.ANALYTICS;
    if (path.startsWith('/settings')) return View.SETTINGS;
    return View.DASHBOARD;
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex noise">
      {/* Background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <Sidebar
        currentView={currentView}
        onNavigate={navigate}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex-1 lg:ml-72 p-4 md:p-6 lg:p-8 pt-16 lg:pt-8">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
