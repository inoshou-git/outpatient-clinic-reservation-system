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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email) {
      setError("メールアドレスを入力してください。");
      return;
    }

    try {
      const response = await requestPasswordReset(email);
      if (response.success) {
        setMessage("メールアドレス宛にパスワードリセットメールを送付しました。記載されている一時パスワードから再度ログインし新しいパスワードを設定してください。");
        setEmail(""); // Clear email input after successful send
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      console.error("Failed to request password reset:", err);
      setError(err.message || "パスワードリセットのリクエスト中にエラーが発生しました。");
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
        <DialogContentText sx={{ mb: 2 }}>
          ご登録のメールアドレスを入力してください。一時パスワードを送信します。
        </DialogContentText>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!message && ( // Only show form if no success message
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              autoFocus
              margin="dense"
              id="email"
              label="メールアドレス"
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
        )}
        {message && ( // Only show close button if success message
          <DialogActions>
            <Button onClick={handleClose}>閉じる</Button>
          </DialogActions>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
