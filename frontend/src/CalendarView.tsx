import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ja';
import weekday from 'dayjs/plugin/weekday';

dayjs.locale('ja');
dayjs.extend(weekday);

// --- Interfaces ---
interface Appointment {
  id: number;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  consultation: string;
}

interface BlockedSlot {
  id: number;
  date: string;
  endDate: string | null; // Added endDate
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

interface CalendarViewProps {
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  currentMonth: Dayjs;
}

// --- Component ---
const CalendarView: React.FC<CalendarViewProps> = ({ appointments, blockedSlots, currentMonth }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<Appointment[]>([]);
  const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null);

  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth = currentMonth.endOf('month');
  const startOfWeek = startOfMonth.weekday(0);
  const endOfWeek = endOfMonth.weekday(6);

  const daysInMonth: Dayjs[] = [];
  let day = startOfWeek;
  while (day.isBefore(endOfWeek) || day.isSame(endOfWeek, 'day')) {
    daysInMonth.push(day);
    day = day.add(1, 'day');
  }

  const getAppointmentsForDay = (date: Dayjs) => {
    return appointments.filter(app => dayjs(app.date).isSame(date, 'day'));
  };

  const getAllDayBlock = (date: Dayjs) => {
    return blockedSlots.find(slot => {
      const blockedStartDate = dayjs(slot.date);
      const blockedEndDate = slot.endDate ? dayjs(slot.endDate) : blockedStartDate;
      return slot.startTime === null && date.isBetween(blockedStartDate.startOf('day'), blockedEndDate.endOf('day'), null, '[]');
    });
  };

  const handleDayClick = (date: Dayjs) => {
    const dayAppointments = getAppointmentsForDay(date);
    if (dayAppointments.length > 0) {
      setSelectedDayAppointments(dayAppointments);
      setSelectedDay(date);
      setOpenDialog(true);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDayAppointments([]);
    setSelectedDay(null);
  };

  return (
    <Box>
      <Grid container spacing={1}>
        {['日', '月', '火', '水', '木', '金', '土'].map(dayName => (
          <Grid item xs={12 / 7} key={dayName}>
            <Paper sx={{ p: 1, textAlign: 'center', fontWeight: 'bold' }}>{dayName}</Paper>
          </Grid>
        ))}
        {daysInMonth.map((date, index) => {
          const isCurrentMonth = date.month() === currentMonth.month();
          const dayAppointments = getAppointmentsForDay(date);
          const allDayBlock = getAllDayBlock(date);
          const isWeekend = date.day() === 0 || date.day() === 6;

          let backgroundColor = 'white';
          if (!isCurrentMonth) {
            backgroundColor = '#fafafa';
          } else if (allDayBlock) {
            backgroundColor = '#ffebee'; // Light red for blocked day
          } else if (isWeekend) {
            backgroundColor = '#f5f5f5'; // Grey for weekend
          }

          return (
            <Grid item xs={12 / 7} key={index}>
              <Tooltip title={allDayBlock ? allDayBlock.reason : ''} arrow>
                <Paper
                  sx={{
                    p: 1,
                    minHeight: 120,
                    height: 120, // 固定高さ
                    backgroundColor,
                    color: isCurrentMonth ? 'black' : '#a0a0a0',
                    cursor: allDayBlock ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => !allDayBlock && handleDayClick(date)}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{date.date()}</Typography>
                  {dayAppointments.length > 0 && (
                    <Box sx={{ fontSize: '0.75rem', mt: 0.5, p: 0.5, backgroundColor: '#e0f7fa', borderRadius: 1, textAlign: 'center' }}>
                      {dayAppointments.length}件の予約
                    </Box>
                  )}
                  {allDayBlock && (
                     <Box sx={{ fontSize: '0.75rem', mt: 0.5, p: 0.5, color: '#c62828', fontWeight: 'bold', textAlign: 'center' }}>
                       {allDayBlock.reason}
                     </Box>
                  )}
                </Paper>
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{selectedDay ? selectedDay.format('YYYY年 M月D日') + 'の予約' : ''}</DialogTitle>
        <DialogContent>
          <List>
            {selectedDayAppointments.map(app => (
              <ListItem key={app.id}>
                <ListItemText
                  primary={`${app.time} - ${app.patientName} (${app.patientId})`}
                  secondary={app.consultation}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarView;
