
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Checkbox,
} from '@mui/material';
import { Edit, Delete, ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';
import BlockedSlotForm from '../components/BlockedSlotForm';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import dayjs, { Dayjs } from 'dayjs';

import { BlockedSlot } from '../types';

import { getBlockedSlots, deleteBlockedSlot, registerHolidays } from '../services/api';

const BlockedSlotManagementPage = () => {
  const { token, user } = useAuth();
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingBlockedSlot, setEditingBlockedSlot] = useState<BlockedSlot | null>(null);
  const [selectedBlockedSlots, setSelectedBlockedSlots] = useState<number[]>([]);
  const [bulkActionEnabled, setBulkActionEnabled] = useState(false);
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const { isBlockedSlotFormOpen, openBlockedSlotForm, closeBlockedSlotForm } = useUI();

  const canEdit = user?.role !== 'viewer';

  const fetchBlockedSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBlockedSlots(token);
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
    setEditingBlockedSlot(null);
  };

  const handleEditBlockedSlot = (slot: BlockedSlot) => {
    setEditingBlockedSlot(slot);
    openBlockedSlotForm();
  };

  const handleDeleteBlockedSlot = async (id: number) => {
    if (window.confirm('この予約不可設定を削除してもよろしいですか？')) {
      try {
        await deleteBlockedSlot(id, token);
        fetchBlockedSlots();
      } catch (error: any) {
        console.error('Failed to delete blocked slot:', error.message);
        alert(`予約不可設定の削除に失敗しました: ${error.message}`);
      }
    }
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = filteredBlockedSlots.map((n) => n.id);
      setSelectedBlockedSlots(newSelecteds);
      return;
    }
    setSelectedBlockedSlots([]);
  };

  const handleSelectClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selectedBlockedSlots.indexOf(id);
    let newSelected: readonly number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedBlockedSlots, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedBlockedSlots.slice(1));
    } else if (selectedIndex === selectedBlockedSlots.length - 1) {
      newSelected = newSelected.concat(selectedBlockedSlots.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedBlockedSlots.slice(0, selectedIndex),
        selectedBlockedSlots.slice(selectedIndex + 1),
      );
    }
    setSelectedBlockedSlots(newSelected as number[]);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`${selectedBlockedSlots.length}件の予約不可設定を削除してもよろしいですか？`)) {
      try {
        const promises = selectedBlockedSlots.map(id =>
          deleteBlockedSlot(id, token)
        );
        await Promise.all(promises);
        fetchBlockedSlots();
        setSelectedBlockedSlots([]);
        setBulkActionEnabled(false);
      } catch (error: any) {
        console.error('Failed to bulk delete blocked slots', error.message);
        alert('予約不可設定の一括削除中にエラーが発生しました。');
      }
    }
  };

  const handleRegisterHolidays = async () => {
    if (window.confirm('日本の祝日を一括登録します。よろしいですか？')) {
      try {
        const data = await registerHolidays(token);
        alert(data.message);
        fetchBlockedSlots();
      } catch (error: any) {
        console.error('Failed to register holidays', error);
        alert('祝日の一括登録中にエラーが発生しました。');
      }
    }
  };

  const isSelected = (id: number) => selectedBlockedSlots.indexOf(id) !== -1;

  const filteredBlockedSlots = useMemo(() => {
    return blockedSlots.filter(slot => dayjs(slot.date).isSame(currentDate, 'month'));
  }, [blockedSlots, currentDate]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">予約不可設定管理</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))}><ArrowBackIos /></IconButton>
            <Typography variant="h5" sx={{ mx: 2 }}>{currentDate.format('YYYY年 M月')}</Typography>
            <IconButton onClick={() => setCurrentDate(currentDate.add(1, 'month'))}><ArrowForwardIos /></IconButton>
            <Button variant="outlined" onClick={() => setCurrentDate(dayjs())} sx={{ ml: 2 }}>今月</Button>
        </Box>
        <Box>
          {bulkActionEnabled && selectedBlockedSlots.length > 0 && (
            <Button variant="contained" color="secondary" onClick={handleBulkDelete} sx={{ mr: 1 }}>
              選択した項目を削除
            </Button>
          )}
          <Button variant="outlined" onClick={() => setBulkActionEnabled(!bulkActionEnabled)} sx={{ mr: 1 }}>
            {bulkActionEnabled ? 'キャンセル' : '一括操作'}
          </Button>
          <Button variant="contained" onClick={handleRegisterHolidays} disabled={!canEdit} sx={{ mr: 1 }}>
            祝日を一括登録
          </Button>
          <Button variant="contained" onClick={() => { setEditingBlockedSlot(null); openBlockedSlotForm(); }} disabled={!canEdit}>
            新規予約不可設定
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="blocked slots table">
            <TableHead>
              <TableRow>
                {bulkActionEnabled && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedBlockedSlots.length > 0 && selectedBlockedSlots.length < filteredBlockedSlots.length}
                      checked={filteredBlockedSlots.length > 0 && selectedBlockedSlots.length === filteredBlockedSlots.length}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                )}
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
              {filteredBlockedSlots.map((slot) => {
                const isItemSelected = isSelected(slot.id);
                return (
                  <TableRow
                    key={slot.id}
                    hover
                    onClick={(event) => bulkActionEnabled && handleSelectClick(event, slot.id)}
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    selected={isItemSelected}
                  >
                    {bulkActionEnabled && (
                      <TableCell padding="checkbox">
                        <Checkbox checked={isItemSelected} />
                      </TableCell>
                    )}
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
                );
              })}
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
