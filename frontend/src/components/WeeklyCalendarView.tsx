import React, { useState } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

import { Appointment, BlockedSlot } from '../types';

import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

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
type DisplayPeriod = 'morning' | 'afternoon' | 'all';

// --- Time Slot Generation ---
const generateTimeSlots = (displayPeriod: DisplayPeriod) => {
  const slots = [];
  let time = dayjs().hour(9).minute(30).second(0);
  const endTime = dayjs().hour(16).minute(30).second(0);
  const lunchStart = dayjs().hour(11).minute(45).second(0);
  const lunchEnd = dayjs().hour(13).minute(30).second(0);

  while (time.isBefore(endTime) || time.isSame(endTime)) {
    const isMorning = time.hour() < 12 || (time.hour() === 12 && time.minute() === 0);
    const isAfternoon = time.hour() >= 13 || (time.hour() === 12 && time.minute() > 0);

    if (time.isBefore(lunchStart) || time.isAfter(lunchEnd) || time.isSame(lunchEnd)) {
      if (displayPeriod === 'morning' && isMorning) {
        slots.push(time.format('HH:mm'));
      } else if (displayPeriod === 'afternoon' && isAfternoon) {
        slots.push(time.format('HH:mm'));
      } else if (displayPeriod === 'all') {
        slots.push(time.format('HH:mm'));
      }
    }
    time = time.add(15, 'minute');
  }
  return slots;
};

// --- Component ---
const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({ appointments, blockedSlots, currentDate, onSlotClick, onEditAppointment, onDeleteAppointment, canEdit }) => {
  const [displayPeriod, setDisplayPeriod] = useState<DisplayPeriod>('all');
  const timeSlots = generateTimeSlots(displayPeriod);
  const weekDays = Array.from({ length: 7 }).map((_, i) => currentDate.startOf('week').add(i, 'day'));

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [openAppointmentDetails, setOpenAppointmentDetails] = useState(false);

  const getAppointmentForSlot = (day: Dayjs, time: string) => {
    const currentSlotDateTime = dayjs(`${day.format('YYYY-MM-DD')}T${time}`);

    return appointments.find(app => {
      if (app.isDeleted) return false;
      if (!dayjs(app.date).isSame(day, 'day')) return false;

      if (app.reservationType === 'outpatient') {
        return app.time === time;
      } else if (app.reservationType === 'visit' || app.reservationType === 'rehab') {
        if (!app.startTimeRange || !app.endTimeRange) return false;
        const startDateTime = dayjs(`${app.date}T${app.startTimeRange}`);
        const endDateTime = dayjs(`${app.date}T${app.endTimeRange}`);
        // Check if the current 15-minute slot falls within the appointment's time range
        return currentSlotDateTime.isBetween(startDateTime, endDateTime, null, '[)');
      }
      return false;
    });
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
              <TableCell colSpan={7} align="center" sx={{ zIndex: 1100, backgroundColor: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                  <Button variant={displayPeriod === 'morning' ? 'contained' : 'outlined'} size="small" onClick={() => setDisplayPeriod('morning')} sx={{ mr: 1 }}>午前診療</Button>
                  <Button variant={displayPeriod === 'afternoon' ? 'contained' : 'outlined'} size="small" onClick={() => setDisplayPeriod('afternoon')} sx={{ mr: 1 }}>午後診療</Button>
                  <Button variant={displayPeriod === 'all' ? 'contained' : 'outlined'} size="small" onClick={() => setDisplayPeriod('all')}>全て表示</Button>
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ minWidth: 80, zIndex: 1100, backgroundColor: 'white' }}>時間帯</TableCell> {/* Empty cell for alignment */}
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
                            {appointment.reservationType === 'outpatient' && (
                              <>
                                <strong>{appointment.patientId}</strong><br/>
                                <strong>{appointment.patientName}</strong><br/>
                                {appointment.consultation}
                              </>
                            )}
                            {appointment.reservationType === 'visit' && (
                              <>
                                <strong>訪問診療</strong><br/>
                                {appointment.facilityName && <>{appointment.facilityName}<br/></>}
                                {appointment.startTimeRange} - {appointment.endTimeRange}<br/>
                                {appointment.consultation}
                              </>
                            )}
                            {appointment.reservationType === 'rehab' && (
                              <>
                                <strong>通所リハ会議</strong><br/>
                                {appointment.startTimeRange} - {appointment.endTimeRange}
                              </>
                            )}
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
              <Typography variant="subtitle1"><strong>予約種別:</strong> {
                selectedAppointment.reservationType === 'outpatient' ? '外来診療' :
                selectedAppointment.reservationType === 'visit' ? '訪問診療' :
                selectedAppointment.reservationType === 'rehab' ? '通所リハ会議' : '不明'
              }</Typography>
              {selectedAppointment.reservationType === 'outpatient' && (
                <>
                  <Typography variant="subtitle1"><strong>患者ID:</strong> {selectedAppointment.patientId}</Typography>
                  <Typography variant="subtitle1"><strong>患者名:</strong> {selectedAppointment.patientName}</Typography>
                  <Typography variant="subtitle1"><strong>時間:</strong> {selectedAppointment.time}</Typography>
                </>
              )}
              {selectedAppointment.reservationType === 'visit' && (
                <>
                  {selectedAppointment.facilityName && <Typography variant="subtitle1"><strong>施設名:</strong> {selectedAppointment.facilityName}</Typography>}
                  <Typography variant="subtitle1"><strong>時間帯:</strong> {selectedAppointment.startTimeRange} - {selectedAppointment.endTimeRange}</Typography>
                </>
              )}
              {selectedAppointment.reservationType === 'rehab' && (
                <Typography variant="subtitle1"><strong>時間帯:</strong> {selectedAppointment.startTimeRange} - {selectedAppointment.endTimeRange}</Typography>
              )}
              <Typography variant="subtitle1"><strong>日付:</strong> {selectedAppointment.date}</Typography>
              {(selectedAppointment.reservationType === 'outpatient' || selectedAppointment.reservationType === 'visit') && selectedAppointment.consultation && (
                <Typography variant="subtitle1"><strong>診察内容:</strong> {selectedAppointment.consultation}</Typography>
              )}
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

