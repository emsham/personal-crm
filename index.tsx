
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { LLMSettingsProvider } from './contexts/LLMSettingsContext';
import { ChatProvider } from './contexts/ChatContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <LLMSettingsProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </LLMSettingsProvider>
    </AuthProvider>
  </React.StrictMode>
);
