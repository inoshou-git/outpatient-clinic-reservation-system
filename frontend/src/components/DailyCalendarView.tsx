import React, { useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
} from "@mui/material";
import { Print } from "@mui/icons-material";

import { Appointment, BlockedSlot } from "../types";

import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

interface DailyCalendarViewProps {
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  currentDate: Dayjs;
  onSlotClick: (date: Dayjs, time: string) => void; // For new appointments
  onEditAppointment: (appointment: Appointment) => void; // For editing existing appointments
  onEditSpecialAppointment: (appointment: Appointment) => void; // For editing special appointments
  onDeleteAppointment: (id: number, sendNotification: boolean) => void; // For deleting existing appointments
  canEdit: boolean; // New prop to control editability
}

// --- Time Slot Generation ---
type DisplayPeriod = "morning" | "afternoon" | "all";

const generateTimeSlots = (displayPeriod: DisplayPeriod) => {
  const slots = [];
  const today = "1970-01-01";
  let time = dayjs(`${today}T09:30:00`);
  const endTime = dayjs(`${today}T16:30:00`);
  const lunchStart = dayjs(`${today}T11:45:00`);
  const lunchEnd = dayjs(`${today}T13:30:00`);

  while (time.isBefore(endTime) || time.isSame(endTime)) {
    const isMorning =
      time.hour() < 12 || (time.hour() === 12 && time.minute() === 0);
    const isAfternoon =
      time.hour() >= 13 || (time.hour() === 12 && time.minute() > 0);

    if (
      !time.isBetween(lunchStart, lunchEnd, null, "[)")
    ) {
      if (displayPeriod === "morning" && isMorning) {
        slots.push(time.format("HH:mm"));
      } else if (displayPeriod === "afternoon" && isAfternoon) {
        slots.push(time.format("HH:mm"));
      } else if (displayPeriod === "all") {
        slots.push(time.format("HH:mm"));
      }
    }
    time = time.add(15, "minute");
  }
  return slots;
};

const formatConsultation = (consultation: string | undefined | null): string | null => {
  if (!consultation) return null;
  if (Array.isArray(consultation)) return consultation.join(', ');
  if (consultation.startsWith('[') && consultation.endsWith(']')) {
    try {
      const parsed = JSON.parse(consultation);
      return Array.isArray(parsed) ? parsed.join(', ') : consultation;
    } catch (e) {
      return consultation; // In case of invalid JSON
    }
  }
  return consultation;
};

