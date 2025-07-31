import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Alert,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useAuth } from './AuthContext';

dayjs.extend(isBetween);

// --- Interfaces ---
interface Appointment {
  id: number;
  patientName: string;
  date: string;
  time: string;
  consultation: string;
}

interface BlockedSlot {
  id: number;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

interface ReservationFormProps {
  onFormSubmit: () => void;
  blockedSlots: BlockedSlot[];
  appointment?: Appointment | null;
  initialDate?: Dayjs | null;
  initialTime?: string | null;
}

// --- Time Slot Generation ---
const generateTimeSlots = () => {
  const slots = [];
  let time = dayjs().hour(9).minute(30).second(0);
  const endTime = dayjs().hour(16).minute(30).second(0);
  const lunchStart = dayjs().hour(12).minute(0).second(0);
  const lunchEnd = dayjs().hour(13).minute(0).second(0);

  while (time.isBefore(endTime) || time.isSame(endTime)) {
    if (time.isBefore(lunchStart) || time.isAfter(lunchEnd) || time.isSame(lunchEnd)) {
        slots.push(time.format('HH:mm'));
    }
    time = time.add(15, 'minute');
  }
  return slots;
};

// --- Component ---
const ReservationForm: React.FC<ReservationFormProps> = ({ onFormSubmit, blockedSlots, appointment, initialDate, initialTime }) => {
  const { token } = useAuth();
  const [patientName, setPatientName] = useState('');
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [time, setTime] = useState('');
  const [consultation, setConsultation] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointment) {
      setPatientName(appointment.patientName);
      setDate(dayjs(appointment.date));
      setTime(appointment.time);
      setConsultation(appointment.consultation);
    } else {
      setPatientName('');
      setDate(initialDate || dayjs());
      setTime(initialTime || '');
      setConsultation('');
    }
  }, [appointment, initialDate, initialTime]);

  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

  // --- Event Handlers ---
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!patientName || !date || !time || !consultation) {
      setError('全ての項目を入力してください。');
      return;
    }

    const appointmentData = {
      patientName,
      date: date.format('YYYY-MM-DD'),
      time,
      consultation,
      sendNotification,
    };

    const url = appointment
      ? `/api/appointments/${appointment.id}`
      : '/api/appointments';
    const method = appointment ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(appointmentData),
      });

      if (response.ok) {
        onFormSubmit();
      } else {
        const errorData = await response.json();
        setError(errorData.message || (appointment ? '予約の更新に失敗しました。' : '予約の作成に失敗しました。'));
      }
    } catch (err) {
      setError('フォームの送信中にエラーが発生しました。');
      console.error('Error submitting form:', err);
    }
  };

  // --- Disabling Logic ---
  const shouldDisableDate = (day: Dayjs) => {
    const isWeekend = day.day() === 0 || day.day() === 6;
    const isBlockedAllDay = blockedSlots.some(slot => {
      const blockedStartDate = dayjs(slot.date);
      const blockedEndDate = slot.endDate ? dayjs(slot.endDate) : blockedStartDate;
      return slot.startTime === null && day.isBetween(blockedStartDate.startOf('day'), blockedEndDate.endOf('day'), null, '[]');
    });
    return isWeekend || isBlockedAllDay;
  };

  const availableTimeSlots = useMemo(() => {
    if (!date) return [];
    const dayBlockedSlots = blockedSlots.filter(slot => dayjs(slot.date).isSame(date, 'day') && slot.startTime !== null);
    
    return allTimeSlots.filter(slotTime => {
      const currentSlotTime = dayjs(`${date.format('YYYY-MM-DD')}T${slotTime}`);
      return !dayBlockedSlots.some(blocked => {
        const start = dayjs(`${blocked.date}T${blocked.startTime}`);
        const end = dayjs(`${blocked.date}T${blocked.endTime}`);
        return currentSlotTime.isBetween(start, end, null, '[)');
      });
    });
  }, [date, blockedSlots, allTimeSlots]);

  // --- Render ---
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          label="患者名"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
        <DatePicker
          label="日付"
          value={date}
          onChange={(newValue) => setDate(newValue)}
          shouldDisableDate={shouldDisableDate}
          sx={{ mb: 2, width: '100%' }}
        />
        <FormControl fullWidth required sx={{ mb: 2 }}>
          <InputLabel>時間</InputLabel>
          <Select
            value={time}
            label="時間"
            onChange={(e: SelectChangeEvent) => setTime(e.target.value)}
            disabled={!date}
          >
            {availableTimeSlots.map((slot) => (
              <MenuItem key={slot} value={slot}>
                {slot}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="診察内容"
          value={consultation}
          onChange={(e) => setConsultation(e.target.value)}
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
          {appointment ? '予約を更新する' : '予約を登録する'}
        </Button>
      </Box>
    </LocalizationProvider>
  );
};

export default ReservationForm;
