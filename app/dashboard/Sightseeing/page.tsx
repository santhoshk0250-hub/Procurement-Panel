"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Box, Tabs, Tab } from "@mui/material";
import SightseeingDashboard from "./places/page";
import SightseeingPackagesDashboard from "./packages/page";

const TAB_PLACES = "places" as const;
const TAB_PACKAGES = "packages" as const;

type TabKey = typeof TAB_PLACES | typeof TAB_PACKAGES;

export default function SightseeingTabsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read ?tab from query; default to "places"
  const currentTab = (searchParams.get("tab") || TAB_PLACES) as TabKey;

  // Navigate by replacing only the tab param (keeps page mount stable, avoids scroll jump)
  const navigate = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === TAB_PLACES) {
      params.delete("tab"); // keep URL clean for default
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleChange = (_: React.SyntheticEvent, value: TabKey) => navigate(value);

  return (
    <Box sx={{ p: 2 }}>
      <Tabs
        value={currentTab}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Sightseeing tabs"
        sx={{ mb: 2 }}
      >
        <Tab value={TAB_PLACES} label="Places" />
        <Tab value={TAB_PACKAGES} label="Packages" />
      </Tabs>

      <Box sx={{ mt: 1 }}>
        {currentTab === TAB_PLACES ? (
          <SightseeingDashboard />
        ) : (
          <SightseeingPackagesDashboard />
        )}
      </Box>
    </Box>
  );
}
