import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

export interface Settings {
  apiKey: string;
  botName: string;
  userName: string;
  theme: ThemePreference;
}

interface SettingsContextValue extends Settings {
  updateSettings: (partial: Partial<Settings>) => void;
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  botName: "Gastito",
  userName: "",
  theme: "system",
};

const SettingsContext = createContext<SettingsContextValue>({
  ...DEFAULT_SETTINGS,
  updateSettings: () => {},
});

const SETTINGS_KEY = "gastito_settings_v1";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          setSettings((prev) => ({ ...prev, ...saved }));
        } catch {}
      }
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
