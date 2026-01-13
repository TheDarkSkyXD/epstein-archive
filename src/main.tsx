import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { NavigationProvider } from './services/ContentNavigationService.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import ToastProvider from './components/ToastProvider';

import { SensitiveSettingsProvider } from './contexts/SensitiveSettingsContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SensitiveSettingsProvider>
            <BrowserRouter>
              <NavigationProvider>
                <App />
              </NavigationProvider>
            </BrowserRouter>
          </SensitiveSettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
