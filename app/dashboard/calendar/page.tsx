"use client";

import React, { useState, useEffect, MouseEvent } from "react";
import axios from "axios";
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
  Stack
} from "@mui/material";
import { PlaylistAddRounded, Search, MoreVert, Flight } from "@mui/icons-material";
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
  star_category: number;
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
}

const CalendarDetails: React.FC = () => {
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

  const handleDelete = () => {
    handleCloseMenu();
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

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3 }, 
      backgroundColor: "white", 
      minHeight: "70vh",
      maxWidth: { xs: "100%", sm: "100%", md: "1400px" },
      mx: "auto",
      width: "100%"
    }}>
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
              height: { xs: "40px", sm: "40px" }
            }
          }}
        />

        <Link href="/dashboard/calendar/Addhotel" style={{ width: "100%", display: "block" }}>
          <Button
            fullWidth={true}
            sx={{ 
              width: { xs: "100%", sm: "auto" },
              minHeight: { xs: "44px", sm: "40px" },
              fontSize: { xs: "14px", sm: "16px" },
              px: { xs: 2, sm: 3 },
              py: { xs: 1.25, sm: 1 }
            }}
            variant="contained"
            startIcon={<PlaylistAddRounded sx={{ fontSize: { xs: 18, sm: 20 } }} />}
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
            py: { xs: 4, sm: 6 }
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
              px: 2
            }}
          >
            <Flight sx={{ mr: 1, verticalAlign: "middle", fontSize: { xs: 18, sm: 24 } }} />
            Finding the best hotels for your journey...
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ 
            display: "grid",
            gridTemplateColumns: { 
              xs: "1fr", 
              sm: "repeat(2, 1fr)", 
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)"
            },
            gap: { xs: 2, sm: 2.5, md: 3 },
            width: "100%"
          }}>
            {filteredHotels.map((hotel) => {
              const mainImage =
                hotel.media_gallery?.room?.[0] ||
                hotel.rooms[0]?.image_link?.[0]||
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
                      boxShadow: { xs: "0 2px 8px rgba(0,0,0,0.1)", sm: 4 }
                    }
                  }}
                >
                  <Box sx={{ 
                    width: "100%", 
                    height: { xs: 180, sm: 200, md: 220 },
                    overflow: "hidden",
                    flexShrink: 0,
                    backgroundColor: "#f5f5f5"
                  }}>
                    <CardMedia
                      component="img"
                      image={mainImage}
                      alt={hotel.property_name}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block"
                      }}
                    />
                  </Box>

                  <CardContent sx={{ 
                    p: { xs: 2, sm: 2.5 },
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "white",
                    minHeight: 0,
                    overflow: "visible"
                  }}>
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
                        overflow: "hidden"
                      }}
                    >
                      {hotel.property_name}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: { xs: "12px", sm: "14px" },
                        mb: 0.5
                      }}
                    >
                      {hotel?.chain_brand} • {hotel?.star_category}⭐
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: { xs: "12px", sm: "14px" },
                        mb: 1
                      }}
                    >
                      {hotel?.location?.city}, {hotel?.location?.country}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: { xs: "12px", sm: "14px" },
                        mb: 1.5
                      }}
                    >
                      Rooms: {hotel?.rooms?.length} | Bed:{" "}
                      {hotel?.rooms[0]?.bed_type || "-"} | Price:{" "}
                      {hotel.rooms[0]?.pricing?.currency}{" "}
                      {hotel.rooms[0]?.pricing?.hotel_bf_price || 0}
                    </Typography>
                    <CardActions sx={{ 
                      justifyContent: "space-between", 
                      px: 0, 
                      pb: 0, 
                      pt: 0,
                      mt: "auto"
                    }}>
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
                            minHeight: { xs: "40px", sm: "36px" }
                          }}
                        >
                          Edit
                        </Button>
                        <Button 
                          color="error" 
                          size="small" 
                          onClick={handleDelete}
                          sx={{
                            flex: 1,
                            fontSize: { xs: "13px", sm: "14px" },
                            py: { xs: 1, sm: 0.75 },
                            minHeight: { xs: "40px", sm: "36px" }
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
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center", 
            mt: { xs: 3, sm: 4 },
            mb: { xs: 2, sm: 0 }
          }}>
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
                  height: { xs: "32px", sm: "40px" }
                }
              }}
            />
          </Box>
        </>
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Delete Hotel</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{selectedHotel?.property_name}</strong>? This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
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

export default CalendarDetails;
