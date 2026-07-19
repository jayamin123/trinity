"use client";
import { useState } from "react";
import { IconButton, Menu, MenuItem, ListItemIcon, Box, Typography, Tooltip } from "@mui/material";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import CheckIcon from "@mui/icons-material/Check";
import { useThemeName } from "./ThemeManager";
import { THEME_NAMES, THEMES } from "@/themes";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useThemeName();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <Tooltip title="Theme">
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ mr: 0.5 }}>
          <PaletteOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { minWidth: 210 } } }}>
        <Typography variant="caption" sx={{ px: 2, py: 0.5, color: "text.secondary", fontWeight: 650, letterSpacing: ".04em", textTransform: "uppercase", fontSize: 10.5 }}>Theme</Typography>
        {THEME_NAMES.map((n) => {
          const t = THEMES[n];
          return (
            <MenuItem key={n} selected={n === theme} onClick={() => { setTheme(n); setAnchor(null); }} sx={{ py: 0.9 }}>
              <ListItemIcon>
                <Box sx={{ width: 28, height: 20, borderRadius: 1, background: t.bg, border: `1px solid ${t.border2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Box sx={{ width: 9, height: 9, borderRadius: "50%", background: t.accent }} />
                </Box>
              </ListItemIcon>
              <Typography sx={{ flex: 1, fontSize: 14 }}>{t.label}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", ml: 2 }}>{t.mode}</Typography>
              {n === theme && <CheckIcon fontSize="small" sx={{ ml: 1, color: "primary.main" }} />}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
