"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { useRouter } from "next/navigation";

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
const ContainerCard = styled(Container)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "500px",
  gap: "2rem",
}));

// Card
const Card = styled(Paper)(({ theme }) => ({
  padding: "3rem",
  borderRadius: "12px",
  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
  width: "100%",
  backgroundColor: "#fff",
}));

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

const ForgotPasswordPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE}auth/forgot-password`,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.status === 200) {
        alert("Password reset link sent to your email!");
        router.push("/login");
      } else {
        alert(res.data.error || "Something went wrong!");
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
      <ContainerCard>
        <Card>
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ fontWeight: 600, color: "#1f2937", mb: 2 }}
          >
            Forgot Password
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Enter your registered email address. We will send you a password reset link.
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              variant="outlined"
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: "#f9fafb",
                },
              }}
              required
            />

            <PrimaryButton fullWidth type="submit" variant="contained" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </PrimaryButton>
          </form>
        </Card>
      </ContainerCard>
    </GradientBackground>
  );
};

export default ForgotPasswordPage;
