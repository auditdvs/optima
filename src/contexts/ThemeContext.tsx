import React, { createContext, useContext, useState } from 'react';

export type ThemeColor = 'indigo' | 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'pink' | 'rose';

type ThemeContextType = {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState<ThemeColor>('indigo');

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}