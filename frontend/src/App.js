import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import SafetyPage from './pages/SafetyPage';

// Pages
import SettingsPage from './pages/SettingsPage';
import LandingPage      from './pages/LandingPage';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import VerifyOtpPage    from './pages/VerifyOtpPage';
import DashboardPage    from './pages/DashboardPage';
import SearchRidePage   from './pages/SearchRidePage';
import OfferRidePage    from './pages/OfferRidePage';
import MyRidesPage      from './pages/MyRidesPage';
import BookingsPage     from './pages/BookingsPage';
import ChatPage         from './pages/ChatPage';
import ProfilePage      from './pages/ProfilePage';
import RideDetailPage   from './pages/RideDetailPage';
import AdminPage        from './pages/AdminPage';
import NotFoundPage     from './pages/NotFoundPage';
import LiveTrackingPage from './pages/LiveTrackingPage';

// Layout
import AppLayout from './components/common/AppLayout';

const isAuthenticated = (token) => {
  if (token) return true;
  const stored = localStorage.getItem('aviro_token');
  return !!stored && stored !== 'undefined' && stored !== 'null';
};

const PrivateRoute = ({ children }) => {
  const { token } = useSelector(s => s.auth);
  return isAuthenticated(token) ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { token } = useSelector(s => s.auth);
  return isAuthenticated(token) ? <Navigate to="/dashboard" replace /> : children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login"      element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"   element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
<Route path="safety" element={<SafetyPage />} />
        {/* Protected */}
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="dashboard"              element={<DashboardPage />} />
          <Route path="search"                 element={<SearchRidePage />} />
          <Route path="offer-ride"             element={<OfferRidePage />} />
          <Route path="my-rides"               element={<MyRidesPage />} />
          <Route path="bookings"               element={<BookingsPage />} />
          <Route path="chat"                   element={<ChatPage />} />
          <Route path="profile"                element={<ProfilePage />} />
          <Route path="rides/:id"              element={<RideDetailPage />} />
          <Route path="admin"                  element={<AdminPage />} />
          <Route path="tracking/:bookingId"    element={<LiveTrackingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}