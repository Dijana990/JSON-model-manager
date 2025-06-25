import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './context/SessionContext'; // putanja do SessionProvider-a

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider> {/* ✅ DODANO OVDJE */}
        <App />
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
