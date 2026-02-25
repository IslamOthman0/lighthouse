import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initDB } from './db';
import './index.css';

function render() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Initialize IndexedDB first — auto-recovers from corruption before any
// component tries to query the database.
initDB().then(render).catch(render); // always render even if initDB throws
