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
import { useUI } from './UIContext';

dayjs.extend(isBetween);

// --- Interfaces ---
interface Appointment {
  id: number;
  patientId?: string; // Make optional
  patientName?: string; // Make optional
  date: string;
  time?: string; // Make optional
  consultation?: string;
  lastUpdatedBy?: string;
  isDeleted?: boolean;
  reservationType?: 'outpatient' | 'visit' | 'rehab';
  facilityName?: string;
  startTimeRange?: string;
  endTimeRange?: string;
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
const generateTimeSlots = (startHour: number = 9, startMinute: number = 30, endHour: number = 16, endMinute: number = 30) => {
  const slots = [];
  let time = dayjs().hour(startHour).minute(startMinute).second(0);
  const endTime = dayjs().hour(endHour).minute(endMinute).second(0);
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
  const { showLoader, hideLoader, closeReservationForm } = useUI();
  const [reservationType, setReservationType] = useState<'outpatient' | 'visit' | 'rehab'>(appointment?.reservationType || 'outpatient');
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [time, setTime] = useState('');
  const [startTimeRange, setStartTimeRange] = useState('');
  const [endTimeRange, setEndTimeRange] = useState('');
  const [consultation, setConsultation] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointment) {
      setReservationType(appointment.reservationType || 'outpatient');
      setPatientId(appointment.patientId || '');
      setPatientName(appointment.patientName || '');
      setFacilityName(appointment.facilityName || '');
      setDate(dayjs(appointment.date));
      setTime(appointment.time || '');
      setStartTimeRange(appointment.startTimeRange || '');
      setEndTimeRange(appointment.endTimeRange || '');
      setConsultation(appointment.consultation || '');
    } else {
      setReservationType('outpatient');
      setPatientId('');
      setPatientName('');
      setFacilityName('');
      setDate(initialDate || dayjs());
      setTime(initialTime || '');
      setStartTimeRange('');
      setEndTimeRange('');
      setConsultation('');
    }
  }, [appointment, initialDate, initialTime]);

  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

  // --- Event Handlers ---
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!date) {
      setError('日付は必須項目です。');
      return;
    }

    if (reservationType === 'outpatient') {
      if (!patientId || !patientName || !time) {
        setError('患者ID、患者名、時間は必須項目です。');
        return;
      }
    } else if (reservationType === 'visit' || reservationType === 'rehab') {
      if (!startTimeRange || !endTimeRange) {
        setError('開始時間と終了時間は必須項目です。');
        return;
      }
      if (dayjs(startTimeRange, 'HH:mm').isAfter(dayjs(endTimeRange, 'HH:mm'))) {
        setError('開始時間は終了時間より前に設定してください。');
        return;
      }
    }

    closeReservationForm(); // フォームを閉じる
    showLoader(); // ローディング開始

    const appointmentData: any = {
      date: date.format('YYYY-MM-DD'),
      reservationType,
      sendNotification,
    };

    if (reservationType === 'outpatient') {
      appointmentData.patientId = patientId;
      appointmentData.patientName = patientName;
      appointmentData.time = time;
      appointmentData.consultation = consultation;
    } else if (reservationType === 'visit') {
      appointmentData.facilityName = facilityName;
      appointmentData.startTimeRange = startTimeRange;
      appointmentData.endTimeRange = endTimeRange;
      appointmentData.consultation = consultation;
    } else if (reservationType === 'rehab') {
      appointmentData.startTimeRange = startTimeRange;
      appointmentData.endTimeRange = endTimeRange;
    }

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
    } finally {
      hideLoader(); // ローディング終了
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

        <FormControl fullWidth required sx={{ mb: 2 }}>
          <InputLabel>予約種別</InputLabel>
          <Select
            value={reservationType}
            label="予約種別"
            onChange={(e: SelectChangeEvent) => setReservationType(e.target.value as 'outpatient' | 'visit' | 'rehab')}
          >
            <MenuItem value="outpatient">外来診療</MenuItem>
            <MenuItem value="visit">訪問診療</MenuItem>
            <MenuItem value="rehab">通所リハ会議</MenuItem>
          </Select>
        </FormControl>

        {reservationType === 'outpatient' && (
          <>
            <TextField
              label="患者ID"
              value={patientId}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value)) { // 数字のみを許可
                  setPatientId(value);
                }
              }}
              fullWidth
              required
              sx={{ mb: 2 }}
              error={!!error && error.includes('患者ID')}
              helperText={!!error && error.includes('患者ID') ? error : ''}
            />
            <TextField
              label="患者名"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
          </>
        )}

        {reservationType === 'visit' && (
          <TextField
            label="施設名 (任意)"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
        )}

        <DatePicker
          label="日付"
          value={date}
          onChange={(newValue) => setDate(newValue)}
          shouldDisableDate={shouldDisableDate}
          sx={{ mb: 2, width: '100%' }}
        />

        {reservationType === 'outpatient' && (
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
        )}

        {(reservationType === 'visit' || reservationType === 'rehab') && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>開始時間</InputLabel>
              <Select
                value={startTimeRange}
                label="開始時間"
                onChange={(e: SelectChangeEvent) => setStartTimeRange(e.target.value)}
              >
                {allTimeSlots.map((slot) => (
                  <MenuItem key={slot} value={slot}>
                    {slot}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>終了時間</InputLabel>
              <Select
                value={endTimeRange}
                label="終了時間"
                onChange={(e: SelectChangeEvent) => setEndTimeRange(e.target.value)}
              >
                {allTimeSlots.map((slot) => (
                  <MenuItem key={slot} value={slot}>
                    {slot}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {(reservationType === 'outpatient' || reservationType === 'visit') && (
          <TextField
            label="診察内容"
            value={consultation}
            onChange={(e) => setConsultation(e.target.value)}
            fullWidth
            multiline={reservationType === 'visit'} // 訪問診療の場合は複数行
            rows={reservationType === 'visit' ? 4 : 1} // 訪問診療の場合は4行
            sx={{ mb: 2 }}
          />
        )}

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