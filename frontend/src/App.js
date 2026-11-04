
import React, { Suspense, lazy as reactLazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';


// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';

// Layout
import AppLayout from './components/common/AppLayout';

// Pages other than the first screens load on demand, so the app opens faster on mobile data.
// After a new release the old page files are gone; reload once to pick up the new ones.
const RELOAD_KEY = 'aviro_reloaded_for_update';
const lazy = (load) => reactLazy(() => load().then((page) => {
  sessionStorage.removeItem(RELOAD_KEY);
  return page;
}, (err) => {
  if (!sessionStorage.getItem(RELOAD_KEY)) {
    sessionStorage.setItem(RELOAD_KEY, '1');
    window.location.reload();
    return new Promise(() => {}); // keep the spinner until the reload happens
  }
  throw err;
}));
const SafetyPage = lazy(() => import('./pages/SafetyPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const VerifyOtpPage = lazy(() => import('./pages/VerifyOtpPage'));
const SearchRidePage = lazy(() => import('./pages/SearchRidePage'));
const OfferRidePage = lazy(() => import('./pages/OfferRidePage'));
const MyRidesPage = lazy(() => import('./pages/MyRidesPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RideDetailPage = lazy(() => import('./pages/RideDetailPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const LiveTrackingPage = lazy(() => import('./pages/LiveTrackingPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const IntroPage = lazy(() => import('./pages/IntroPage'));
const SharedTripPage = lazy(() => import('./pages/SharedTripPage'));

const isAuthenticated = (token) => {
  if (token) return true;

  const stored = localStorage.getItem('aviro_token');

  return (
    !!stored &&
    stored !== 'undefined' &&
    stored !== 'null'
  );
};

// Shown for the moment a page's code is downloading
const PageLoading = () => (
  <div className="min-h-screen bg-aviro-dark flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-aviro-orange/30 border-t-aviro-orange rounded-full animate-spin" />
  </div>
);

const PrivateRoute = ({ children }) => {
  const { token } = useSelector((state) => state.auth);

  return isAuthenticated(token)
    ? children
    : <Navigate to="/login" replace />;
};

// The server also refuses admin data; this just keeps others off an empty page
const AdminRoute = ({ children }) => {
  const { token, user } = useSelector((state) => state.auth);
  if (!isAuthenticated(token)) return <Navigate to="/login" replace />;
  return user?.role === 'ADMIN' ? children : <Navigate to="/dashboard" replace />;
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
      <Suspense fallback={<PageLoading />}>
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

        {/* Trip shared with family: no account needed */}
        <Route
          path="/share/:token"
          element={<SharedTripPage />}
        />

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
            <AdminRoute>
              <AppLayout />
            </AdminRoute>
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
      </Suspense>
    </BrowserRouter>
  );
}

