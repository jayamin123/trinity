"use client";
import { Tabs, Tab } from "@mui/material";
import { useRouter } from "next/navigation";

export default function FlowTabs({ id, activeTab }: { id: string; activeTab: string }) {
  const router = useRouter();
  return (
    <Tabs
      value={activeTab}
      onChange={(_, v) => router.push(`/flows/${id}?tab=${v}`)}
      sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
    >
      <Tab value="plan" label="Schedule" />
      <Tab value="activity" label="Activity" />
    </Tabs>
  );
}
