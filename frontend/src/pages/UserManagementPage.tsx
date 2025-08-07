import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";

import { User } from "../types";

import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../services/api";

const UserManagementPage = () => {
  const { token } = useAuth();
  const { showLoader, hideLoader } = useUI();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    showLoader(); // ローディング開始
    try {
      const data = await getAllUsers(token);
      setUsers(data.filter((user: User) => !user.isDeleted));
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("ユーザーの取得に失敗しました。");
    } finally {
      setLoading(false);
      hideLoader(); // ローディング終了
    }
  }, [token, hideLoader, showLoader]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenForm = (user: Partial<User> | null, isNew: boolean) => {
    setCurrentUser(
      user || {
        userId: "",
        name: "",
        department: "",
        email: "",
        role: "general",
      }
    );
    setIsNewUser(isNew);
    setOpenForm(true);
    setError(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm(`ユーザー ${userId} を削除してもよろしいですか？`)) {
      showLoader(); // ローディング開始
      try {
        await deleteUser(userId, token);
        fetchUsers();
      } catch (error: any) {
        console.error("Failed to delete user", error);
        setError(error.message || "ユーザーの削除に失敗しました。");
      } finally {
        hideLoader(); // ローディング終了
      }
    }
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!currentUser) return;

    setOpenForm(false); // フォームを閉じる
    showLoader(); // ローディング開始

    try {
      if (isNewUser) {
        await createUser(currentUser as User, token);
      } else {
        await updateUser(currentUser.userId!, currentUser, token);
      }
      fetchUsers();
      setOpenForm(false);
      setCurrentUser(null);
    } catch (err: any) {
      setError(err.message || "操作に失敗しました。");
      console.error("Error submitting form:", err);
    } finally {
      hideLoader(); // ローディング終了
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">ユーザー管理</Typography>
        <Button variant="contained" onClick={() => handleOpenForm(null, true)}>
          新規ユーザー作成
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="users table">
            <TableHead>
              <TableRow>
                <TableCell>ユーザーID</TableCell>
                <TableCell>氏名</TableCell>
                <TableCell>所属部署</TableCell>
                <TableCell>メールアドレス</TableCell>
                <TableCell>権限</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>{user.userId}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenForm(user, false)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteUser(user.userId)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openForm} onClose={() => setOpenForm(false)}>
        <DialogTitle>
          {isNewUser ? "新規ユーザー作成" : "ユーザー編集"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {currentUser && (
            <Box
              component="form"
              onSubmit={handleFormSubmit}
              noValidate
              sx={{ mt: 1 }}
            >
              <TextField
                margin="normal"
                required
                fullWidth
                id="userId"
                label="ユーザーID"
                name="userId"
                value={currentUser.userId}
                onChange={(e) =>
                  setCurrentUser({ ...currentUser, userId: e.target.value })
                }
                disabled={!isNewUser}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="氏名"
                name="name"
                value={currentUser.name}
                onChange={(e) =>
                  setCurrentUser({ ...currentUser, name: e.target.value })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="department"
                label="所属部署"
                name="department"
                value={currentUser.department}
                onChange={(e) =>
                  setCurrentUser({ ...currentUser, department: e.target.value })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="メールアドレス"
                name="email"
                type="email"
                value={currentUser.email}
                onChange={(e) =>
                  setCurrentUser({ ...currentUser, email: e.target.value })
                }
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="role-label">権限</InputLabel>
                <Select
                  labelId="role-label"
                  id="role"
                  value={currentUser.role}
                  label="権限"
                  onChange={(e) =>
                    setCurrentUser({
                      ...currentUser,
                      role: e.target.value as User["role"],
                    })
                  }
                >
                  <MenuItem value="user">一般</MenuItem>
                  <MenuItem value="viewer">閲覧</MenuItem>
                  <MenuItem value="admin">管理者</MenuItem>
                </Select>
              </FormControl>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                {isNewUser ? "作成" : "更新"}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>キャンセル</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagementPage;
