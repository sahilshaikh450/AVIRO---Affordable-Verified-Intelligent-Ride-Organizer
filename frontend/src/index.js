import React from 'react';
import 'leaflet/dist/leaflet.css';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { Toaster } from 'react-hot-toast';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <App />
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
