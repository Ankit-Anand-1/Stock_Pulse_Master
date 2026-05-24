import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { PortfolioProvider } from './contexts/PortfolioContext';
import { AlertsProvider } from './contexts/AlertsContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PortfolioProvider>
        <AlertsProvider>
          <App />
        </AlertsProvider>
      </PortfolioProvider>
    </AuthProvider>
  </StrictMode>,
);
