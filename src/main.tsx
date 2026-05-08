import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { WorkspaceProvider } from './hooks/useWorkspaces';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider>
            <WorkspaceProvider>
                <App />
            </WorkspaceProvider>
        </AuthProvider>
    </StrictMode>
);
