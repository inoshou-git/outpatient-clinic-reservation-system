import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { useAuth } from './AuthContext';

interface User {
  userId: string;
  name: string;
  department: string;
  role: string;
  email: string;
  isDeleted?: boolean;
}

const UserManagementPage = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.filter((user: User) => !user.isDeleted));
      } else {
        setError('ユーザーの取得に失敗しました。');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('ユーザーの取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setOpenForm(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm(`ユーザー ${userId} を削除してもよろしいですか？`)) {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          fetchUsers();
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'ユーザーの削除に失敗しました。');
        }
      } catch (error) {
        console.error('Failed to delete user', error);
        setError('ユーザーの削除中にエラーが発生しました。');
      }
    }
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!editingUser) return;

    const userData = {
      name: editingUser.name,
      department: editingUser.department,
      email: editingUser.email,
      role: editingUser.role,
    };

    try {
      const response = await fetch(`/api/users/${editingUser.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        fetchUsers();
        setOpenForm(false);
        setEditingUser(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'ユーザー情報の更新に失敗しました。');
      }
    } catch (err) {
      setError('フォームの送信中にエラーが発生しました。');
      console.error('Error submitting form:', err);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">ユーザー管理</Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
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
              {users.filter(user => !user.isDeleted).map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>{user.userId}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEditUser(user)}><Edit /></IconButton>
                    <IconButton onClick={() => handleDeleteUser(user.userId)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openForm} onClose={() => setOpenForm(false)}>
        <DialogTitle>ユーザー編集</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {editingUser && (
            <Box component="form" onSubmit={handleFormSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="edit-userId"
                label="ユーザーID"
                name="userId"
                value={editingUser.userId}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="edit-name"
                label="氏名"
                name="name"
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="edit-department"
                label="所属部署"
                name="department"
                value={editingUser.department}
                onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="edit-email"
                label="メールアドレス"
                name="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="role-label">権限</InputLabel>
                <Select
                  labelId="role-label"
                  id="edit-role"
                  value={editingUser.role}
                  label="権限"
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as string })}
                >
                  <MenuItem value="user">一般ユーザー</MenuItem>
                  <MenuItem value="admin">管理者</MenuItem>
                </Select>
              </FormControl>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                更新
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
