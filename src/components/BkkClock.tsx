"use client";
import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { nowBkk } from "@/lib/bkk";
dayjs.extend(utc);

/** Renders the current BKK time, ticking every 30s. SSR-safe. */
export default function BkkClock() {
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () => {
      setNow(dayjs.utc(nowBkk()).format("ddd, MMM D, h:mm A") + " BKK");
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Box sx={{ p: 2, textAlign: "left" }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, lineHeight: 1.3 }}>
        Time now
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>
        {now || " "}
      </Typography>
    </Box>
  );
}
