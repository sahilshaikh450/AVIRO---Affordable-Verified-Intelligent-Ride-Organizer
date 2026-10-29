import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../store/authSlice';
import Logo from './Logo';

const links = [
  { to: '/dashboard',  icon: '🏠', label: 'Dashboard'   },
  { to: '/search',     icon: '🔍', label: 'Find a Ride'  },
  { to: '/offer-ride', icon: '🏍️', label: 'Offer Ride'   },
  { to: '/my-rides',   icon: '🗺️', label: 'My Rides'     },
  { to: '/bookings',   icon: '📋', label: 'My Bookings'  },
  { to: '/chat',       icon: '💬', label: 'Chat'         },
  { to: '/profile',    icon: '👤', label: 'Profile'      },
];

export default function Sidebar({ open }) {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user }  = useSelector(s => s.auth);

  const handleLogout = () => { dispatch(logoutUser()); navigate('/login'); };

  return (
    <aside className={`${open ? 'w-60' : 'w-16'} transition-all duration-300 flex flex-col bg-aviro-card border-r border-aviro-border h-screen sticky top-0 overflow-hidden`}>
      {/* Logo */}
      <div className="p-4 border-b border-aviro-border flex items-center gap-3 h-16">
        <Logo size={32} />
        {open && <span className="font-display font-bold text-aviro-orange text-lg tracking-tight">AVIRO</span>}
      </div>

      {/* User pill */}
      {open && user && (
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

      {/* Nav links */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${!open ? 'justify-center px-0' : ''}`
            }
          >
            <span className="text-lg flex-shrink-0">{l.icon}</span>
            {open && <span>{l.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Credits */}
      {open && user && (
        <div className="mx-3 mb-2 p-3 bg-aviro-orange/10 border border-aviro-orange/20 rounded-xl">
          <p className="text-xs text-aviro-muted">AVIRO Credits</p>
          <p className="text-aviro-orange font-bold text-lg">🪙 {user.aviroCredits || 0}</p>
        </div>
      )}

      {/* Logout */}
      <div className="p-2 border-t border-aviro-border">
        <button
          onClick={handleLogout}
          className={`sidebar-link w-full text-red-400 hover:bg-red-500/10 hover:text-red-400 ${!open ? 'justify-center px-0' : ''}`}
        >
          <span className="text-lg">🚪</span>
          {open && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}