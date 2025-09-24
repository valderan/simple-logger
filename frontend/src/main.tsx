import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './providers/AuthProvider';
import { ThemeModeProvider } from './providers/ThemeModeProvider';
import { LocalizationProvider } from './providers/LocalizationProvider';
import './styles.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider>
        <ThemeModeProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </ThemeModeProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
