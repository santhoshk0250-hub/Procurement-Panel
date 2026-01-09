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
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import logo from "../../public/images/logo/Logo.png";
import { useAuthStore } from "../../store/useAuthStore";

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
const LoginContainer = styled(Container)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  maxWidth: "1200px",
  gap: "8rem",
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    gap: "2rem",
    textAlign: "center",
  },
}));

// Login Card
const LoginCard = styled(Paper)(({ theme }) => ({
  padding: "3rem",
  borderRadius: "12px",
  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
  minWidth: "600px",
  backgroundColor: "#fff",
  flex: 1,
  [theme.breakpoints.down("sm")]: {
    minWidth: "100%",
    padding: "2rem",
  },
}));

// Brand Section
const BrandSection = styled(Box)(({ theme }) => ({
  color: "white",
  textAlign: "center",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem",
  [theme.breakpoints.down("md")]: {
    order: -1, // show brand on top in mobile
  },
}));

// Logo Wrapper
const LogoWrapper = styled(Box)(({ theme }) => ({
  width: "150px",
  height: "150px",
  position: "relative",
  marginBottom: "1rem",
  [theme.breakpoints.down("sm")]: {
    width: "110px",
    height: "110px",
  },
}));

// Buttons
const PrimaryButton = styled(Button)(({ theme }) => ({
  borderRadius: "8px",
  padding: "12px",
  textTransform: "none",
  fontSize: "16px",
  fontWeight: 600,
  backgroundColor: "#4f46e5",
  "&:hover": {
    backgroundColor: "#4338ca",
  },
}));

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE}auth/login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.status === 200) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("admindata", JSON.stringify(res.data.user));
        const { token, user } = res.data;
        const { setAuth } = useAuthStore.getState();
        setAuth(user, token);
        router.push("/dashboard/hotel");
      } else {
        alert(res.data.error || "Login failed");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <LoginContainer>
        {/* Left side - Brand */}
        <BrandSection>
          <LogoWrapper>
            <Image
              src={logo}
              alt="Tick Your Tour Logo"
              fill
              style={{ objectFit: "contain" }}
            />
          </LogoWrapper>
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            Tick Your Tour
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
            Seamless Travel Management, <br />
            All in One Place.
          </Typography>
        </BrandSection>

        {/* Right side - Login Form */}
        <LoginCard>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{ fontWeight: 600, color: "#1f2937" }}
            >
              Login In
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter your email and password to login!
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500, color: "#374151" }}
              >
                Email *
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@gmail.com"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: "#f9fafb",
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500, color: "#374151" }}
              >
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

            <PrimaryButton
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Login"
              )}
            </PrimaryButton>
          </form>
        </LoginCard>
      </LoginContainer>
    </GradientBackground>
  );
};

export default LoginPage;