// --- Component ---
const DailyCalendarView: React.FC<DailyCalendarViewProps> = ({
  appointments,
  blockedSlots,
  currentDate,
  onSlotClick,
  onEditAppointment,
  onEditSpecialAppointment,
  onDeleteAppointment,
  canEdit,
}) => {
  const [displayPeriod, setDisplayPeriod] = useState<DisplayPeriod>("all");
  const timeSlots = generateTimeSlots(displayPeriod);
  const day = currentDate; // We only care about the current date

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [openAppointmentDetails, setOpenAppointmentDetails] = useState(false);
  const [sendDeleteNotification, setSendDeleteNotification] = useState(false); // Default to false

  const handlePrint = () => {
    window.print();
  };

  const getAppointmentForSlot = (day: Dayjs, time: string) => {
    const currentSlotDateTime = dayjs(`${day.format("YYYY-MM-DD")}T${time}`);

    return appointments.find((app) => {
      if (app.isDeleted) return false;
      if (!dayjs(app.date).isSame(day, "day")) return false;

      if (app.reservationType === "outpatient") {
        return app.time === time;
      } else if (app.reservationType === "special") {
        return false; // Handled separately
      } else if (
        app.reservationType === "visit" ||
        app.reservationType === "rehab"
      ) {
        if (!app.startTimeRange || !app.endTimeRange) return false;
        const startDateTime = dayjs(`${app.date}T${app.startTimeRange}`);
        const endDateTime = dayjs(`${app.date}T${app.endTimeRange}`);
        // Check if the current 15-minute slot falls within the appointment's time range
        return currentSlotDateTime.isBetween(
          startDateTime,
          endDateTime,
          null,
          "[)"
        );
      }
      return false;
    });
  };

  const getBlockedSlotForSlot = (day: Dayjs, time: string) => {
    const dateTime = dayjs(`${day.format("YYYY-MM-DD")}T${time}`);
    return blockedSlots.find((slot) => {
      const blockedStartDate = dayjs(slot.date);
      const blockedEndDate = slot.endDate
        ? dayjs(slot.endDate).endOf("day")
        : blockedStartDate;

      // Check if the day is within the blocked date range
      if (
        !day.isBetween(
          blockedStartDate.startOf("day"),
          blockedEndDate.endOf("day"),
          null,
          "[]"
        )
      ) {
        return false;
      }

      // If it's an all-day block, it applies
      if (slot.startTime === null) return true;

      // If it's a time-specific block, check if the time overlaps
      const slotStartTime = dayjs(`${slot.date}T${slot.startTime}`);
      const slotEndTime = dayjs(`${slot.date}T${slot.endTime}`);
      return dateTime.isBetween(slotStartTime, slotEndTime, null, "[)");
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
      if (selectedAppointment.reservationType === "special") {
        onEditSpecialAppointment(selectedAppointment);
      } else {
        onEditAppointment(selectedAppointment);
      }
      handleCloseAppointmentDetails();
    }
  };

  const handleDeleteClick = () => {
    if (selectedAppointment) {
      if (window.confirm("この予約を削除してもよろしいですか？")) {
        onDeleteAppointment(selectedAppointment.id, sendDeleteNotification);
        handleCloseAppointmentDetails();
      }
    }
  };

  const specialAppointments = appointments.filter(
    (app) => app.reservationType === "special"
  );

  const getSpecialAppointmentsForDay = (day: Dayjs) => {
    return specialAppointments.filter((app) => dayjs(app.date).isSame(day, "day"));
  };

  return (
    <div>
      <style>
        {`
          @media print {
            .MuiTableContainer-root {
              max-height: none !important;
              overflow: visible !important;
            }
            .MuiTableCell-stickyHeader, .MuiTableCell-sticky, th[style*='position: sticky'] {
              position: static !important;
            }
            .MuiDialog-root {
              display: none !important;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .appointment-content {
              text-align: left;
              padding-left: 4px;
            }
          }
        `}
      </style>
      <Paper>
        <TableContainer className="printable-area" sx={{ maxHeight: "calc(100vh - 160px)" }}>
          <Table stickyHeader sx={{ minWidth: 300 }}>
            <TableHead>
              <TableRow sx={{ position: "sticky", top: 0, zIndex: 1101 }}>
                <TableCell
                  sx={{ minWidth: 80, zIndex: 1100, backgroundColor: "white" }}
                >
                  診察時間
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ zIndex: 1100, backgroundColor: "white" }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <Button
                      variant={
                        displayPeriod === "morning" ? "contained" : "outlined"
                      }
                      size="small"
                      onClick={() => setDisplayPeriod("morning")}
                      sx={{ mr: 1 }}
                    >
                      午前診療
                    </Button>
                    <Button
                      variant={
                        displayPeriod === "afternoon" ? "contained" : "outlined"
                      }
                      size="small"
                      onClick={() => setDisplayPeriod("afternoon")}
                      sx={{ mr: 1 }}
                    >
                      午後診療
                    </Button>
                    <Button
                      variant={displayPeriod === "all" ? "contained" : "outlined"}
                      size="small"
                      onClick={() => setDisplayPeriod("all")}
                      sx={{ mr: 1 }}
                    >
                      全て表示
                    </Button>
                    <IconButton onClick={handlePrint} size="small">
                      <Print />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
              <TableRow sx={{ position: "sticky", top: 57, zIndex: 1101 }}>
                <TableCell
                  sx={{ minWidth: 80, zIndex: 1100, backgroundColor: "white" }}
                >
                  時間帯
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ minWidth: 120 }}
                >
                  <Typography variant="subtitle1">
                    {day.format("ddd")}
                  </Typography>
                  <Typography variant="h6">{day.format("D")}</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell
                  sx={{
                    minWidth: 80,
                    zIndex: 1100,
                    backgroundColor: "white",
                    position: "sticky",
                    left: 0,
                  }}
                >
                  特別予約
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    minWidth: 120,
                    backgroundColor: "#fff176", // Darker yellow
                    borderRight: "1px solid #e0e0e0",
                  }}
                >
                  {getSpecialAppointmentsForDay(day).map((app) => (
                    <Box
                      key={app.id}
                      className="appointment-content"
                      sx={{ fontSize: "0.75rem", cursor: "pointer" }}
                      onClick={() => handleAppointmentClick(app)}
                    >
                      <strong>{app.patientName}</strong>({app.time})
                    </Box>
                  ))}
                </TableCell>
              </TableRow>
              {timeSlots.map((time) => {
                const appointment = getAppointmentForSlot(day, time);
                const blockedSlot = getBlockedSlotForSlot(day, time);

                const dayOfWeek = day.day();
                const [hour] = time.split(":").map(Number);
                const isFeverClinicTime = dayOfWeek === 1 && hour >= 15;
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isDisabledByBlock = !!blockedSlot;

                const canClick =
                  canEdit &&
                  !isFeverClinicTime &&
                  !isDisabledByBlock &&
                  !appointment &&
                  !isWeekend;

                let backgroundColor = "white";
                if (isFeverClinicTime || isDisabledByBlock) {
                  backgroundColor = "rgb(255, 235, 238)";
                } else if (isWeekend) {
                  backgroundColor = "rgb(245, 245, 245)";
                } else if (appointment) {
                  if (appointment.reservationType === 'visit') {
                    backgroundColor = 'rgb(232, 245, 233)';
                  } else if (appointment.reservationType === 'rehab') {
                    backgroundColor = 'rgb(243, 229, 245)';
                  } else { // outpatient and special
                    backgroundColor = '#e0f7fa';
                  }
                }

                return (
                  <TableRow key={time}>
                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 0,
                        backgroundColor: "white",
                        zIndex: 1000,
                        minWidth: 80,
                      }}
                    >
                      {time}
                    </TableCell>
                    <TableCell
                      align="center"
                      onClick={() => {
                        if (canClick) {
                          onSlotClick(day, time);
                        } else if (appointment) {
                          handleAppointmentClick(appointment);
                        }
                      }}
                      sx={{
                        minWidth: 120,
                        cursor: canClick || appointment ? "pointer" : "not-allowed",
                        backgroundColor: backgroundColor,
                        border: "1px solid rgb(224, 224, 224)",
                        padding: "4px",
                        "&:hover": {
                          backgroundColor:
                            canClick && !appointment ? "#f5f5f5" : undefined,
                        },
                      }}
                    >
                      {isFeverClinicTime ? (
                        <Typography
                          variant="caption"
                          sx={{ color: "red", fontWeight: "bold" }}
                        >
                          発熱外来
                        </Typography>
                      ) : blockedSlot ? (
                        <>
                          <Typography
                            variant="caption"
                            sx={{ color: "red", fontWeight: "bold" }}
                          >
                            予約不可
                          </Typography>
                          {blockedSlot.reason && <Typography variant="caption" sx={{ color: "red", display: 'block' }}>
                            {blockedSlot.reason}
                          </Typography>}
                        </>
                      ) : appointment ? (
                        <div className="appointment-content">
                          {appointment.reservationType === "outpatient" && (
                            <>
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{ fontSize: "0.75rem", fontWeight: "bold" }}
                              >
                                {appointment.patientId}
                              </Typography>
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{ fontSize: "0.75rem", fontWeight: "bold" }}
                              >
                                {appointment.patientName}
                              </Typography>
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{ fontSize: "0.75rem" }}
                              >
                                {formatConsultation(appointment.consultation)}
                              </Typography>
                            </>
                          )}
                          {(appointment.reservationType === "visit" ||
                            appointment.reservationType === "rehab") && (
                            <>
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{ fontSize: "0.75rem", fontWeight: "bold" }}
                              >
                                {appointment.reservationType === "visit"
                                  ? "訪問診療"
                                  : "通所リハ会議"}
                              </Typography>
                              {appointment.patientName && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  sx={{ fontSize: "0.75rem", fontWeight: "bold" }}
                                >
                                  {appointment.patientName}
                                </Typography>
                              )}
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{ fontSize: "0.75rem" }}
                              >
                                {appointment.startTimeRange} -{" "}
                                {appointment.endTimeRange}
                              </Typography>
                            </>
                          )}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog
          open={openAppointmentDetails}
          onClose={handleCloseAppointmentDetails}
        >
          <DialogTitle>予約詳細</DialogTitle>
          <DialogContent>
            {selectedAppointment && (
              <Box>
                <Typography variant="subtitle1">
                  <strong>予約種別:</strong>{" "}
                  {selectedAppointment.reservationType === "outpatient"
                    ? "外来診療"
                    : selectedAppointment.reservationType === "visit"
                    ? "訪問診療"
                    : selectedAppointment.reservationType === "rehab"
                    ? "通所リハ会議"
                    : selectedAppointment.reservationType === "special"
                    ? "特別予約"
                    : "不明"}
                </Typography>
                {(selectedAppointment.reservationType === "outpatient" ||
                  selectedAppointment.reservationType === "special") && (
                  <>
                    <Typography variant="subtitle1">
                      <strong>患者ID:</strong> {selectedAppointment.patientId}
                    </Typography>
                    <Typography variant="subtitle1">
                      <strong>患者名:</strong> {selectedAppointment.patientName}
                    </Typography>
                    <Typography variant="subtitle1">
                      <strong>時間:</strong> {selectedAppointment.time}
                    </Typography>
                  </>
                )}
                {selectedAppointment.reservationType === "visit" && (
                  <>
                    {selectedAppointment.facilityName && (
                      <Typography variant="subtitle1">
                        <strong>施設名:</strong>{" "}
                        {selectedAppointment.facilityName}
                      </Typography>
                    )}
                    <Typography variant="subtitle1">
                      <strong>時間帯:</strong>{" "}
                      {selectedAppointment.startTimeRange} -{" "}
                      {selectedAppointment.endTimeRange}
                    </Typography>
                  </>
                )}
                {selectedAppointment.reservationType === "rehab" && (
                  <Typography variant="subtitle1">
                    <strong>時間帯:</strong> {selectedAppointment.startTimeRange}{" "}
                    - {selectedAppointment.endTimeRange}
                  </Typography>
                )}
                <Typography variant="subtitle1">
                  <strong>日付:</strong> {selectedAppointment.date}
                </Typography>
                {(selectedAppointment.reservationType === "outpatient" ||
                  selectedAppointment.reservationType === "visit") &&
                  selectedAppointment.consultation && (
                    <Typography variant="subtitle1">
                      <strong>診察内容:</strong>{" "}
                      {formatConsultation(selectedAppointment.consultation)}
                    </Typography>
                  )}
                {selectedAppointment.reservationType === "special" &&
                  selectedAppointment.reason && (
                    <Typography variant="subtitle1">
                      <strong>理由:</strong> {selectedAppointment.reason}
                    </Typography>
                  )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: "space-between" }}>
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sendDeleteNotification}
                    onChange={(e) => setSendDeleteNotification(e.target.checked)}
                    disabled={!canEdit}
                  />
                }
                label="関係者に通知する"
              />
            </Box>
            <Box>
              <Button
                onClick={handleEditClick}
                color="primary"
                disabled={!canEdit}
              >
                編集
              </Button>
              <Button
                onClick={handleDeleteClick}
                color="secondary"
                disabled={!canEdit}
              >
                削除
              </Button>
              <Button onClick={handleCloseAppointmentDetails}>閉じる</Button>
            </Box>
          </DialogActions>
        </Dialog>
      </Paper>
    </div>
  );
};

export default DailyCalendarView;
