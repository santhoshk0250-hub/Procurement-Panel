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
  Edit,
  Delete,
  Add,
  Person,
  AccessTime,
  AttachMoney,
  Language,
} from "@mui/icons-material";

/* ================== Types ================== */
type MongoDate = string | { $date: string };
type IDType = string | { $oid: string };

interface TourManager {
  _id: IDType;
  managerId: string;
  title: string;
  description: string;
  gallery?: Array<{ tag: string; url: string }>;
  language?: string[][]; // Array of language combinations
  general_info?: string;
  price_breakdown?: {
    basePrice: number;
    serviceCharges: number;
    taxes: number;
    totalPrice: number;
    priceNote: string;
  };
  operationProcess?: Array<{
    time: string;
    title: string;
    description: string;
  }>;
  inclusions?: string[];
  exclusions?: string[];
  timings?: {
    from: string;
    to: string;
  };
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
}

/* ================== Helpers ================== */
const unwrapId = (id: IDType) => (typeof id === "string" ? id : id?.$oid ?? "");

const mainImage = (tm: TourManager) =>
  tm.gallery?.[0]?.url ||
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop";

/* ================== Component ================== */
const TourManagersDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selected, setSelected] = useState<TourManager | null>(null);
  const [tourManagers, setTourManagers] = useState<TourManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const open = Boolean(anchorEl);

  const fetchTourManagers = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}tour-managers?page=${pageNum}`
      );

      const fetchedManagers = res.data.data || [];
      const totalPages = res.data.pagination?.pages ?? 1;

      setTourManagers(fetchedManagers);
      setPages(totalPages);
    } catch (e) {
      console.error("Error fetching tour managers:", e);
      setTourManagers([]);
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
    if (!q) return tourManagers;
    return tourManagers.filter((tm) => {
      const hay = [
        tm.title,
        tm.managerId,
        tm.description,
        ...(tm.language || []).flat(), // Flatten language combinations
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tourManagers, search]);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>, tm: TourManager) => {
    setAnchorEl(event.currentTarget);
    setSelected(tm);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelected(null);
  };

  const handleEdit = () => {
    if (selected) {
      window.location.href = `/dashboard/tour-managers/edit/${unwrapId(selected._id)}`;
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE}tour-managers/${unwrapId(selected._id)}`);
      await fetchTourManagers(page);
      setDeleteDialogOpen(false);
      setSelected(null);
    } catch (e) {
      console.error("Error deleting tour manager:", e);
      alert("Failed to delete tour manager");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
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
        <Typography variant="h5" fontWeight="bold">
          Tour Managers
        </Typography>
        <Button
          component={Link}
          href="/dashboard/tour-managers/add"
          variant="contained"
          startIcon={<Add />}
          sx={{
            width: { xs: "100%", sm: "auto" },
            minHeight: "44px",
          }}
        >
          Add Tour Manager
        </Button>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search by title, manager ID, description, or language..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3, "& .MuiInputBase-input": { fontSize: { xs: "16px", sm: "inherit" } } }}
      />

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Grid */}
      {!loading && filtered.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            {search ? "No tour managers found matching your search." : "No tour managers found."}
          </Typography>
        </Box>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2,
              mb: 3,
            }}
          >
            {filtered.map((tm) => (
              <Card
                key={unwrapId(tm._id)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardMedia
                  component="img"
                  height={{ xs: 180, sm: 200, md: 220 }}
                  image={mainImage(tm)}
                  alt={tm.title}
                  sx={{ objectFit: "cover" }}
                />
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                      {tm.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, tm)}
                      sx={{ ml: 1 }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {tm.description || "No description"}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                    {tm.managerId && (
                      <Chip
                        icon={<Person />}
                        label={tm.managerId}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {tm.price_breakdown?.totalPrice && (
                      <Chip
                        icon={<AttachMoney />}
                        label={`₹${tm.price_breakdown.totalPrice}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                    {tm.timings && (
                      <Chip
                        icon={<AccessTime />}
                        label={`${tm.timings.from} - ${tm.timings.to}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {tm.language && tm.language.length > 0 && (
                      <Chip
                        icon={<Language />}
                        label={tm.language[0]?.join(" + ") || "Languages"}
                        size="small"
                        variant="outlined"
                        title={tm.language.map((combo) => combo.join(" + ")).join(", ")}
                      />
                    )}
                  </Stack>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    size="small"
                    component={Link}
                    href={`/dashboard/tour-managers/edit/${unwrapId(tm._id)}`}
                    startIcon={<Edit />}
                    sx={{ minHeight: "44px" }}
                  >
                    Edit
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>

          {/* Pagination */}
          {pages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={pages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Menu */}
      <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Tour Manager</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selected?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TourManagersDashboard;
