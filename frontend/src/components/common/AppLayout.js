import React from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../../store/uiSlice';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

function Topbar() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);

  return (
    <header className="h-16 border-b border-aviro-border bg-aviro-card/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-6">
      <button onClick={() => dispatch(toggleSidebar())} className="text-aviro-muted hover:text-white transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-3">
        {/* Notifications - real-time bell */}
        <NotificationBell />

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-aviro-orange/20 flex items-center justify-center text-sm">
            {user?.gender === 'FEMALE' ? '👩' : '👨'}
          </div>
          <span className="text-sm font-medium hidden sm:block">{user?.fullName?.split(' ')[0]}</span>
        </div>
      </div>
    </header>
  );
}

export default function AppLayout() {
  const { sidebarOpen } = useSelector(s => s.ui);
  return (
    <div className="flex min-h-screen bg-aviro-dark">
      <Sidebar open={sidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}