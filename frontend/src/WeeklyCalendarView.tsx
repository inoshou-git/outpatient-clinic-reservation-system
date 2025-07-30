import React, { useState } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

// --- Interfaces ---
interface Appointment {
  id: number;
  patientName: string;
  date: string;
  time: string;
  consultation: string;
  isDeleted?: boolean;
}

interface BlockedSlot {
  id: number;
  date: string;
  endDate: string | null; // Added endDate
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

interface WeeklyCalendarViewProps {
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  currentDate: Dayjs;
  onSlotClick: (date: Dayjs, time: string) => void; // For new appointments
  onEditAppointment: (appointment: Appointment) => void; // For editing existing appointments
  onDeleteAppointment: (id: number) => void; // For deleting existing appointments
  canEdit: boolean; // New prop to control editability
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
const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({ appointments, blockedSlots, currentDate, onSlotClick, onEditAppointment, onDeleteAppointment, canEdit }) => {
  const timeSlots = generateTimeSlots();
  const weekDays = Array.from({ length: 7 }).map((_, i) => currentDate.startOf('week').add(i, 'day'));

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [openAppointmentDetails, setOpenAppointmentDetails] = useState(false);

  const getAppointmentForSlot = (day: Dayjs, time: string) => {
    return appointments.find(app => !app.isDeleted && dayjs(app.date).isSame(day, 'day') && app.time === time);
  };

  const getBlockedSlotForSlot = (day: Dayjs, time: string) => {
    const dateTime = dayjs(`${day.format('YYYY-MM-DD')}T${time}`);
    return blockedSlots.find(slot => {
      const blockedStartDate = dayjs(slot.date);
      const blockedEndDate = slot.endDate ? dayjs(slot.endDate) : blockedStartDate;

      // Check if the day is within the blocked date range
      if (!day.isBetween(blockedStartDate.startOf('day'), blockedEndDate.endOf('day'), null, '[]')) {
        return false;
      }

      // If it's an all-day block, it applies
      if (slot.startTime === null) return true;

      // If it's a time-specific block, check if the time overlaps
      const slotStartTime = dayjs(`${slot.date}T${slot.startTime}`);
      const slotEndTime = dayjs(`${slot.date}T${slot.endTime}`);
      return dateTime.isBetween(slotStartTime, slotEndTime, null, '[)');
    });
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setOpenAppointmentDetails(true);
  };

  const handleCloseAppointmentDetails = () => {
    setSelectedAppointment(null);
    setOpenAppointmentDetails(false);
  };

  const handleEditClick = () => {
    if (selectedAppointment) {
      onEditAppointment(selectedAppointment);
      handleCloseAppointmentDetails();
    }
  };

  const handleDeleteClick = () => {
    if (selectedAppointment) {
      onDeleteAppointment(selectedAppointment.id);
      handleCloseAppointmentDetails();
    }
  };

  return (
    <Paper>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)' }}>
        <Table stickyHeader sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 80, zIndex: 1100, backgroundColor: 'white' }}>診察時間</TableCell>
              {weekDays.map(day => (
                <TableCell key={day.toString()} align="center" sx={{ minWidth: 120 }}>
                  <Typography variant="subtitle1">{day.format('ddd')}</Typography>
                  <Typography variant="h6">{day.format('D')}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {timeSlots.map(time => (
              <TableRow key={time} hover>
                <TableCell component="th" scope="row" sx={{ backgroundColor: 'white', zIndex: 1000 }}>
                  {time}
                </TableCell>
                {weekDays.map(day => {
                  const appointment = getAppointmentForSlot(day, time);
                  const blockedSlot = getBlockedSlotForSlot(day, time);
                  const isWeekend = day.day() === 0 || day.day() === 6;

                  let backgroundColor = 'transparent';
                  let cursor = 'default';
                  let clickable = canEdit; // Only clickable if canEdit is true
                  if (isWeekend) {
                    backgroundColor = '#f5f5f5';
                    cursor = 'not-allowed';
                    clickable = false;
                  } else if (blockedSlot) {
                    backgroundColor = '#ffebee'; // Light red for blocked
                    cursor = 'not-allowed';
                    clickable = false;
                  } else if (appointment) {
                    backgroundColor = '#e3f2fd'; // Light blue for appointments
                    cursor = canEdit ? 'pointer' : 'default'; // Only pointer if canEdit
                    clickable = canEdit; // Only clickable if canEdit is true
                  }

                  return (
                    <Tooltip title={blockedSlot ? blockedSlot.reason : ''} arrow>
                      <TableCell
                        key={day.toString()}
                        align="center"
                        sx={{
                          border: '1px solid #eee',
                          height: 60,
                          p: 0.5,
                          backgroundColor,
                          cursor,
                          '&:hover': {
                            backgroundColor: isWeekend || blockedSlot || appointment ? backgroundColor : (canEdit ? '#e0e0e0' : backgroundColor) // Lighter grey for hover on empty slots only if canEdit
                          }
                        }}
                        onClick={() => {
                          if (clickable) {
                            if (appointment) {
                              handleAppointmentClick(appointment);
                            } else {
                              onSlotClick(day, time);
                            }
                          }
                        }}
                      >
                        {!isWeekend && !blockedSlot && appointment ? (
                          <Box sx={{ fontSize: '0.75rem' }}>
                            <strong>{appointment.patientName}</strong><br/>
                            {appointment.consultation}
                          </Box>
                        ) : null}
                      </TableCell>
                    </Tooltip>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openAppointmentDetails} onClose={handleCloseAppointmentDetails}>
        <DialogTitle>予約詳細</DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <Box>
              <Typography variant="subtitle1"><strong>患者名:</strong> {selectedAppointment.patientName}</Typography>
              <Typography variant="subtitle1"><strong>日付:</strong> {selectedAppointment.date}</Typography>
              <Typography variant="subtitle1"><strong>時間:</strong> {selectedAppointment.time}</Typography>
              <Typography variant="subtitle1"><strong>診察内容:</strong> {selectedAppointment.consultation}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClick} color="primary" disabled={!canEdit}>編集</Button>
          <Button onClick={handleDeleteClick} color="secondary" disabled={!canEdit}>削除</Button>
          <Button onClick={handleCloseAppointmentDetails}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default WeeklyCalendarView;

