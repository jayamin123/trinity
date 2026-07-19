"use client";
import {
  AppBar, Toolbar, Typography, Box, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Menu, MenuItem, IconButton, Avatar, Divider, Chip,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import BoltIcon from "@mui/icons-material/Bolt";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import BkkClock from "./BkkClock";

const SIDEBAR_WIDTH = 224;

const NAV = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  { label: "Cards", href: "/cards", icon: <CreditCardIcon /> },
  { label: "Flows", href: "/flows", icon: <BoltIcon /> },
  { label: "Activity", href: "/activity", icon: <ListAltIcon /> },
];

const BrandMark = ({ size = 30 }: { size?: number }) => (
  <Box sx={{
    width: size, height: size, borderRadius: 2.2, flexShrink: 0,
    background: "linear-gradient(150deg, #5a56e0, #b3b0ff 130%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 4px 12px -3px rgba(90,86,224,.4)",
  }} />
);

export default function AppShell({
  children,
  userEmail,
  signOutAction,
}: {
  children: React.ReactNode;
  userEmail: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: t => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <BrandMark size={28} />
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1.4, fontWeight: 660, letterSpacing: "-0.01em" }}>
            Trinity&nbsp;Flows
          </Typography>
          <Chip
            label="● Scheduler running"
            size="small"
            sx={{ mr: 2, bgcolor: "rgba(23,145,95,.12)", color: "success.main", fontWeight: 650, border: "none" }}
          />
          <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", color: "#fff", fontSize: 13, fontWeight: 650 }}>
              {userEmail.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>
              <Typography variant="caption">{userEmail}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem component={Link} href="/settings" onClick={() => setAnchorEl(null)}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem
              onClick={async () => {
                setAnchorEl(null);
                await signOutAction();
              }}
            >
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          },
        }}
      >
        <Toolbar />
        <List sx={{ flexGrow: 1, px: 1.25, pt: 1 }}>
          {NAV.map(item => {
            const active = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={active}
                sx={{
                  borderRadius: 2, my: 0.25, py: 0.9,
                  "& .MuiListItemIcon-root": { color: "text.secondary", minWidth: 38 },
                  "& .MuiListItemText-primary": { fontSize: 13.5, fontWeight: 500 },
                  "&:hover": { bgcolor: "rgba(90,86,224,.05)" },
                  "&.Mui-selected": {
                    bgcolor: "rgba(90,86,224,.10)",
                    "& .MuiListItemIcon-root": { color: "primary.main" },
                    "& .MuiListItemText-primary": { color: "primary.main", fontWeight: 600 },
                  },
                  "&.Mui-selected:hover": { bgcolor: "rgba(90,86,224,.14)" },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
        <Divider />
        <BkkClock />
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, minHeight: "100vh" }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
