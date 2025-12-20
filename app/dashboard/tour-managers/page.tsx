"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";

import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Pagination,
  Stack,
  IconButton,
} from "@mui/material";

import {
  Search,
  ContentCopy,
  People,
  AccessTime,
  CurrencyRupee,
  Map,
  AddCircleOutline,
  WorkspacePremium,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import { useTourManagerStore,type TourManager, } from "@/store/tourmanagerStore";

/* ================== Types ================== */

type MongoId = string | { $oid: string };
/* ================== Helpers ================== */

const unwrapId = (id?: MongoId): string =>
  typeof id === "string" ? id : id?.$oid ?? "";

const mainImage = (tm: TourManager) =>
  tm.gallery?.[0]?.imageUrl ||
  "https://images.unsplash.com/photo-1455587734955-081b22074882?q=80&w=1200&auto=format&fit=crop";

const money = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n) ? `₹${n}` : "-";

const stripHtml = (html?: string) =>
  (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const roleLabel = (tm: TourManager) => {
  const slug = (tm.slug  || "").toLowerCase();
  if (slug.includes("guide")) return "Tour Guide";
  if (slug.includes("manager")) return "Tour Manager";
  return "Tour Service";
};

const languagesToText = (lang?: string[][]) => {
  if (!Array.isArray(lang) || !lang.length) return "";
  return lang
    .map((pair) => (pair || []).filter(Boolean).join(" - "))
    .filter(Boolean)
    .join(", ");
};

/* ================== Component ================== */

const TourManagersDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TourManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const { setFromAPI } = useTourManagerStore();

  const [selected, setSelected] = useState<TourManager | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchTourManagers = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}tour-manager/fetch?page=${pageNum}`
      );
      const data: TourManager[] = res.data.data || res.data.items || [];
      const totalPages = res.data.pagination?.pages ?? res.data.totalPages ?? 1;

      setItems(Array.isArray(data) ? data : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching tour managers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTourManagers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;

    return items.filter((tm) => {
      const id = unwrapId(tm._id);
      const langs = languagesToText(tm.language);
      const hay = [
        id,
        tm.managerId,
        tm.title,
        tm.slug,
        stripHtml(tm.description),
        stripHtml(tm.general_info),
        langs,
        (tm.inclusions || []).join(" "),
        (tm.exclusions || []).join(" "),
        (tm.gallery || []).map((g) => g.tag).join(" "),
        (tm.tourManagerProfiles || []).map((p) => p.name).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [search, items]);

  const copyToClipboard = async (val?: string) => {
    try {
      if (val) await navigator.clipboard.writeText(val);
    } catch {}
  };

  

    const handleEdit = (apiItem: TourManager) => {
      // Store full object so edit page has addonsFull
      setFromAPI(apiItem);
    };

  return (
    <Box sx={{ p: 3, backgroundColor: "white", minHeight: "70vh" }}>
      {/* Top bar */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <TextField
          size="small"
          placeholder="Search tour managers, guides, languages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: 420 } }}
        />

        <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}>
          <Button
            href="/dashboard/services?type=tour-manager"
            component={Link as any}
            fullWidth
            variant="outlined"
            startIcon={<AddCircleOutline />}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Add Service
          </Button>
        </Box>
      </Box>

      {/* Loader / Empty states */}
      {loading ? (
        <Box
          sx={{
            minHeight: "50vh",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            gap: 2,
          }}
        >
          <CircularProgress size={50} />
          <Typography variant="body1" color="text.secondary">
            Loading tour managers / guides…
          </Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box
          sx={{
            minHeight: "40vh",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            gap: 1,
          }}
        >
          <Typography variant="h6">No tour managers found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new tour manager / guide.
          </Typography>
        </Box>
      ) : (
        <>
          {/* Cards grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(auto-fill, minmax(340px, 1fr))",
                md: "repeat(auto-fill, minmax(360px, 1fr))",
              },
              gap: { xs: 2, sm: 2.5, md: 3 },
            }}
          >
            {filtered.map((tm) => {
              const id = unwrapId(tm._id);
              const price = money(tm.price_breakdown?.totalPrice);
              const langs = languagesToText(tm.language);
              const timeRange =
                tm.timings?.from && tm.timings?.to
                  ? `${tm.timings.from} – ${tm.timings.to}`
                  : "";
              const role = roleLabel(tm);

              return (
                <Card
                  key={id || tm.managerId || tm.title}
                  sx={{ width: "100%", maxWidth: 450, mx: "auto" }}
                >
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={mainImage(tm)}
                      alt={tm.title || "Tour manager"}
                      sx={{
                        objectFit: "cover",
                        width: "100%",
                        height: { xs: 200, sm: 180, md: 170 },
                        borderRadius: 1,
                      }}
                    />

                    <Box
                      sx={{
                        position: "absolute",
                        left: 8,
                        top: 8,
                        display: "flex",
                        gap: 0.5,
                        flexWrap: "wrap",
                        maxWidth: "calc(100% - 16px)",
                      }}
                    >
                      {tm.managerId && (
                        <Chip
                          size="small"
                          color="primary"
                          icon={<People />}
                          label={tm.managerId}
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                          }}
                        />
                      )}
                      <Chip
                        size="small"
                        label={role}
                        icon={<WorkspacePremium />}
                        sx={{ bgcolor: "background.paper", opacity: 0.9 }}
                      />
                      {price !== "-" && (
                        <Chip
                          size="small"
                          icon={<CurrencyRupee />}
                          label={price}
                          sx={{
                            bgcolor: "success.light",
                            color: "success.contrastText",
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1, px: { xs: 1.5, sm: 2 } }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: { xs: "1rem", sm: "1.15rem" },
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                        title={tm.title}
                      >
                        {tm.title}
                      </Typography>

                      {tm.rating && (
                        <Chip
                          size="small"
                          color="success"
                          icon={<WorkspacePremium />}
                          label={Number(tm.rating).toFixed(1)}
                        />
                      )}
                    </Stack>

                    {/* Short description (HTML) */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      mt={1}
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                      title={stripHtml(tm.description)}
                      dangerouslySetInnerHTML={{
                        __html: tm.description ?? "",
                      }}
                    />

                    <Stack spacing={1.2} mt={1.5}>
                      {/* Languages */}
                      {langs && (
                        <Chip
                          size="medium"
                          icon={<People fontSize="small" />}
                          label={langs}
                          color="secondary"
                          sx={{
                            alignSelf: "flex-start",
                            fontWeight: 600,
                            px: { xs: 1.2, sm: 1.8 },
                            borderRadius: 999,
                            boxShadow: 1,
                            fontSize: {
                              xs: "0.75rem",
                              sm: "0.8125rem",
                            },
                          }}
                        />
                      )}

                      {/* Additional chips row */}
                      <Stack
                        direction="row"
                        spacing={0.75}
                        flexWrap="wrap"
                        sx={{ gap: 0.75 }}
                      >
                        {timeRange && (
                          <Chip
                            size="small"
                            icon={<AccessTime fontSize="small" />}
                            label={timeRange}
                          />
                        )}

                        {!!tm.inclusions?.length && (
                          <Tooltip
                            title={`Inclusions: ${tm.inclusions.join(", ")}`}
                          >
                            <Chip size="small" color="success" label="Includes" />
                          </Tooltip>
                        )}

                        {!!tm.exclusions?.length && (
                          <Tooltip
                            title={`Exclusions: ${tm.exclusions.join(", ")}`}
                          >
                            <Chip size="small" color="warning" label="Excludes" />
                          </Tooltip>
                        )}

                        {!!tm.tourManagerProfiles?.length && (
                          <Chip
                            size="small"
                            icon={<People fontSize="small" />}
                            label={`${tm.tourManagerProfiles.length} profile${
                              tm.tourManagerProfiles.length > 1 ? "s" : ""
                            }`}
                          />
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>

                  <CardActions
                    sx={{
                      justifyContent: "space-between",
                      px: { xs: 1.5, sm: 2 },
                      pb: { xs: 1.5, sm: 2 },
                      pt: 0.5,
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: { xs: "stretch", sm: "center" },
                      gap: { xs: 1, sm: 0 },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ width: { xs: "100%", sm: "auto" } }}
                    >
                      <Button
                        key="edit"
                        component={Link as any}
                        href={`/dashboard/tour-managers/edit`}
                        size="small"
                        onClick={() => handleEdit(tm)}
                        sx={{ flex: { xs: 1, sm: "initial" } }}
                      >
                        Edit
                      </Button>
                    </Stack>
                  </CardActions>
                </Card>
              );
            })}
          </Box>

          {/* Pagination */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination
              count={pages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default TourManagersDashboard;
