"use client";
import { createContext, useContext, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { buildMuiTheme, DEFAULT_THEME, isThemeName, type ThemeName } from "@/themes";

const Ctx = createContext<{ theme: ThemeName; setTheme: (t: ThemeName) => void }>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});
export const useThemeName = () => useContext(Ctx);

export default function ThemeManager({ initial, children }: { initial: ThemeName; children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(isThemeName(initial) ? initial : DEFAULT_THEME);
  const muiTheme = useMemo(() => buildMuiTheme(theme), [theme]);

  function setTheme(t: ThemeName) {
    setThemeState(t);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = t; // drives the --app-* CSS vars
      document.cookie = `trinity_theme=${t};path=/;max-age=31536000;samesite=lax`;
    }
  }

  return (
    <Ctx.Provider value={{ theme, setTheme }}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Ctx.Provider>
  );
}
