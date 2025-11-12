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
} from "@mui/material";
import {
  Search,
  MoreVert,
  ContentCopy,
  CheckCircle,
  Schedule,
  Cancel,
  Percent,
  LocalOffer,
  Image as ImageIcon,
  PlaylistAddRounded,
} from "@mui/icons-material";
import { useCouponStore } from "@/store/couponsStore";

/* ================== Types (Unchanged) ================== */
type MongoDate = string | { $date: string };
type IDType = string | { $oid: string };

interface Coupon {
  _id: IDType;
  seq: number;
  name: string;
  coupon_code: string;
  details: string;
  price: string;
  discount_type?: "fixed" | "percentage";
  discount_value?: number;
  timestamp?: MongoDate;
  eligibility: {
    user_type: string;
    first_booking?: boolean;
    min_cart_value?: number;
    max_uses_per_user?: number;
    // ... other optional fields
  };
  validity: {
    start: MongoDate;
    end: MongoDate;
  };
  terms_conditions: string[];
  images: string[];
  is_active?: boolean;
  total_uses?: number;
  max_total_uses?: number | null;
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
}

/* ================== Helpers (Unchanged) ================== */
const unwrapId = (id: IDType) => (typeof id === "string" ? id : id?.$oid ?? "");

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

const currencyBadge = (c: Coupon) => {
  if (c.discount_type === "percentage") return `${c.discount_value ?? ""}% OFF`;
  if (c.discount_type === "fixed" && typeof c.discount_value === "number")
    return `₹${c.discount_value} OFF`;
  return c.price || "Offer";
};

const mainImage = (c: Coupon) =>
  c.images?.[0] ||
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop"; // fallback

/* ================== Component ================== */
const CouponsDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selected, setSelected] = useState<Coupon | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const open = Boolean(anchorEl);
  const { setCoupon } = useCouponStore();

  const fetchCoupons = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}coupons/fetchcoupons?page=${pageNum}`
      );

      const fetchedCoupons = res.data.data || [];
      const totalPages = res.data.pagination?.pages ?? 1;

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
        c.name,
        c.coupon_code,
        c.details,
        c.eligibility?.user_type,
        String(c.seq),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [search, coupons]);

  // Handler for opening the Kebab Menu
  const handleMore = (e: MouseEvent<HTMLElement>, c: Coupon) => {
    setAnchorEl(e.currentTarget);
    setSelected(c);
  };

  const closeMenu = () => setAnchorEl(null);

  /**
   * Handler for the Edit action in the Kebab Menu.
   * This logic is necessary if you were using an external store
   * (like the hotel example), but here, we mainly just need to close the menu.
   * We still use the MenuItem's Link component for navigation.
   * @param c The coupon to be edited.
   */
  const handleEdit = (c: Coupon) => {
    setCoupon(c);
    // Perform any necessary pre-navigation logic here, e.g., setting store state.
    // Since this component doesn't have a coupon store, we just close the menu.
    closeMenu();
    // The actual navigation happens via the <Link> component wrapping the MenuItem.
  };

  const handleDelete = async () => {
    if (!selected) return;
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

  /* ------- Delete dialog ------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const askDelete = () => {
    setConfirmOpen(true);
    closeMenu();
  };

  const now = new Date();

  return (
    <Box sx={{ p: 3, backgroundColor: "white", minHeight: "70vh" }}>
      {/* Top bar (Unchanged) */}
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
          sx={{ width: { xs: "100%", sm: 320 } }}
        />

        <Button
          href="/dashboard/coupons/addcoupons"
          component={Link as any}
          fullWidth
          sx={{ width: { xs: "100%", sm: "auto" } }}
          variant="contained"
          startIcon={<PlaylistAddRounded />}
        >
          Add Coupon
        </Button>
      </Box>

      {/* Loader & No Coupons (Unchanged) */}
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
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {filtered.map((c) => {
              const state = within(now, c.validity?.start, c.validity?.end);
              const isActive = c.is_active ?? (state === "active");

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

              return (
                <Card key={unwrapId(c._id)} sx={{ width: 320 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={mainImage(c)}
                      alt={c.name}
                      sx={{
                        objectFit: "cover",
                        width: "100%",
                        height: 140,
                        borderRadius: 1,
                      }}
                    />
                    <IconButton
                      aria-label="more"
                      onClick={(e) => handleMore(e, c)} // Calls handleMore to open menu and set selected
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(255, 255, 255, 0.7)",
                        "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.9)" },
                      }}
                    >
                      <MoreVert />
                    </IconButton>

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
                        label={currencyBadge(c)}
                        sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}
                      />
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}> {/* Reduced padding bottom */}
                    {/* <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" noWrap title={c.name}>
                        {c.name}
                      </Typography>
                      {statusChip}
                    </Stack> */}

                    <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                      <Tooltip title="Copy code">
                        <IconButton
                          size="small"
                          onClick={() => copyCode(c.coupon_code)}
                          sx={{ mr: -0.5 }}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Typography variant="body2" fontWeight={600}>
                        {c.coupon_code}
                      </Typography>
                      {c.discount_type === "percentage" && (
                        <Percent fontSize="small" color="action" />
                      )}
                    </Stack>

                    <Stack direction="row" gap={1} mt={1}>
                      {typeof c.eligibility?.min_cart_value === "number" && (
                        <Chip size="small" label={`Min ₹${c.eligibility.min_cart_value}`} />
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}> {/* Adjusted vertical spacing */}
                    <Stack direction="row" spacing={1}>
                      {/* View Button */}
                      <Button
                           key="edit"
                            component={Link as any}
                            href={`/dashboard/coupons/editcoupons`}
                            onClick={() => handleEdit(c)}
                      >
                        Edit
                      </Button>
                      <Button color="error" size="small" onClick={() => { setSelected(c); setConfirmOpen(true); }}>
                        Delete
                      </Button>
                    </Stack>
                  </CardActions>
                </Card>
              );
            })}
          </Box>

          {/* Pagination (Unchanged) */}
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
<Menu
  anchorEl={anchorEl}
  open={open}
  onClose={closeMenu}
  anchorOrigin={{ vertical: "top", horizontal: "right" }}
  transformOrigin={{ vertical: "top", horizontal: "right" }}
>
  {selected ? [ // Directly return an array when selected is true
    <MenuItem
      key="edit"
      component={Link as any}
      href={`/dashboard/coupons/editcoupons`}
      onClick={() => handleEdit(selected)}
    >
      Edit
    </MenuItem>,
    <MenuItem key="delete" onClick={askDelete}>
      Delete
    </MenuItem>
  ] : null}
</Menu>

      {/* Delete Confirmation (Unchanged) */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete Coupon</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.name}</strong>? This action cannot be undone.
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