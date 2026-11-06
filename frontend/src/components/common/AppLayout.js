import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../store/authSlice';
import NotificationBell from './NotificationBell';
import TripAlerts from './TripAlerts';
import PushPrompt from './PushPrompt';
import { Wordmark } from './Logo';
import useOpenChats from '../../hooks/useOpenChats';
import { FiHome, FiSearch, FiPlusCircle, FiList, FiMessageCircle, FiShield, FiUser, FiSettings, FiMap, FiLogOut } from 'react-icons/fi';

// ── Bottom nav links (mobile) ──
// Trips covers rides you booked and rides you offer. Profile and Settings open from the avatar,
// Safety from the shield in the top bar.
const bottomLinks = [
  { to: '/dashboard',  icon: FiHome,          label: 'Home'  },
  { to: '/search',     icon: FiSearch,        label: 'Find'  },
  { to: '/offer-ride', icon: FiPlusCircle,    label: 'Offer' },
  { to: '/bookings',   icon: FiList,          label: 'Trips', also: ['/my-rides', '/tracking'] },
  { to: '/chat',       icon: FiMessageCircle, label: 'Chat'  },
];

// The user's avatar; opens Profile. Ringed while on Profile.
function ProfileAvatar({ showName = false }) {
  const { user } = useSelector(s => s.auth);
  return (
    <NavLink to="/profile" aria-label="Profile" title="Profile"
      className={`flex items-center gap-2 rounded-full ${showName ? 'pr-2 hover:bg-aviro-card2' : ''}`}>
      {({ isActive }) => (
        <>
          <span className={`w-9 h-9 rounded-full bg-aviro-card2 flex items-center justify-center text-sm font-bold transition-shadow
            ${isActive ? 'ring-2 ring-black' : 'hover:ring-2 hover:ring-black/20'}`}>
            {(user?.fullName || '?').charAt(0).toUpperCase()}
          </span>
          {showName && <span className="text-sm font-medium">{user?.fullName?.split(' ')[0]}</span>}
        </>
      )}
    </NavLink>
  );
}

// ── Sidebar links (desktop) ──
const sidebarLinks = [
  { to: '/dashboard',  icon: FiHome,          label: 'Home'        },
  { to: '/search',     icon: FiSearch,        label: 'Find a ride' },
  { to: '/offer-ride', icon: FiPlusCircle,    label: 'Offer a ride' },
  { to: '/bookings',   icon: FiList,          label: 'Rides I booked' },
  { to: '/my-rides',   icon: FiMap,           label: 'Rides I offer' },
  { to: '/chat',       icon: FiMessageCircle, label: 'Chat'        },
  { to: '/profile',    icon: FiUser,          label: 'Profile'     },
  { to: '/safety',     icon: FiShield,        label: 'Safety'      },
  { to: '/settings',   icon: FiSettings,      label: 'Settings'    },
];

// ── Mobile Top Bar ──
function MobileTopBar() {
  return (
    <header className="md:hidden h-14 bg-white/95 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Wordmark height={26} />
      </div>
      <div className="flex items-center gap-2">
        <NavLink to="/safety" aria-label="Safety Center" title="Safety Center"
          className={({ isActive }) => `w-9 h-9 rounded-full flex items-center justify-center transition-colors
            ${isActive ? 'bg-black text-white' : 'bg-aviro-card2 text-aviro-fg'}`}><FiShield size={18} /></NavLink>
        <NotificationBell />
        <ProfileAvatar />
      </div>
    </header>
  );
}

// ── Mobile Bottom Navigation ──
const isOn = (l, pathname) => pathname.startsWith(l.to) || !!l.also?.some(p => pathname.startsWith(p));

function MobileBottomNav({ chatOpen }) {
  const { pathname } = useLocation();
  // Chat shows only while a confirmed ride is on
  const links = bottomLinks.filter(l => l.to !== '/chat' || chatOpen);
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-aviro-border">
      <div className="flex items-center justify-around px-2 py-1 safe-area-bottom">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 min-w-0 transition-colors
              ${isActive || l.also?.some(p => pathname.startsWith(p))
                ? 'text-aviro-fg font-semibold'
                : 'text-aviro-muted hover:text-aviro-fg'}`
            }
          >
            <l.icon size={22} strokeWidth={isOn(l, pathname) ? 2.4 : 1.8} />
            <span className="text-[11px] truncate">{l.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// ── Desktop Sidebar ──
function DesktopSidebar({ chatOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const handleLogout = () => { dispatch(logoutUser()); navigate('/login'); };

  return (
    <aside className="hidden md:flex w-60 flex-col bg-aviro-card border-r border-aviro-border h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-aviro-border flex items-center gap-3 h-16">
        <Wordmark height={30} />
      </div>

      {/* User pill */}
      {user && (
        <div className="m-3 p-3 bg-aviro-card2 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {(user.fullName || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-aviro-fg truncate">{user.fullName}</p>
            <p className="text-xs text-aviro-muted truncate">{user.collegeName}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {sidebarLinks.filter(l => l.to !== '/chat' || chatOpen).map(l => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <l.icon size={18} className="flex-shrink-0" />
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>


      {/* Logout */}
      <div className="p-2 border-t border-aviro-border">
        <button onClick={handleLogout}
          className="sidebar-link w-full text-red-600 hover:bg-red-500/10 hover:text-red-600">
          <FiLogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

// ── Desktop Topbar ──
function DesktopTopbar() {
  return (
    <header className="hidden md:flex h-16 border-b border-aviro-border bg-aviro-card/80 backdrop-blur sticky top-0 z-10 items-center justify-between px-6">
      <div/>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <ProfileAvatar showName />
      </div>
    </header>
  );
}

// ── Main Layout ──
export default function AppLayout() {
  const { chats } = useOpenChats();
  const chatOpen = chats.length > 0;
  return (
    <div className="flex min-h-screen bg-aviro-dark">
      {/* Desktop sidebar */}
      <DesktopSidebar chatOpen={chatOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <MobileTopBar />

        {/* Desktop topbar */}
        <DesktopTopbar />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
          <PushPrompt />
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav chatOpen={chatOpen} />

      {/* Live notifications and ride request popups */}
      <TripAlerts />
    </div>
  );
}