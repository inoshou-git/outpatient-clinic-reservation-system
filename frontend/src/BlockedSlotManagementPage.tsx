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
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import BlockedSlotForm from './BlockedSlotForm';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';

interface BlockedSlot {
  id: number;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

const BlockedSlotManagementPage = () => {
  const { token, user } = useAuth();
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingBlockedSlot, setEditingBlockedSlot] = useState<BlockedSlot | null>(null);
  const { isBlockedSlotFormOpen, openBlockedSlotForm, closeBlockedSlotForm } = useUI();

  const canEdit = user?.role !== 'viewer';

  const fetchBlockedSlots = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('process.env.REACT_APP_API_BASE_URL/api/blocked-slots', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setBlockedSlots(data);
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBlockedSlots();
  }, [fetchBlockedSlots]);

  const handleFormSubmit = () => {
    fetchBlockedSlots();
    closeBlockedSlotForm();
    setEditingBlockedSlot(null);
  };

  const handleEditBlockedSlot = (slot: BlockedSlot) => {
    setEditingBlockedSlot(slot);
    openBlockedSlotForm();
  };

  const handleDeleteBlockedSlot = async (id: number) => {
    if (window.confirm('この予約不可設定を削除してもよろしいですか？')) {
      try {
        const response = await fetch(`process.env.REACT_APP_API_BASE_URL/api/blocked-slots/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          fetchBlockedSlots();
        } else {
          const errorData = await response.json();
          console.error('Failed to delete blocked slot:', errorData.message);
          alert(`予約不可設定の削除に失敗しました: ${errorData.message}`);
        }
      } catch (error) {
        console.error('Failed to delete blocked slot', error);
        alert('予約不可設定の削除中にエラーが発生しました。');
      }
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">予約不可設定管理</Typography>
        <Button variant="contained" onClick={() => { setEditingBlockedSlot(null); openBlockedSlotForm(); }} disabled={!canEdit}>
          新規予約不可設定
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="blocked slots table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>開始日</TableCell>
                <TableCell>終了日</TableCell>
                <TableCell>開始時間</TableCell>
                <TableCell>終了時間</TableCell>
                <TableCell>理由</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blockedSlots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell>{slot.id}</TableCell>
                  <TableCell>{slot.date}</TableCell>
                  <TableCell>{slot.endDate || '-'}</TableCell>
                  <TableCell>{slot.startTime || '終日'}</TableCell>
                  <TableCell>{slot.endTime || '終日'}</TableCell>
                  <TableCell>{slot.reason}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEditBlockedSlot(slot)} disabled={!canEdit}><Edit /></IconButton>
                    <IconButton onClick={() => handleDeleteBlockedSlot(slot.id)} disabled={!canEdit}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={isBlockedSlotFormOpen} onClose={closeBlockedSlotForm}>
        <DialogTitle>{editingBlockedSlot ? '予約不可設定の編集' : '新規予約不可設定の登録'}</DialogTitle>
        <DialogContent>
          <BlockedSlotForm
            onFormSubmit={handleFormSubmit}
            blockedSlot={editingBlockedSlot}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBlockedSlotForm}>キャンセル</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BlockedSlotManagementPage;
