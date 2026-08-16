"use client";
/** Shared primitives used by all four flow modals. Three layout components
 *  + one identity formatter — kept deliberately small (per the audit). */
import { Box, Stack, Typography, Tooltip, IconButton, CircularProgress } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import React, { useEffect, useState } from "react";
import type { CardAmount } from "@/lib/csv";

type Tone = "success" | "error" | "warning" | "info" | "default";

const TONE_BORDER: Record<Tone, string> = {
  success: "success.main",
  error: "error.main",
  warning: "warning.main",
  info: "info.main",
  default: "grey.500",
};

/** Card-style summary header with a colored left border. The first block of
 *  every modal — gives the headline state at a glance. */
export function SummaryCard({
  tone, children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        p: 2.5,
        bgcolor: "#fafafa",
        borderRadius: 2,
        borderLeft: 4,
        borderLeftColor: TONE_BORDER[tone],
      }}
    >
      {children}
    </Box>
  );
}

/** 4-column info bar at the top of every redesigned modal. Each column is
 *  one fact at a glance: icon + label + main value + subtitle. */
export type InfoBarItem = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
};

export function InfoBar({ items }: { items: InfoBarItem[] }) {
  return (
    <Box sx={{
      bgcolor: "#fafafa", borderRadius: 2, p: 2,
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: `repeat(${items.length}, 1fr)` },
      gap: 2,
    }}>
      {items.map((item, i) => (
        <Stack key={i} direction="row" spacing={1.25} alignItems="flex-start">
          <Box sx={{
            mt: 0.25, color: "text.secondary",
            display: "flex", alignItems: "center", justifyContent: "center",
            "& .MuiSvgIcon-root": { fontSize: 22 },
          }}>
            {item.icon}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", textTransform: "none", lineHeight: 1.2 }}>
              {item.label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3, mt: 0.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.value}
            </Typography>
            {item.subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
      ))}
    </Box>
  );
}

/** Bordered card section — used as the body of each editable / read-only
 *  section in the redesigned modals. Title with an optional icon. */
export function SectionCard({
  title, icon, action, children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {icon && (
            <Box sx={{
              color: "text.secondary",
              display: "flex", alignItems: "center",
              "& .MuiSvgIcon-root": { fontSize: 20 },
            }}>
              {icon}
            </Box>
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
        </Stack>
        {action}
      </Stack>
      <Box>{children}</Box>
    </Box>
  );
}

/** Section block: overline label + optional right-aligned action + body. */
export function Section({
  title, action, children, dense,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: dense ? 0.5 : 1 }}>
        <Typography variant="overline" color="text.secondary">{title}</Typography>
        {action}
      </Stack>
      <Box>{children}</Box>
    </Box>
  );
}

