import { createTheme, type Theme } from "@mui/material/styles";

// ---------------------------------------------------------------------------
// Design-token themes. Every color in the app comes from these tokens — the
// plain-CSS surfaces read the `--app-*` CSS variables, and the MUI theme is
// built from the same token object, so the whole app switches as one.
// Add a theme = add an entry to THEMES. Nothing else hardcodes color.
// ---------------------------------------------------------------------------

export type ThemeName = "slate" | "midnight" | "nord" | "rose" | "mint";

export type Tokens = {
  label: string;
  mode: "light" | "dark";
  bg: string; grad: string; panel: string; panel2: string; hover: string;
  border: string; border2: string;
  text: string; muted: string; faint: string;
  accent: string; accentInk: string; accentSoft: string; accentOn: string;
  good: string; goodSoft: string; bad: string; badSoft: string;
  warn: string; warnSoft: string; info: string; infoSoft: string;
  glyphBg: string; glyphText: string; shadow: string;
};

export const THEMES: Record<ThemeName, Tokens> = {
  slate: {
    label: "Slate", mode: "light",
    bg: "#ffffff", grad: "none",
    panel: "#ffffff", panel2: "#f6f8fa", hover: "#f3f5f8", border: "#e6e9ee", border2: "#d7dce3",
    text: "#1a1c24", muted: "#5d6577", faint: "#949bad",
    accent: "#5a56e0", accentInk: "#4b47d6", accentSoft: "rgba(90,86,224,.09)", accentOn: "#ffffff",
    good: "#17915f", goodSoft: "rgba(23,145,95,.12)", bad: "#d23b41", badSoft: "rgba(210,59,65,.12)",
    warn: "#b07219", warnSoft: "rgba(176,114,25,.14)", info: "#2b7de0", infoSoft: "rgba(43,125,224,.12)",
    glyphBg: "linear-gradient(135deg,#e7e8f5,#d8daf0)", glyphText: "#5a56e0", shadow: "0 1px 2px rgba(20,22,40,.04),0 10px 30px -16px rgba(20,22,40,.14)",
  },
  midnight: {
    label: "Midnight", mode: "dark",
    bg: "#0c0d12", grad: "radial-gradient(1100px 560px at 84% -12%, #191a2b 0%, transparent 58%)",
    panel: "#14151d", panel2: "#171922", hover: "#1b1d28", border: "rgba(255,255,255,.07)", border2: "rgba(255,255,255,.12)",
    text: "#ecedf3", muted: "#9aa1b2", faint: "#6a7080",
    accent: "#8480ff", accentInk: "#9b98ff", accentSoft: "rgba(132,128,255,.14)", accentOn: "#ffffff",
    good: "#34c98c", goodSoft: "rgba(52,201,140,.14)", bad: "#f2595f", badSoft: "rgba(242,89,95,.14)",
    warn: "#e5a94b", warnSoft: "rgba(229,169,75,.15)", info: "#5aa6fb", infoSoft: "rgba(90,166,251,.15)",
    glyphBg: "linear-gradient(135deg,#2b2f45,#3a4066)", glyphText: "#c9ccff", shadow: "0 1px 0 rgba(255,255,255,.02),0 22px 50px -28px rgba(0,0,0,.8)",
  },
  nord: {
    label: "Nord", mode: "dark",
    bg: "#242933", grad: "radial-gradient(1100px 560px at 84% -12%, #2e3440 0%, transparent 58%)",
    panel: "#2e3440", panel2: "#333b4a", hover: "#3b4252", border: "#3b4252", border2: "#4c566a",
    text: "#eceff4", muted: "#b6becb", faint: "#7b8394",
    accent: "#88c0d0", accentInk: "#8fbcbb", accentSoft: "rgba(136,192,208,.15)", accentOn: "#2e3440",
    good: "#a3be8c", goodSoft: "rgba(163,190,140,.15)", bad: "#bf616a", badSoft: "rgba(191,97,106,.16)",
    warn: "#ebcb8b", warnSoft: "rgba(235,203,139,.15)", info: "#81a1c1", infoSoft: "rgba(129,161,193,.16)",
    glyphBg: "linear-gradient(135deg,#3b4252,#434c5e)", glyphText: "#88c0d0", shadow: "0 1px 0 rgba(255,255,255,.02),0 22px 50px -28px rgba(0,0,0,.6)",
  },
  rose: {
    label: "Rosé", mode: "dark",
    bg: "#191724", grad: "radial-gradient(1100px 560px at 84% -12%, #1f1d2e 0%, transparent 58%)",
    panel: "#1f1d2e", panel2: "#26233a", hover: "#2a2740", border: "#26233a", border2: "#403d52",
    text: "#e0def4", muted: "#c4c1dc", faint: "#908caa",
    accent: "#c4a7e7", accentInk: "#d0b8ee", accentSoft: "rgba(196,167,231,.15)", accentOn: "#191724",
    good: "#9ccfd8", goodSoft: "rgba(156,207,216,.14)", bad: "#eb6f92", badSoft: "rgba(235,111,146,.15)",
    warn: "#f6c177", warnSoft: "rgba(246,193,119,.14)", info: "#31748f", infoSoft: "rgba(49,116,143,.18)",
    glyphBg: "linear-gradient(135deg,#26233a,#403d52)", glyphText: "#c4a7e7", shadow: "0 1px 0 rgba(255,255,255,.02),0 22px 50px -28px rgba(0,0,0,.7)",
  },
  mint: {
    label: "Mint", mode: "light",
    bg: "#f5f8f7", grad: "radial-gradient(1100px 560px at 84% -12%, #e6f2ee 0%, transparent 58%)",
    panel: "#ffffff", panel2: "#f6faf9", hover: "#eef6f3", border: "#e4ece9", border2: "#d6e2de",
    text: "#16211d", muted: "#566b64", faint: "#90a49d",
    accent: "#0d9488", accentInk: "#0b7d73", accentSoft: "rgba(13,148,136,.10)", accentOn: "#ffffff",
    good: "#15803d", goodSoft: "rgba(21,128,61,.12)", bad: "#d23b41", badSoft: "rgba(210,59,65,.12)",
    warn: "#b45309", warnSoft: "rgba(180,83,9,.13)", info: "#2b7de0", infoSoft: "rgba(43,125,224,.12)",
    glyphBg: "linear-gradient(135deg,#dcefe9,#cfe8e0)", glyphText: "#0d9488", shadow: "0 1px 2px rgba(16,30,26,.04),0 10px 30px -16px rgba(16,30,26,.14)",
  },
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
export const DEFAULT_THEME: ThemeName = "slate";
export const isThemeName = (v: unknown): v is ThemeName => typeof v === "string" && v in THEMES;

/** CSS variable block for one token set. */
function vars(t: Tokens): string {
  return [
    `--app-bg:${t.bg}`, `--app-grad:${t.grad}`, `--app-panel:${t.panel}`, `--app-panel2:${t.panel2}`, `--app-hover:${t.hover}`,
    `--app-border:${t.border}`, `--app-border2:${t.border2}`,
    `--app-text:${t.text}`, `--app-muted:${t.muted}`, `--app-faint:${t.faint}`,
    `--app-accent:${t.accent}`, `--app-accent-ink:${t.accentInk}`, `--app-accent-soft:${t.accentSoft}`, `--app-accent-on:${t.accentOn}`,
    `--app-good:${t.good}`, `--app-good-soft:${t.goodSoft}`, `--app-bad:${t.bad}`, `--app-bad-soft:${t.badSoft}`,
    `--app-warn:${t.warn}`, `--app-warn-soft:${t.warnSoft}`, `--app-info:${t.info}`, `--app-info-soft:${t.infoSoft}`,
    `--app-glyph-bg:${t.glyphBg}`, `--app-glyph-text:${t.glyphText}`, `--app-shadow:${t.shadow}`,
  ].join(";");
}

/** Server-injected stylesheet: default vars + one block per theme + body bg. */
export function themeCss(): string {
  const perTheme = THEME_NAMES.map((n) => `:root[data-theme="${n}"]{${vars(THEMES[n])}}`).join("");
  // The MUI X DataGrid doesn't fully follow the palette (esp. its scroller/rows),
  // so theme it explicitly from the same tokens.
  const dataGrid =
    `.MuiDataGrid-root{background:var(--app-panel);border:none;color:var(--app-text)}` +
    `.MuiDataGrid-main,.MuiDataGrid-virtualScroller,.MuiDataGrid-row{background:var(--app-panel)}` +
    `.MuiDataGrid-columnHeaders,.MuiDataGrid-columnHeader,.MuiDataGrid-toolbarContainer,.MuiDataGrid-footerContainer{background:var(--app-panel2)!important;border-color:var(--app-border)!important}` +
    `.MuiDataGrid-cell,.MuiDataGrid-columnHeaders,.MuiDataGrid-columnHeader,.MuiDataGrid-filler,.MuiDataGrid-footerContainer{border-color:var(--app-border)!important}` +
    `.MuiDataGrid-row:hover{background:var(--app-hover)!important}` +
    `.MuiDataGrid-columnSeparator{color:var(--app-border)}`;
  return `:root{${vars(THEMES[DEFAULT_THEME])}}${perTheme}` +
    `body{background:var(--app-bg);background-image:var(--app-grad);background-attachment:fixed;color:var(--app-text)}` +
    dataGrid;
}

/** MUI theme built from a token set — so MUI components adopt the same colors. */
export function buildMuiTheme(name: ThemeName): Theme {
  const t = THEMES[name];
  return createTheme({
    palette: {
      mode: t.mode,
      primary: { main: t.accent, contrastText: t.accentOn },
      success: { main: t.good },
      warning: { main: t.warn },
      error: { main: t.bad },
      info: { main: t.info },
      background: { default: t.bg, paper: t.panel },
      text: { primary: t.text, secondary: t.muted },
      divider: t.border,
    },
    shape: { borderRadius: 11 },
    typography: {
      fontFamily: '"Segoe UI", ui-sans-serif, -apple-system, system-ui, Roboto, sans-serif',
      h4: { fontWeight: 680, letterSpacing: "-0.02em" },
      h5: { fontWeight: 660, letterSpacing: "-0.01em" },
      h6: { fontWeight: 650 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "default" },
        styleOverrides: { root: { background: "color-mix(in srgb, var(--app-bg) 72%, transparent)", backdropFilter: "blur(12px) saturate(1.2)", color: t.text, borderBottom: `1px solid ${t.border}`, boxShadow: "none" } },
      },
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" }, outlined: { borderColor: t.border } } },
      MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: t.shadow } } },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 9, paddingInline: 15 }, outlined: { borderColor: t.border2, color: t.text, "&:hover": { borderColor: t.muted, background: t.panel } } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 650 } } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 9 }, notchedOutline: { borderColor: t.border } } },
      MuiTableCell: { styleOverrides: { head: { fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: t.faint, fontWeight: 650, background: t.panel2 }, root: { borderColor: t.border } } },
      MuiTableRow: { styleOverrides: { root: { "&:hover": { background: t.hover } } } },
      MuiTab: { styleOverrides: { root: { textTransform: "none", fontWeight: 600 } } },
      MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8, fontSize: 12 } } },
    },
  });
}
