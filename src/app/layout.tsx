import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import ThemeManager from "@/components/ThemeManager";
import { themeCss, isThemeName, DEFAULT_THEME } from "@/themes";
import { UI_CSS } from "@/components/ui";

export const metadata: Metadata = {
  title: "Trinity",
  description: "Card automation",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieTheme = (await cookies()).get("trinity_theme")?.value;
  const theme = isThemeName(cookieTheme) ? cookieTheme : DEFAULT_THEME;

  return (
    <html lang="en" data-theme={theme}>
      <head>
        {/* Theme design tokens as CSS variables — injected server-side so there
            is no flash; the plain-CSS surfaces read these, MUI reads the token
            object. `data-theme` on <html> selects the active set. */}
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        {/* Design-system stylesheet — the .ui-* kit, keyed off the same tokens. */}
        <style dangerouslySetInnerHTML={{ __html: UI_CSS }} />
      </head>
      <body>
        <ThemeManager initial={theme}>{children}</ThemeManager>
      </body>
    </html>
  );
}
