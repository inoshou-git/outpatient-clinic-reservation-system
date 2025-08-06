import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Typography,
  Alert,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';

import { BlockedSlot } from '../types';

interface BlockedSlotFormProps {
  onFormSubmit: () => void;
  blockedSlot?: BlockedSlot | null;
}

const generateTimeSlots = () => {
  const slots = [];
  let time = dayjs().hour(9).minute(0).second(0);
  const endTime = dayjs().hour(17).minute(0).second(0);

  while (time.isBefore(endTime) || time.isSame(endTime)) {
    slots.push(time.format('HH:mm'));
    time = time.add(15, 'minute');
  }
  return slots;
};

const BlockedSlotForm: React.FC<BlockedSlotFormProps> = ({ onFormSubmit, blockedSlot }) => {
  const { token } = useAuth();
  const { showLoader, hideLoader, closeBlockedSlotForm } = useUI();
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (blockedSlot) {
      setStartDate(dayjs(blockedSlot.date));
      setEndDate(blockedSlot.endDate ? dayjs(blockedSlot.endDate) : null);
      setStartTime(blockedSlot.startTime);
      setEndTime(blockedSlot.endTime);
      setReason(blockedSlot.reason);
      setIsAllDay(blockedSlot.startTime === null);
    } else {
      setStartDate(dayjs());
      setEndDate(null);
      setStartTime(null);
      setEndTime(null);
      setReason('');
      setIsAllDay(false);
    }
  }, [blockedSlot]);

  const timeSlots = generateTimeSlots();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!startDate || !reason) {
      setError('開始日と理由を入力してください。');
      return;
    }

    if (isAllDay && endDate && startDate.isAfter(endDate)) {
      setError('開始日は終了日より前である必要があります。');
      return;
    }

    if (!isAllDay && (!startTime || !endTime)) {
      setError('開始時間と終了時間を入力するか、終日予約不可を選択してください。');
      return;
    }

    if (!isAllDay && startTime && endTime && startTime >= endTime) {
      setError('開始時間は終了時間より前である必要があります。');
      return;
    }

    closeBlockedSlotForm(); // フォームを閉じる
    showLoader(); // ローディング開始

    const blockedSlotData = {
      date: startDate.format('YYYY-MM-DD'),
      endDate: isAllDay && endDate ? endDate.format('YYYY-MM-DD') : null,
      startTime: isAllDay ? null : startTime,
      endTime: isAllDay ? null : endTime,
      reason,
      sendNotification,
    };

    const url = blockedSlot
      ? `/api/blocked-slots/${blockedSlot.id}`
      : '/api/blocked-slots';
    const method = blockedSlot ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(blockedSlotData),
      });

      if (response.ok) {
        onFormSubmit();
      } else {
        const errorData = await response.json();
        setError(errorData.message || (blockedSlot ? '更新に失敗しました。' : '登録に失敗しました。'));
      }
    } catch (err) {
      setError('フォームの送信中にエラーが発生しました。');
      console.error('Error submitting form:', err);
    } finally {
      hideLoader(); // ローディング終了
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="h6" sx={{ mb: 2 }}>{blockedSlot ? '予約不可設定の編集' : '予約不可設定の登録'}</Typography>
        <DatePicker
          label="開始日"
          value={startDate}
          onChange={(newValue) => setStartDate(newValue)}
          sx={{ mb: 2, width: '100%' }}
        />
        <FormControlLabel
          control={<Checkbox checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />}
          label="終日予約不可"
          sx={{ mb: 2 }}
        />
        {isAllDay && (
          <DatePicker
            label="終了日"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            minDate={startDate || undefined}
            sx={{ mb: 2, width: '100%' }}
          />
        )}
        {!isAllDay && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>開始時間</InputLabel>
              <Select
                value={startTime || ''}
                label="開始時間"
                onChange={(e: SelectChangeEvent) => setStartTime(e.target.value)}
              >
                {timeSlots.map((slot) => (
                  <MenuItem key={slot} value={slot}>
                    {slot}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>終了時間</InputLabel>
              <Select
                value={endTime || ''}
                label="終了時間"
                onChange={(e: SelectChangeEvent) => setEndTime(e.target.value)}
              >
                {timeSlots.map((slot) => (
                  <MenuItem key={slot} value={slot}>
                    {slot}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        <TextField
          label="理由"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={<Checkbox checked={sendNotification} onChange={(e) => setSendNotification(e.target.checked)} />}
          label="関係者にメールで通知する"
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" fullWidth>
          {blockedSlot ? '更新' : '登録'}
        </Button>
      </Box>
    </LocalizationProvider>
  );
};

export default BlockedSlotForm;
