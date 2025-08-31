import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  DialogContentText,
  CircularProgress,
} from "@mui/material";
import { requestPasswordReset } from "../services/api";

interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({
  open,
  onClose,
}) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true); // Start loading

    if (!email) {
      setError("メールアドレスを入力してください。");
      setLoading(false); // Stop loading if validation fails
      return;
    }

    try {
      const response = await requestPasswordReset(email);
      if (response.success) {
        setMessage("パスワードリセットメールを送信しました。");
        setEmail(""); // Clear email input after successful send
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      console.error("Failed to request password reset:", err);
      setError(err.message || "パスワードリセットのリクエスト中にエラーが発生しました。");
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleClose = () => {
    setEmail("");
    setMessage(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>パスワードをリセット</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {message ? (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>
                <DialogActions>
                  <Button onClick={handleClose}>閉じる</Button>
                </DialogActions>
              </>
            ) : (
              <>
                <DialogContentText sx={{ mb: 2 }}>
                  ご登録のメールアドレスを入力してください。一時パスワードを送信します。
                </DialogContentText>
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                  <TextField
                    autoFocus
                    margin="dense"
                    id="email"
                    label="メールアドレス"
                    name="email"
                    type="email"
                    fullWidth
                    variant="standard"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <DialogActions>
                    <Button onClick={handleClose}>キャンセル</Button>
                    <Button type="submit">送信</Button>
                  </DialogActions>
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
