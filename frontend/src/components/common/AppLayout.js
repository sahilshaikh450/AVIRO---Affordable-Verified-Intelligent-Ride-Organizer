import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../store/authSlice';
import NotificationBell from './NotificationBell';

// ── Bottom nav links (mobile) ──
const bottomLinks = [
  { to: '/dashboard',  icon: '🏠', label: 'Home'     },
  { to: '/search',     icon: '🔍', label: 'Find'     },
  { to: '/offer-ride', icon: '🏍️', label: 'Offer'    },
  { to: '/bookings',   icon: '📋', label: 'Bookings' },
  { to: '/profile',    icon: '👤', label: 'Profile'  },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

// ── Sidebar links (desktop) ──
const sidebarLinks = [
  { to: '/dashboard',  icon: '🏠', label: 'Dashboard'  },
  { to: '/search',     icon: '🔍', label: 'Find a Ride' },
  { to: '/offer-ride', icon: '🏍️', label: 'Offer Ride'  },
  { to: '/my-rides',   icon: '🗺️', label: 'My Rides'    },
  { to: '/bookings',   icon: '📋', label: 'My Bookings' },
  { to: '/chat',       icon: '💬', label: 'Chat'        },
  { to: '/profile',    icon: '👤', label: 'Profile'     },
  { to: '/safety', icon: '🛡️', label: 'Safety' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

// ── Mobile Top Bar ──
function MobileTopBar() {
  const { user } = useSelector(s => s.auth);
  return (
    <header className="md:hidden h-14 border-b border-aviro-border bg-aviro-card/90 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-aviro-orange rounded-lg flex items-center justify-center text-white font-bold text-xs">A</div>
        <span className="font-display font-bold text-aviro-orange text-base">AVIRO</span>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="w-8 h-8 rounded-full bg-aviro-orange/20 flex items-center justify-center text-sm">
          {user?.gender === 'FEMALE' ? '👩' : '👨'}
        </div>
      </div>
    </header>
  );
}

// ── Mobile Bottom Navigation ──
function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-aviro-card border-t border-aviro-border">
      <div className="flex items-center justify-around px-2 py-1 safe-area-bottom">
        {bottomLinks.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0
              ${isActive
                ? 'text-aviro-orange bg-aviro-orange/10'
                : 'text-aviro-muted hover:text-white'}`
            }
          >
            <span className="text-xl leading-none">{l.icon}</span>
            <span className="text-[10px] font-medium truncate">{l.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// ── Desktop Sidebar ──
function DesktopSidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const handleLogout = () => { dispatch(logoutUser()); navigate('/login'); };

  return (
    <aside className="hidden md:flex w-60 flex-col bg-aviro-card border-r border-aviro-border h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-aviro-border flex items-center gap-3 h-16">
        <div className="w-8 h-8 bg-aviro-orange rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
        <span className="font-display font-bold text-aviro-orange text-lg">AVIRO</span>
      </div>

      {/* User pill */}
      {user && (
        <div className="m-3 p-3 bg-aviro-card2 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-aviro-orange/20 flex items-center justify-center text-sm flex-shrink-0">
            {user.gender === 'FEMALE' ? '👩' : '👨'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user.fullName}</p>
            <p className="text-xs text-aviro-muted truncate">{user.collegeName}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {sidebarLinks.map(l => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="text-lg flex-shrink-0">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Credits */}
      {user && (
        <div className="mx-3 mb-2 p-3 bg-aviro-orange/10 border border-aviro-orange/20 rounded-xl">
          <p className="text-xs text-aviro-muted">AVIRO Credits</p>
          <p className="text-aviro-orange font-bold text-lg">🪙 {user.aviroCredits || 0}</p>
        </div>
      )}

      {/* Logout */}
      <div className="p-2 border-t border-aviro-border">
        <button onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:bg-red-500/10 hover:text-red-400">
          <span className="text-lg">🚪</span>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

// ── Desktop Topbar ──
function DesktopTopbar() {
  const { user } = useSelector(s => s.auth);
  return (
    <header className="hidden md:flex h-16 border-b border-aviro-border bg-aviro-card/80 backdrop-blur sticky top-0 z-10 items-center justify-between px-6">
      <div/>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-aviro-orange/20 flex items-center justify-center text-sm">
            {user?.gender === 'FEMALE' ? '👩' : '👨'}
          </div>
          <span className="text-sm font-medium">{user?.fullName?.split(' ')[0]}</span>
        </div>
      </div>
    </header>
  );
}

// ── Main Layout ──
export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-aviro-dark">
      {/* Desktop sidebar */}
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <MobileTopBar />

        {/* Desktop topbar */}
        <DesktopTopbar />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}