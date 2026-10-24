
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import SafetyPage from './pages/SafetyPage';

// Pages
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import DashboardPage from './pages/DashboardPage';
import SearchRidePage from './pages/SearchRidePage';
import OfferRidePage from './pages/OfferRidePage';
import MyRidesPage from './pages/MyRidesPage';
import BookingsPage from './pages/BookingsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import RideDetailPage from './pages/RideDetailPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import LiveTrackingPage from './pages/LiveTrackingPage';
import LegalPage from './pages/LegalPage';
import IntroPage from './pages/IntroPage';

// Layout
import AppLayout from './components/common/AppLayout';

const isAuthenticated = (token) => {
  if (token) return true;

  const stored = localStorage.getItem('aviro_token');

  return (
    !!stored &&
    stored !== 'undefined' &&
    stored !== 'null'
  );
};

const PrivateRoute = ({ children }) => {
  const { token } = useSelector((state) => state.auth);

  return isAuthenticated(token)
    ? children
    : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { token } = useSelector((state) => state.auth);

  return isAuthenticated(token)
    ? <Navigate to="/dashboard" replace />
    : children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================
            LANDING PAGE
        ========================= */}
        <Route
          path="/"
          element={<LandingPage />}
        />

        {/* =========================
            PUBLIC ROUTES
        ========================= */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        <Route
          path="/verify-otp"
          element={<VerifyOtpPage />}
        />

        <Route
          path="/safety"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<SafetyPage />}
          />
        </Route>

        <Route
          path="/privacy"
          element={<LegalPage type="privacy" />}
        />

        <Route
          path="/terms"
          element={<LegalPage type="terms" />}
        />

        {/* Onboarding after signup */}
        <Route
          path="/welcome"
          element={
            <PrivateRoute>
              <IntroPage />
            </PrivateRoute>
          }
        />

        {/* =========================
            PROTECTED ROUTES
        ========================= */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<DashboardPage />}
          />
        </Route>

        <Route
          path="/search"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<SearchRidePage />}
          />
        </Route>

        <Route
          path="/offer-ride"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<OfferRidePage />}
          />
        </Route>

        <Route
          path="/my-rides"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<MyRidesPage />}
          />
        </Route>

        <Route
          path="/bookings"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<BookingsPage />}
          />
        </Route>

        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<ChatPage />}
          />
        </Route>

        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<ProfilePage />}
          />
        </Route>

        <Route
          path="/rides/:id"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<RideDetailPage />}
          />
        </Route>

        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<AdminPage />}
          />
        </Route>

        <Route
          path="/tracking/:bookingId"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<LiveTrackingPage />}
          />
        </Route>

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={<SettingsPage />}
          />
        </Route>

        {/* =========================
            404
        ========================= */}
        <Route
          path="*"
          element={<NotFoundPage />}
        />

      </Routes>
    </BrowserRouter>
  );
}

