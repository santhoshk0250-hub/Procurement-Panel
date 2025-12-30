"use client";

import React, { useEffect, useMemo, useState, MouseEvent } from "react";
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
  IconButton,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Pagination,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Search,
  MoreVert,
  ContentCopy,
  CheckCircle,
  Schedule,
  Cancel,
  LocalOffer,
  Image as ImageIcon,
  PlaylistAddRounded,
  Percent,
} from "@mui/icons-material";
import { useCouponStore, type Coupon, type IDType, type MongoDate } from "@/store/couponsStore";

/* ================== Helpers ================== */
const unwrapId = (id?: IDType) => (typeof id === "string" ? id : id?.$oid ?? "");

const toDate = (d?: MongoDate): Date | null => {
  const iso = typeof d === "string" ? d : (d as { $date: string })?.$date ?? null;
  return iso ? new Date(iso) : null;
};

const within = (now: Date, start?: MongoDate, end?: MongoDate) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return "unknown";
  if (now < s) return "scheduled";
  if (now > e) return "expired";
  return "active";
};

const mainImage = (c: Coupon) =>
  c.thumbnail ||
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop";

const discountBadge = (c: Coupon) => {
  const d = c.discount;
  if (!d) return "Offer";
  if (d.type === "percentage") return `${d.value}% OFF`;
  const cur = d.currency || "₹";
  return `${cur}${d.value} OFF`;
};

const formatValidity = (c: Coupon) => {
  const s = toDate(c.date_rules?.valid_from);
  const e = toDate(c.date_rules?.valid_to);
  if (!s || !e) return null;
  return `${s.toLocaleDateString()} → ${e.toLocaleDateString()}`;
};

const toText = (html: string, max = 140) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const s = doc.body.textContent || "";
    return s.length > max ? s.slice(0, max).trim() + "…" : s.trim();
  } catch {
    const s = html?.replace(/<[^>]+>/g, "") || "";
    return s.length > 140 ? s.slice(0, 140).trim() + "…" : s.trim();
  }
};

/* ================== Component ================== */
const CouponsDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [search, setSearch] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selected, setSelected] = useState<Coupon | null>(null);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);


  const { setCoupon } = useCouponStore();

  const fetchCoupons = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}coupons/fetchcoupons?page=${pageNum}`
      );

      const fetchedCoupons: Coupon[] = res.data?.data || [];
      const totalPages: number = res.data?.pagination?.pages ?? 1;

      setCoupons(fetchedCoupons);
      setPages(totalPages);
    } catch (e) {
      console.error("Error fetching coupons:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return coupons;

    return coupons.filter((c) => {
      const hay = [
        c.title,
        c.coupon_code,
        c.description,
        String(c.seq),
        ...(c.eligibility?.user_type || []),
        c.coupon_type,
        c.discount?.type,
        c.discount?.currency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [search, coupons]);



  const closeMenu = () => setAnchorEl(null);

  const handleEdit = (c: Coupon) => {
    setCoupon(c);
    closeMenu();
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const askDelete = () => {
    setConfirmOpen(true);
    closeMenu();
  };

  const handleDelete = async () => {
    if (!selected?._id) return;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE}coupons/delete/${unwrapId(selected._id)}`
      );

      setCoupons((prev) => prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id)));
      setSelected(null);
      closeMenu();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete coupon");
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {}
  };

  const now = new Date();

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, backgroundColor: "white", minHeight: "70vh" }}>
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
          placeholder="Search coupons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: 360 } }}
        />

        <Button
          href="/dashboard/coupons/addcoupons"
          component={Link as any}
          fullWidth={isMobile}
          variant="contained"
          startIcon={<PlaylistAddRounded />}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          Add Coupon
        </Button>
      </Box>

      {/* Loader & Empty */}
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
            Loading coupons…
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
          <ImageIcon fontSize="large" color="disabled" />
          <Typography variant="h6">No coupons found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or create a new coupon.
          </Typography>
        </Box>
      ) : (
        <>
          {/* Responsive layout using Box (no Grid) */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "stretch",
              justifyContent: { xs: "center", sm: "flex-start" },
            }}
          >
            {filtered.map((c) => {
              const state = within(now, c.date_rules?.valid_from, c.date_rules?.valid_to);
              const isActive = c.status?.is_active ?? (state === "active");

              const statusChip =
                state === "active" ? (
                  <Chip
                    size="small"
                    color={isActive ? "success" : "default"}
                    icon={isActive ? <CheckCircle /> : <Schedule />}
                    label={isActive ? "Active" : "Paused"}
                  />
                ) : state === "scheduled" ? (
                  <Chip size="small" color="info" icon={<Schedule />} label="Scheduled" />
                ) : state === "expired" ? (
                  <Chip size="small" color="error" icon={<Cancel />} label="Expired" />
                ) : (
                  <Chip size="small" label="Unknown" />
                );

              const validityText = formatValidity(c);

              return (
                <Card
                  key={unwrapId(c._id)}
                  sx={{
                    width: {
                      xs: "100%", // mobile: full width
                      sm: "calc(50% - 8px)", // 2 columns
                      md: "calc(33.333% - 10.7px)", // 3 columns
                      lg: "calc(25% - 12px)", // 4 columns
                    },
                    maxWidth: { xs: 520, sm: "none" }, // keep nice centered width on phones
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={mainImage(c)}
                      alt={c.title}
                      sx={{
                        objectFit: "cover",
                        width: "100%",
                        height: isMobile ? 160 : 140,
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
                      }}
                    >
                      <Chip
                        size="small"
                        color="primary"
                        icon={<LocalOffer />}
                        label={discountBadge(c)}
                        sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}
                      />
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1, flexGrow: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap title={c.title}>
                        {c.title}
                      </Typography>
                      {statusChip}
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                      <Tooltip title="Copy code">
                        <IconButton size="small" onClick={() => copyCode(c.coupon_code)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Typography variant="body2" fontWeight={700}>
                        {c.coupon_code}
                      </Typography>

                      {c.discount?.type === "percentage" && <Percent fontSize="small" color="action" />}
                    </Stack>

                    {c.description ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {toText(c.description)}
                      </Typography>
                    ) : null}

                    <Stack direction="row" gap={1} mt={1} flexWrap="wrap">
                      {typeof c.eligibility?.min_cart_value === "number" && (
                        <Chip size="small" label={`Min ₹${c.eligibility.min_cart_value}`} />
                      )}
                      {typeof c.eligibility?.max_uses_per_user === "number" && (
                        <Chip size="small" label={`Max/user ${c.eligibility.max_uses_per_user}`} />
                      )}
                      {validityText && <Chip size="small" label={validityText} />}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        component={Link as any}
                        href="/dashboard/coupons/editcoupons"
                        onClick={() => handleEdit(c)}
                      >
                        Edit
                      </Button>

                      <Button
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelected(c);
                          setConfirmOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </CardActions>
                </Card>
              );
            })}
          </Box>

          {/* Pagination */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination count={pages} page={page} onChange={(e, value) => setPage(value)} color="primary" />
          </Box>
        </>
      )}

      {/* Delete Confirmation */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete Coupon</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.title}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await handleDelete();
              setConfirmOpen(false);
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CouponsDashboard;
