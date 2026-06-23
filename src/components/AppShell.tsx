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

const SIDEBAR_WIDTH = 220;

const NAV = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  { label: "Cards", href: "/cards", icon: <CreditCardIcon /> },
  { label: "Flows", href: "/flows", icon: <BoltIcon /> },
  { label: "Activity", href: "/activity", icon: <ListAltIcon /> },
];

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
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Trinity Flows</Typography>
          <Chip label="● Scheduler running" color="success" size="small" sx={{ mr: 2, bgcolor: "rgba(255,255,255,0.15)", color: "white" }} />
          <IconButton color="inherit" onClick={e => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "rgba(255,255,255,0.2)" }}>
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
          },
        }}
      >
        <Toolbar />
        <List sx={{ flexGrow: 1 }}>
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
                sx={{ "&.Mui-selected": { borderRight: 3, borderColor: "primary.main" } }}
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

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: "background.default", minHeight: "100vh" }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
