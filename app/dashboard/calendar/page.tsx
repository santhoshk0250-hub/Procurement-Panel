"use client";

import React, { useState, useEffect, MouseEvent, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Pagination,
  CardActions,
  Stack,
  Checkbox,
  Chip,
  Divider,
  Stepper,
  Step,
  StepLabel,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AddCircleOutline } from "@mui/icons-material";
import {
  PlaylistAddRounded,
  Search,
  MoreVert,
  Flight,
} from "@mui/icons-material";
import Link from "next/link";
import { useHotelStore } from "@/store/hotelStore";

// Interfaces
interface HotelRoom {
  room_id: string;
  room_type: string;
  image_link: string[];
  occupancy_min: number;
  occupancy_max: number;
  bed_type: string;
  pricing: {
    currency: string;
    hotel_bf_price: number;
    hotel_lunch_price: number;
    hotel_dinner_price: number;
  };
}

interface HotelData {
  _id: string;
  property_name: string;
  chain_brand: string;
  star_category: number; // keep as-is (no change)
  location: {
    city: string;
    country: string;
    address: string;
  };
  rooms: HotelRoom[];
  media_gallery: {
    room: string[];
    lobby: string[];
  };
  // ✅ added (safe optional) to support markup UI without changing cards
  markup_min_price?: number;
  markup_max_price?: number;
}

// ✅ for modal filtering (supports hostel if API returns it sometimes)
type StarFilter = "all" | "hostel" | "2" | "3" | "4";

