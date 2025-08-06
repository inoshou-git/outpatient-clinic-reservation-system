import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../contexts/UIContext';
import { Container, Box, TextField, Button, Typography, Alert } from '@mui/material';

import { setPassword } from '../services/api';

const ForcePasswordChangePage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();
  const { showLoader, hideLoader } = useUI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }
    if (newPassword.length < 8) {
      setError('パスワードは8文字以上で設定してください。');
      return;
    }

    showLoader(); // ローディング開始

    try {
      await setPassword(newPassword, token);
      setSuccess('パスワードが正常に更新されました。ホームページにリダイレクトします。');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'パスワードの更新に失敗しました。');
    } finally {
      hideLoader(); // ローディング終了
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          新しいパスワードの設定
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
          セキュリティのため、初回ログイン時にパスワードを変更してください。
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="newPassword"
            label="新しいパスワード"
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="新しいパスワード（確認）"
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={!!success}
          >
            パスワードを設定
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default ForcePasswordChangePage;
