import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import LoginScreen from './components/auth/LoginScreen.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useAuth } from './hooks/useAuth.js';
import { initDB } from './db';
import './index.css';

function Root() {
  const { auth, isRestoring } = useAuth();

  // Show nothing while checking IndexedDB for saved auth
  if (isRestoring) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize: '28px',
          fontFamily: "'Dune Rise', sans-serif",
          letterSpacing: '3px',
          color: '#ffffff',
          opacity: 0.4,
        }}>
          LIGHTHOUSE
        </span>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <LoginScreen />;
  }

  return <App />;
}

function render() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <Root />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Initialize IndexedDB first — auto-recovers from corruption before any
// component tries to query the database.
initDB().then(render).catch(render); // always render even if initDB throws
