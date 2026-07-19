"use client";
import { createTheme } from "@mui/material/styles";

// Premium palette to match the Activity ledger page (indigo accent, soft
// panels, rounded, subtle borders). Applied app-wide so every MUI page adopts
// the same look without any per-page rewrites.
const accent = "#5a56e0";
const border = "#e9eaf2";
const panel = "#ffffff";
const bg = "#f6f7fb";
const text = "#1a1c24";
const muted = "#5d6577";
const fontStack = '"Segoe UI", ui-sans-serif, -apple-system, system-ui, Roboto, sans-serif';

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: accent },
    success: { main: "#17915f" },
    warning: { main: "#b07219" },
    error: { main: "#d23b41" },
    info: { main: "#2b7de0" },
    background: { default: bg, paper: panel },
    text: { primary: text, secondary: muted },
    divider: border,
  },
  shape: { borderRadius: 11 },
  typography: {
    fontFamily: fontStack,
    h4: { fontWeight: 680, letterSpacing: "-0.02em" },
    h5: { fontWeight: 660, letterSpacing: "-0.01em" },
    h6: { fontWeight: 650 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundImage: "radial-gradient(1100px 560px at 84% -12%, #eef0fb 0%, transparent 58%)", backgroundAttachment: "fixed" },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "default" },
      styleOverrides: {
        root: {
          background: "rgba(246,247,251,0.72)",
          backdropFilter: "blur(12px) saturate(1.2)",
          color: text,
          borderBottom: `1px solid ${border}`,
          boxShadow: "none",
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: border },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1px solid ${border}`, borderRadius: 14, boxShadow: "0 1px 2px rgba(20,22,40,.04), 0 10px 30px -16px rgba(20,22,40,.14)" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 9, paddingInline: 15 },
        outlined: { borderColor: "#dde0ec", color: text, "&:hover": { borderColor: muted, background: panel } },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 650 } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 9 }, notchedOutline: { borderColor: border } } },
    MuiTableCell: { styleOverrides: { head: { fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "#949bad", fontWeight: 650, background: "#fbfbfe" }, root: { borderColor: border } } },
    MuiTab: { styleOverrides: { root: { textTransform: "none", fontWeight: 600 } } },
    MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8, fontSize: 12 } } },
  },
});
