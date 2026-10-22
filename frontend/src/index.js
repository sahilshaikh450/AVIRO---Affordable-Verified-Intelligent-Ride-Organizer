import React from 'react';
import 'leaflet/dist/leaflet.css';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { initMonitoring, ErrorBoundary } from './services/monitoring';
import { wakeServer } from './services/api';

initMonitoring();
wakeServer();

// Shown if a render error crashes the app (the error is reported to Sentry when enabled)
const CrashFallback = () => (
  <div className="min-h-screen bg-aviro-dark flex items-center justify-center p-4 text-center">
    <div className="space-y-3">
      <p className="text-4xl">😵</p>
      <h1 className="font-bold text-xl text-white">Something went wrong</h1>
      <p className="text-aviro-muted text-sm">Please reload the page. If it keeps happening, contact aviro.support@gmail.com</p>
      <button onClick={() => window.location.reload()} className="btn-primary">Reload</button>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <ErrorBoundary fallback={<CrashFallback />}>
      <App />
    </ErrorBoundary>
    {/* Turn on after enabling Analytics in the Vercel dashboard */}
    {process.env.REACT_APP_ENABLE_ANALYTICS === 'true' && <Analytics />}
    <Toaster
      position="top-right"
      toastOptions={{
        style: { background: '#161A22', color: '#F0F2F8', border: '1px solid #2A2F3E' },
        success: { iconTheme: { primary: '#22C55E', secondary: '#161A22' } },
        error:   { iconTheme: { primary: '#EF4444', secondary: '#161A22' } },
      }}
    />
  </Provider>
);
