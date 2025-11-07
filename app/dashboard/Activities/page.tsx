"use client";

import React from "react";
import Link from "next/link";
import { Box, Button } from "@mui/material";

const ActivitiesDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3, minHeight: "70vh", backgroundColor: "white", display: "grid", placeItems: "center" }}>
      <Button
        href="/dashboard/services?type=activities"
        component={Link as any}
        variant="contained"
        size="large"
      >
        Add Services
      </Button>
    </Box>
  );
};

export default ActivitiesDashboard;
