import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from './storage';
import type { Project, Settings } from './types';
import { uid } from './utils';

interface SettingsCtx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<SettingsCtx>({ settings: DEFAULT_SETTINGS, update: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);

export function newProject(settings: Settings, description = ''): Project {
  const now = Date.now();
  return {
    id: uid(),
    name: 'Nouveau projet',
    nameIsAuto: true,
    createdAt: now,
    updatedAt: now,
    description,
    ambiance: '',
    inspirations: [],
    items: [],
    format: settings.defaultFormat,
    perspective: settings.defaultPerspective,
    moment: 'auto',
    keepArchitecture: true,
    extraConstraints: '',
    lastStep: 'evenement',
  };
}
