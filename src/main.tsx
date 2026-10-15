import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { SettingsProvider } from './lib/settings';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { ProjectFlow } from './pages/ProjectFlow';
import { Projects } from './pages/Projects';
import { Settings } from './pages/Settings';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="projets" element={<Projects />} />
              <Route path="materiel" element={<Library />} />
              <Route path="parametres" element={<Settings />} />
              <Route path="projet/:id/:step?" element={<ProjectFlow />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
);
