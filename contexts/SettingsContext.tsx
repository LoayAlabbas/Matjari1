// Powered by OnSpace.AI
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppSettings } from '@/types';

interface SettingsContextType {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children, value }: { children: ReactNode; value: AppSettings }) {
  const [settings, setSettings] = useState<AppSettings>(value);
  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be within SettingsProvider');
  return ctx;
}