/** Fixed-width label + value pair. Optionally mono-spaced + copyable. */
export function Row({
  label, value, mono, copyable, width = 140,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: boolean;
  width?: number;
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 0.4 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ flexGrow: 1, fontFamily: mono ? "monospace" : undefined, fontSize: 14 }}>
        {value}
      </Box>
      {copyable && typeof value === "string" && (
        <Tooltip title="Copy">
          <IconButton size="small" onClick={() => navigator.clipboard.writeText(value)}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

/** Standard card identity rendering — used in every modal that shows a card.
 *  `inline` = "•••• 1096 · Sarah Mitchell · exp 01/31" on one line.
 *  `block`  = two-line version with name large + exp below. */
export function CardIdentity({
  last4, name, expMonth, expYear, variant = "inline",
}: {
  last4: string;
  name: string;
  expMonth: string;
  expYear: string;
  variant?: "inline" | "block";
}) {
  const exp = `${expMonth.padStart(2, "0")}/${expYear}`;
  if (variant === "block") {
    return (
      <Box sx={{ textAlign: "right" }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          •••• {last4} · {name}
        </Typography>
        <Typography variant="caption" color="text.secondary">exp {exp}</Typography>
      </Box>
    );
  }
  return (
    <Typography variant="body2">
      <b>•••• {last4}</b> · {name}{" "}
      <span style={{ color: "#888" }}>· exp {exp}</span>
    </Typography>
  );
}

/** Visual credit-card representation. Shows cardholder name, PAN, exp and CVV.
 *  The full PAN + CVV are revealed automatically once on mount via the
 *  `onReveal` handler (server action that decrypts) — nothing is clickable.
 *  Top-left shows the card's balance type; top-right its initial + current
 *  balance. */
export function CardVisual({
  last4, name, expMonth, expYear, amount, initialBal, currentBal, onReveal,
}: {
  last4: string;
  name: string;
  expMonth: string;
  expYear: string;
  amount: CardAmount;
  initialBal: string;
  currentBal: string;
  onReveal?: () => Promise<{ pan: string; cvv: string }>;
}) {
  const exp = `${expMonth.padStart(2, "0")}/${expYear}`;
  const [secrets, setSecrets] = useState<{ pan: string; cvv: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Auto-reveal once on mount — decryption stays server-side in `onReveal`.
  useEffect(() => {
    if (!onReveal) return;
    let active = true;
    setLoading(true);
    setErr(null);
    onReveal()
      .then(result => { if (active) setSecrets(result); })
      .catch(e => { if (active) setErr(e instanceof Error ? e.message : "Failed to reveal"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formattedPan = secrets
    ? secrets.pan.replace(/(\d{4})(?=\d)/g, "$1 ")
    : `•••• •••• •••• ${last4}`;
  const cvvDisplay = secrets ? secrets.cvv : "•••";
  const panCopyValue = secrets ? secrets.pan : last4;
  const balanceType = amount === "unlim" ? "UNLIMITED" : "HAS A BALANCE";

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #2c3e50 0%, #1a252e 100%)",
        color: "white",
        borderRadius: 2.5,
        p: 2.5,
        width: "100%",
        maxWidth: 380,
        aspectRatio: "1.586/1",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: 3,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="caption" sx={{ opacity: 0.6, letterSpacing: 1 }}>
            {balanceType}
          </Typography>
          {loading && <CircularProgress size={10} sx={{ color: "white" }} />}
        </Stack>
        <Stack direction="row" spacing={2} sx={{ textAlign: "right" }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.55, letterSpacing: 1, display: "block" }}>
              INITIAL BAL
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: "monospace", display: "block" }}>
              {initialBal}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.55, letterSpacing: 1, display: "block" }}>
              CURRENT BAL
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: "monospace", display: "block" }}>
              {currentBal}
            </Typography>
          </Box>
        </Stack>
      </Stack>

      <Box>
        <Typography variant="caption" sx={{ opacity: 0.55, letterSpacing: 1, display: "block" }}>
          NUMBER
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography sx={{ fontFamily: "monospace", fontSize: "1.25rem", letterSpacing: 2 }}>
            {formattedPan}
          </Typography>
          <Tooltip title={secrets ? "Copy full PAN" : `Copy last 4 (${last4})`}>
            <IconButton
              size="small" sx={{ color: "rgba(255,255,255,0.6)" }}
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(panCopyValue); }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="caption" sx={{ opacity: 0.55, letterSpacing: 1 }}>NAME</Typography>
            <Tooltip title="Copy name">
              <IconButton
                size="small" sx={{ color: "rgba(255,255,255,0.6)", p: 0 }}
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(name); }}
              >
                <ContentCopyIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Typography sx={{ textTransform: "uppercase", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </Typography>
        </Box>
        <Box>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="caption" sx={{ opacity: 0.55, letterSpacing: 1 }}>EXP</Typography>
            <Tooltip title="Copy exp">
              <IconButton
                size="small" sx={{ color: "rgba(255,255,255,0.6)", p: 0 }}
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(exp); }}
              >
                <ContentCopyIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Typography sx={{ fontFamily: "monospace" }}>{exp}</Typography>
        </Box>
        <Box>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="caption" sx={{ opacity: 0.55, letterSpacing: 1 }}>CVV</Typography>
            {secrets && (
              <Tooltip title="Copy CVV">
                <IconButton
                  size="small" sx={{ color: "rgba(255,255,255,0.6)", p: 0 }}
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(secrets.cvv); }}
                >
                  <ContentCopyIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Typography sx={{ fontFamily: "monospace" }}>{cvvDisplay}</Typography>
        </Box>
      </Stack>

      {err && (
        <Typography variant="caption" sx={{ color: "error.light", display: "block", textAlign: "center", mt: 1 }}>
          {err}
        </Typography>
      )}
    </Box>
  );
}