const CalendarDetails: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelData | null>(null);
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const { setHotel } = useHotelStore();
  const open = Boolean(anchorEl);
  const router = useRouter();

  // ✅ MARKUP MODAL STATES (added)
  const [openMarkupModal, setOpenMarkupModal] = useState(false);
  const [markupStep, setMarkupStep] = useState<0 | 1>(0);
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>([]);
  const [markupMinPrice, setMarkupMinPrice] = useState<number | "">("");
  const [markupMaxPrice, setMarkupMaxPrice] = useState<number | "">("");
  const [savingMarkup, setSavingMarkup] = useState(false);

  // modal filter + data
  const [starFilter, setStarFilter] = useState<StarFilter>("all");
  const [modalHotelsRaw, setModalHotelsRaw] = useState<HotelData[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFetchedOnce, setModalFetchedOnce] = useState(false);

  const fetchHotels = async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}hotels/fetchhotel?page=${pageNum}`
      );
      setHotels(response.data.data);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error("Error fetching hotels:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ fetch all hotels for modal (added)
  const fetchAllHotelsForModal = async () => {
    setModalLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}hotels/fetchallhotel`
      );
      setModalHotelsRaw(response.data.data || []);
      setModalFetchedOnce(true);
    } catch (error) {
      console.error("Error fetching hotels for modal:", error);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels(page);
  }, [page]);

  const handleMoreClick = (event: MouseEvent<HTMLElement>, hotel: HotelData) => {
    setAnchorEl(event.currentTarget);
    setSelectedHotel(hotel);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleEdit = (hotel: HotelData) => {
    setHotel(hotel);
    handleCloseMenu();
  };

  const handleDelete = (hotel: HotelData) => {
    setSelectedHotel(hotel);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedHotel) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE}hotels/deletehotel/${selectedHotel._id}`
      );
      setHotels((prev) => prev.filter((h) => h._id !== selectedHotel._id));
      setOpenDeleteDialog(false);
      setSelectedHotel(null);
    } catch (error) {
      console.error("❌ Delete error:", error);
      alert("Failed to delete hotel");
    }
  };

  const filteredHotels = hotels.filter((hotel) =>
    hotel.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // =========================
  // ✅ MARKUP MODAL HELPERS (added)
  // =========================

  const normalizedStar = (
    v: any
  ): "hostel" | "2" | "3" | "4" | "other" => {
    if (v == null) return "other";
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "hostel") return "hostel";
      if (s.startsWith("2")) return "2";
      if (s.startsWith("3")) return "3";
      if (s.startsWith("4")) return "4";
      return "other";
    }
    const n = Number(v);
    if (n === 2) return "2";
    if (n === 3) return "3";
    if (n === 4) return "4";
    return "other";
  };

  const toggleHotelSelection = (id: string) => {
    setSelectedHotelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openMarkup = async () => {
    setMarkupStep(0);
    setSelectedHotelIds([]);
    setMarkupMinPrice("");
    setMarkupMaxPrice("");
    setStarFilter("all");
    setSearchTerm("");
    setOpenMarkupModal(true);

    if (!modalFetchedOnce) {
      await fetchAllHotelsForModal();
    }
  };

  const closeMarkup = () => setOpenMarkupModal(false);

  const modalHotels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const bySearch = !term
      ? modalHotelsRaw
      : modalHotelsRaw.filter((h) =>
          (h.property_name || "").toLowerCase().includes(term)
        );

    const byStar =
      starFilter === "all"
        ? bySearch
        : bySearch.filter((h) => normalizedStar((h as any).star_category) === starFilter);

    const order: Record<string, number> = {
      hostel: 0,
      "2": 1,
      "3": 2,
      "4": 3,
      other: 4,
    };

    return [...byStar].sort(
      (a, b) =>
        order[normalizedStar((a as any).star_category)] -
        order[normalizedStar((b as any).star_category)]
    );
  }, [modalHotelsRaw, searchTerm, starFilter]);

  const handleSubmitMarkup = async () => {
    if (!selectedHotelIds.length) return;

    const min = markupMinPrice === "" ? undefined : Number(markupMinPrice);
    const max = markupMaxPrice === "" ? undefined : Number(markupMaxPrice);

    if (min !== undefined && max !== undefined && max < min) {
      alert("Markup Max Price must be >= Markup Min Price");
      return;
    }

    setSavingMarkup(true);
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_BASE}hotels/bulk-markup`, {
        hotelIds: selectedHotelIds,
        markup_min_price: min,
        markup_max_price: max,
      });

      // update local lists
      setHotels((prev) =>
        prev.map((h) =>
          selectedHotelIds.includes(h._id)
            ? {
                ...h,
                ...(min !== undefined ? { markup_min_price: min } : {}),
                ...(max !== undefined ? { markup_max_price: max } : {}),
              }
            : h
        )
      );

      setModalHotelsRaw((prev) =>
        prev.map((h) =>
          selectedHotelIds.includes(h._id)
            ? {
                ...h,
                ...(min !== undefined ? { markup_min_price: min } : {}),
                ...(max !== undefined ? { markup_max_price: max } : {}),
              }
            : h
        )
      );

      setOpenMarkupModal(false);
    await router.replace("/dashboard/calendar");

    } catch (err) {
      console.error("❌ bulk markup update error:", err);
      alert("Failed to update markup");
    } finally {
      setSavingMarkup(false);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: "white",
        minHeight: "70vh",
        maxWidth: { xs: "100%", sm: "100%", md: "1400px" },
        mx: "auto",
        width: "100%",
      }}
    >
      {/* Top bar */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: { xs: 1.5, sm: 2 },
          mb: { xs: 2, sm: 3 },
        }}
      >
        <TextField
          size="small"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: { xs: 20, sm: 24 } }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: "100%", sm: "300px" },
            "& .MuiOutlinedInput-root": {
              fontSize: { xs: "14px", sm: "16px" },
              height: { xs: "40px", sm: "40px" },
            },
          }}
        />

        {/* ✅ MARKUP BUTTON (added) */}
        <Button
          onClick={openMarkup}
          fullWidth
          variant="outlined"
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          Markup
        </Button>

        <Button
          href="/dashboard/services?type=hotels"
          component={Link as any}
          fullWidth
          variant="outlined"
          startIcon={<AddCircleOutline />}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          Add Services
        </Button>

        <Link
          href="/dashboard/calendar/Addhotel"
          style={{ width: "100%", display: "block" }}
        >
          <Button
            fullWidth={true}
            sx={{
              width: { xs: "100%", sm: "auto" },
              minHeight: { xs: "44px", sm: "40px" },
              fontSize: { xs: "14px", sm: "16px" },
              px: { xs: 2, sm: 3 },
              py: { xs: 1.25, sm: 1 },
            }}
            variant="contained"
            startIcon={
              <PlaylistAddRounded sx={{ fontSize: { xs: 18, sm: 20 } }} />
            }
          >
            Add Hotel
          </Button>
        </Link>
      </Box>

      {/* Loader */}
      {loading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: { xs: "40vh", sm: "50vh" },
            gap: 2,
            py: { xs: 4, sm: 6 },
          }}
        >
          <CircularProgress size={40} sx={{ display: { xs: "block", sm: "none" } }} />
          <CircularProgress size={50} sx={{ display: { xs: "none", sm: "block" } }} />
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontSize: { xs: "14px", sm: "16px" },
              textAlign: "center",
              px: 2,
            }}
          >
            <Flight sx={{ mr: 1, verticalAlign: "middle", fontSize: { xs: 18, sm: 24 } }} />
            Finding the best hotels for your journey...
          </Typography>
        </Box>
      ) : (
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
              gap: { xs: 2, sm: 2.5, md: 3 },
              width: "100%",
            }}
          >
            {filteredHotels.map((hotel) => {
              const mainImage =
                hotel.media_gallery?.room?.[0] ||
                hotel.rooms[0]?.image_link?.[0] ||
                "https://picsum.photos/200";

              return (
                <Card
                  key={hotel._id}
                  sx={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: { xs: 2, sm: 2 },
                    boxShadow: { xs: "0 2px 8px rgba(0,0,0,0.1)", sm: 2 },
                    overflow: "hidden",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: { xs: "none", sm: "translateY(-2px)" },
                      boxShadow: { xs: "0 2px 8px rgba(0,0,0,0.1)", sm: 4 },
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: { xs: 180, sm: 200, md: 220 },
                      overflow: "hidden",
                      flexShrink: 0,
                      backgroundColor: "#f5f5f5",
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={mainImage}
                      alt={hotel.property_name}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </Box>

                  <CardContent
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      backgroundColor: "white",
                      minHeight: 0,
                      overflow: "visible",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: { xs: "16px", sm: "18px" },
                        fontWeight: 600,
                        mb: 0.5,
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {hotel.property_name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        mb: 0.5,
                      }}
                    >
                      {hotel?.chain_brand} • {hotel?.star_category}⭐
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        mb: 1,
                      }}
                    >
                      {hotel?.location?.city}, {hotel?.location?.country}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        mb: 1.5,
                      }}
                    >
                      Rooms: {hotel?.rooms?.length} | Bed:{" "}
                      {hotel?.rooms[0]?.bed_type || "-"} | Price:{" "}
                      {hotel.rooms[0]?.pricing?.currency}{" "}
                      {hotel.rooms[0]?.pricing?.hotel_bf_price || 0}
                    </Typography>

                    <CardActions
                      sx={{
                        justifyContent: "space-between",
                        px: 0,
                        pb: 0,
                        pt: 0,
                        mt: "auto",
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                        <Button
                          key="edit"
                          component={Link as any}
                          href={`/dashboard/calendar/Edithotel`}
                          onClick={() => handleEdit(hotel)}
                          size="small"
                          sx={{
                            flex: 1,
                            fontSize: { xs: "13px", sm: "14px" },
                            py: { xs: 1, sm: 0.75 },
                            minHeight: { xs: "40px", sm: "36px" },
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          color="error"
                          size="small"
                          onClick={() => handleDelete(hotel)}
                          sx={{
                            flex: 1,
                            fontSize: { xs: "13px", sm: "14px" },
                            py: { xs: 1, sm: 0.75 },
                            minHeight: { xs: "40px", sm: "36px" },
                          }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </CardActions>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {/* Pagination */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: { xs: 3, sm: 4 },
              mb: { xs: 2, sm: 0 },
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              size="small"
              sx={{
                "& .MuiPaginationItem-root": {
                  fontSize: { xs: "13px", sm: "14px" },
                  minWidth: { xs: "32px", sm: "40px" },
                  height: { xs: "32px", sm: "40px" },
                },
              }}
            />
          </Box>
        </>
      )}

      {/* Delete Confirmation */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Hotel</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{selectedHotel?.property_name}</strong>? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ MARKUP MODAL (added) */}
      <Dialog
        open={openMarkupModal}
        onClose={closeMarkup}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Select Hotels
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose by category and continue.
              </Typography>
            </Box>

            <Chip
              label={`Selected: ${selectedHotelIds.length}`}
              variant="outlined"
              sx={{ fontWeight: 800 }}
            />
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Stepper activeStep={markupStep} sx={{ mb: 2 }}>
            <Step>
              <StepLabel>Select</StepLabel>
            </Step>
            <Step>
              <StepLabel>Markup</StepLabel>
            </Step>
          </Stepper>

          {markupStep === 0 ? (
            <>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  mb: 1.5,
                  overflowX: "auto",
                  pb: 0.5,
                  "&::-webkit-scrollbar": { height: 6 },
                }}
              >
                <ToggleButtonGroup
                  value={starFilter}
                  exclusive
                  onChange={(e, v) => v && setStarFilter(v)}
                  sx={{
                    width: "100%",
                    display: "flex",
                    gap: 1,
                    "& .MuiToggleButton-root": {
                      flex: 1,
                      minWidth: 110,
                      height: 36,
                      borderRadius: 1.5,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      borderColor: "divider",
                    },
                  }}
                >
                  <Tooltip title="Show all hotels">
                    <ToggleButton value="all">All</ToggleButton>
                  </Tooltip>
                  <ToggleButton value="hostel">Hostel</ToggleButton>
                  <ToggleButton value="2">2 Star</ToggleButton>
                  <ToggleButton value="3">3 Star</ToggleButton>
                  <ToggleButton value="4">4 Star</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <TextField
                size="small"
                placeholder="Search hotels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: "100%",
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    height: 40,
                  },
                }}
              />

              <Divider sx={{ mb: 2 }} />

              {modalLoading ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 6,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    gap: 1.25,
                    maxHeight: isMobile ? "63vh" : "52vh",
                    overflow: "auto",
                    pr: 0.5,
                  }}
                >
                  {modalHotels.map((hotel) => {
                    const mainImage =
                      hotel.media_gallery?.room?.[0] ||
                      hotel.rooms?.[0]?.image_link?.[0] ||
                      "https://picsum.photos/300/200";

                    const checked = selectedHotelIds.includes(hotel._id);

                    return (
                      <Card
                        key={hotel._id}
                        onClick={() => toggleHotelSelection(hotel._id)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          p: 1,
                          borderRadius: 2,
                          cursor: "pointer",
                          border: checked ? "2px solid" : "1px solid",
                          borderColor: checked ? "primary.main" : "divider",
                          boxShadow: "none",
                          transition: "0.15s",
                          "&:hover": { borderColor: "primary.main" },
                        }}
                      >
                        <Box
                          sx={{
                            width: 72,
                            height: 56,
                            borderRadius: 2,
                            overflow: "hidden",
                            flexShrink: 0,
                            bgcolor: "grey.100",
                          }}
                        >
                          <CardMedia
                            component="img"
                            image={mainImage}
                            alt={hotel.property_name}
                            loading="lazy"
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                            onError={(e: any) => {
                              e.currentTarget.src = "https://picsum.photos/300/200";
                            }}
                          />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontWeight: 900,
                              fontSize: 14,
                              lineHeight: 1.2,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {hotel.property_name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontSize: 12,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {hotel.location?.city} • {hotel.location?.country}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {String((hotel as any).star_category)}{" "}
                            {normalizedStar((hotel as any).star_category) === "hostel"
                              ? ""
                              : "⭐"}
                          </Typography>
                        </Box>

                        <Checkbox
                          checked={checked}
                          onChange={() => toggleHotelSelection(hotel._id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Card>
                    );
                  })}

                  {!modalHotels.length && !modalLoading && (
                    <Box sx={{ gridColumn: "1 / -1", py: 4, textAlign: "center" }}>
                      <Typography color="text.secondary">No hotels found.</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                Add markup for selected hotels
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will update markup prices for <b>{selectedHotelIds.length}</b>{" "}
                hotels.
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Markup Min Price"
                  type="number"
                  value={markupMinPrice}
                  onChange={(e) =>
                    setMarkupMinPrice(e.target.value ? Number(e.target.value) : "")
                  }
                  inputProps={{ min: 0 }}
                  fullWidth
                />
                <TextField
                  label="Markup Max Price"
                  type="number"
                  value={markupMaxPrice}
                  onChange={(e) =>
                    setMarkupMaxPrice(e.target.value ? Number(e.target.value) : "")
                  }
                  inputProps={{ min: 0 }}
                  fullWidth
                />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 2,
            py: 1.5,
            gap: 1,
            justifyContent: "space-between",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button
            onClick={closeMarkup}
            color="inherit"
            variant="outlined"
            sx={{ borderRadius: 1.5, height: 36, fontWeight: 800 }}
          >
            Cancel
          </Button>

          {markupStep === 0 ? (
            <Button
              variant="contained"
              disabled={!selectedHotelIds.length || modalLoading}
              onClick={() => setMarkupStep(1)}
              sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}
            >
              Continue
            </Button>
          ) : (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setMarkupStep(0)}
                sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmitMarkup}
                disabled={savingMarkup}
                sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}
              >
                {savingMarkup ? "Saving..." : "Submit"}
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarDetails;
