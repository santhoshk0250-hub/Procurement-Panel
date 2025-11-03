"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  Container,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import axios from "axios";

// Gradient background
const GradientBackground = styled(Box)({
  minHeight: "100vh",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
});

// Container
const RegisterContainer = styled(Container)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "600px",
}));

// Card
const RegisterCard = styled(Paper)(({ theme }) => ({
  padding: "3rem",
  borderRadius: "12px",
  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
  width: "100%",
  backgroundColor: "#fff",
  [theme.breakpoints.down("sm")]: {
    padding: "2rem",
  },
}));

// Button
const PrimaryButton = styled(Button)({
  borderRadius: "8px",
  padding: "12px",
  textTransform: "none",
  fontSize: "16px",
  fontWeight: 600,
  backgroundColor: "#4f46e5",
  "&:hover": {
    backgroundColor: "#4338ca",
  },
});

const RegisterPage: React.FC = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE}auth/register`,
        { firstName, lastName, email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.status === 201) {
        alert("Admin registered successfully!");
        router.push("/login"); // go back to login
      } else {
        alert(res.data.error || "Registration failed");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Server error");
    }
  };

  return (
    <GradientBackground>
      <RegisterContainer>
        <RegisterCard>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{ fontWeight: 600, color: "#1f2937" }}
            >
              Admin Register
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create a new admin account
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            {/* First Name */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                First Name *
              </Typography>
              <TextField
                fullWidth
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#f9fafb",
                  },
                }}
              />
            </Box>

            {/* Last Name */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Last Name *
              </Typography>
              <TextField
                fullWidth
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#f9fafb",
                  },
                }}
              />
            </Box>

            {/* Email */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Email *
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#f9fafb",
                  },
                }}
              />
            </Box>

            {/* Password */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Password *
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#f9fafb",
                  },
                }}
              />
            </Box>

            <PrimaryButton fullWidth type="submit" variant="contained">
              Register
            </PrimaryButton>
          </form>
        </RegisterCard>
      </RegisterContainer>
    </GradientBackground>
  );
};

export default RegisterPage;
