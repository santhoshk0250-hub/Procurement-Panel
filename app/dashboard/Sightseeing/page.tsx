"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Box, Tabs, Tab, Paper, useTheme, useMediaQuery } from "@mui/material";
import { Place, CardGiftcard } from "@mui/icons-material";
import SightseeingDashboard from "./places/page";
import SightseeingPackagesDashboard from "./packages/page";

const TAB_PLACES = "places" as const;
const TAB_PACKAGES = "packages" as const;

type TabKey = typeof TAB_PLACES | typeof TAB_PACKAGES;

export default function SightseeingTabsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const currentTab = (searchParams.get("tab") || TAB_PLACES) as TabKey;

  const navigate = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === TAB_PLACES) {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleChange = (_: React.SyntheticEvent, value: TabKey) => navigate(value);

  return (
    <Box sx={{ width: "100%", bgcolor: "background.default" }}>
      {/* Tab Navigation - Sticky on scroll */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          <Tabs
            value={currentTab}
            onChange={handleChange}
            variant={isMobile ? "fullWidth" : "standard"}
            aria-label="Sightseeing tabs"
            sx={{
              minHeight: { xs: 56, sm: 64 },
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
              "& .MuiTab-root": {
                minHeight: { xs: 56, sm: 64 },
                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                fontWeight: 600,
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  color: "primary.main",
                  bgcolor: "action.hover",
                },
                "&.Mui-selected": {
                  color: "primary.main",
                },
              },
            }}
          >
            <Tab
              value={TAB_PLACES}
              icon={<Place sx={{ fontSize: { xs: 20, sm: 22 } }} />}
              iconPosition="start"
              label="Places"
              sx={{
                gap: { xs: 0.75, sm: 1 },
              }}
            />
            <Tab
              value={TAB_PACKAGES}
              icon={<CardGiftcard sx={{ fontSize: { xs: 20, sm: 22 } }} />}
              iconPosition="start"
              label="Packages"
              sx={{
                gap: { xs: 0.75, sm: 1 },
              }}
            />
          </Tabs>
        </Box>
      </Paper>

      {/* Tab Content */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5, md: 3 },
          minHeight: "calc(100vh - 200px)",
        }}
      >
        {currentTab === TAB_PLACES ? (
          <SightseeingDashboard />
        ) : (
          <SightseeingPackagesDashboard />
        )}
      </Box>
    </Box>
  );
}