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
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: "300px" } }}
        />

        <Link href="/dashboard/calendar/Addhotel">
          <Button
            fullWidth={true}
            sx={{ width: { xs: "100%", sm: "auto" } }}
            variant="contained"
            startIcon={<PlaylistAddRounded />}
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
            height: "50vh",
            gap: 2,
          }}
        >
          <CircularProgress size={50} />
          <Typography variant="h6" color="text.secondary">
            <Flight sx={{ mr: 1, verticalAlign: "middle" }} />
            Finding the best hotels for your journey...
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {filteredHotels.map((hotel) => {
              const mainImage =
                hotel.media_gallery?.room?.[0] ||
                hotel.rooms[0]?.image_link?.[0]||
                "https://picsum.photos/200";

              return (
                <Card key={hotel._id} sx={{ width: 300 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      height="140"
                      image={mainImage}
                      alt={hotel.property_name}
                      sx={{
                        objectFit: "cover",
                        width: "100%",
                        height: 140,
                        borderRadius: 1,
                      }}
                    />
                    <IconButton
                      aria-label="more"
                      onClick={(e) => handleMoreClick(e, hotel)}
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(255, 255, 255, 0.7)",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                        },
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <CardContent>
                    <Typography variant="h6">{hotel.property_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {hotel?.chain_brand} • {hotel?.star_category}⭐
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {hotel?.location?.city}, {hotel?.location?.country}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Rooms: {hotel?.rooms?.length} | Bed:{" "}
                      {hotel?.rooms[0]?.bed_type || "-"} | Price:{" "}
                      {hotel.rooms[0]?.pricing?.currency}{" "}
                      {hotel.rooms[0]?.pricing?.hotel_bf_price}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {/* Pagination */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </>
      )}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {selectedHotel && (
          <Link href="/dashboard/calendar/Edithotel" passHref legacyBehavior>
            <MenuItem onClick={() => handleEdit(selectedHotel)}>Edit</MenuItem>
          </Link>
        )}
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>

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
