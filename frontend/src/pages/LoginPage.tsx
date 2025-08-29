import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
} from "@mui/material";

import { loginUser } from "../services/api";
import ForgotPasswordDialog from "../components/ForgotPasswordDialog";

const LoginPage = () => {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [openForgotPasswordDialog, setOpenForgotPasswordDialog] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { user, token, mustChangePassword } = await loginUser(
        userid,
        password
      );
      auth.login(user, token);
      if (mustChangePassword) {
        navigate("/force-password-change");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      // Directly display the error message from the backend
      setError(err.message || "ログインに失敗しました。");
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography component="h1" variant="h5">
          ログイン
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="userid"
            label="ユーザーID"
            name="userid"
            autoComplete="username"
            autoFocus
            value={userid}
            onChange={(e) => setUserid(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="パスワード"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            ログイン
          </Button>
          <Link
            component="button"
            variant="body2"
            onClick={() => setOpenForgotPasswordDialog(true)}
            sx={{ mt: 1, mb: 2 }}
          >
            パスワードを忘れた方へ
          </Link>
        </Box>
      </Box>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        open={openForgotPasswordDialog}
        onClose={() => setOpenForgotPasswordDialog(false)}
      />
    </Container>
  );
};

export default LoginPage;