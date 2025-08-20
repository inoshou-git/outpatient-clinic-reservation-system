import React, { useState } from "react";
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
  ListItemText,
} from "@mui/material";

import { Appointment, BlockedSlot } from "../types";

import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ja";
import weekday from "dayjs/plugin/weekday";

dayjs.locale("ja");
dayjs.extend(weekday);

const WEEK_DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const DAY_CELL_HEIGHT = 120;

interface CalendarViewProps {
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  currentMonth: Dayjs;
}

const formatAppointmentPrimaryText = (app: Appointment): string => {
  switch (app.reservationType) {
    case "outpatient":
      return `${app.time} - ${app.patientName} (${app.patientId})`;
    case "visit":
      return `訪問診療: ${app.startTimeRange} - ${app.endTimeRange} (${
        app.facilityName || ""
      })`;
    case "rehab":
      return `通所リハ会議: ${app.startTimeRange} - ${app.endTimeRange}`;
    case "special":
      return `特別予約 - ${app.patientName} (${app.patientId})`;
    default:
      return "不明な予約種別";
  }
};

// --- Component ---
const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  blockedSlots,
  currentMonth,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<
    Appointment[]
  >([]);
  const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null);

  const startOfMonth = currentMonth.startOf("month");
  const endOfMonth = currentMonth.endOf("month");
  const startOfWeek = startOfMonth.weekday(0);
  const endOfWeek = endOfMonth.weekday(6);

  const daysInMonth: Dayjs[] = [];
  let day = startOfWeek;
  while (day.isBefore(endOfWeek) || day.isSame(endOfWeek, "day")) {
    daysInMonth.push(day);
    day = day.add(1, "day");
  }

  const getAppointmentsForDay = (date: Dayjs) => {
    return appointments.filter((app) => {
      if (app.isDeleted) return false;
      return dayjs(app.date).isSame(date, "day");
    });
  };

  const getAllDayBlock = (date: Dayjs) => {
    return blockedSlots.find((slot) => {
      const blockedStartDate = dayjs(slot.date);
      const blockedEndDate = slot.endDate
        ? dayjs(slot.endDate)
        : blockedStartDate;
      return (
        slot.startTime === null &&
        date.isBetween(
          blockedStartDate.startOf("day"),
          blockedEndDate.endOf("day"),
          null,
          "[]"
        )
      );
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
        {WEEK_DAYS.map((dayName) => (
          <Grid item xs={12 / 7} key={dayName}>
            <Paper sx={{ p: 1, textAlign: "center", fontWeight: "bold" }}>
              {dayName}
            </Paper>
          </Grid>
        ))}
        {daysInMonth.map((date, index) => {
          const isCurrentMonth = date.month() === currentMonth.month();
          const dayAppointments = getAppointmentsForDay(date);
          const allDayBlock = getAllDayBlock(date);
          const isWeekend = date.day() === 0 || date.day() === 6;

          let backgroundColor = "white";
          if (!isCurrentMonth) {
            backgroundColor = "#fafafa";
          } else if (allDayBlock) {
            backgroundColor = "#ffebee"; // Light red for blocked day
          } else if (isWeekend) {
            backgroundColor = "#f5f5f5"; // Grey for weekend
          }

          return (
            <Grid item xs={12 / 7} key={index}>
              <Tooltip title={allDayBlock ? allDayBlock.reason : ""} arrow>
                <Paper
                  sx={{
                    p: 1,
                    minHeight: DAY_CELL_HEIGHT,
                    height: DAY_CELL_HEIGHT, // 固定高さ
                    backgroundColor,
                    color: isCurrentMonth
                      ? isWeekend
                        ? "#9e9e9e"
                        : "black"
                      : "#a0a0a0",
                    cursor: allDayBlock ? "not-allowed" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                  onClick={() => !allDayBlock && handleDayClick(date)}
                >
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {date.date()}
                  </Typography>
                  {dayAppointments.length > 0 && (
                    <Box
                      sx={{
                        fontSize: "0.75rem",
                        mt: 0.5,
                        p: 0.5,
                        backgroundColor: "#e0f7fa",
                        borderRadius: 1,
                        textAlign: "center",
                      }}
                    >
                      {dayAppointments.length}件の予約
                    </Box>
                  )}
                  {allDayBlock && (
                    <Box
                      sx={{
                        fontSize: "0.75rem",
                        mt: 0.5,
                        p: 0.5,
                        color: "#c62828",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
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
        <DialogTitle>
          {selectedDay ? selectedDay.format("YYYY年 M月D日") + "の予約" : ""}
        </DialogTitle>
        <DialogContent>
          <List>
            {selectedDayAppointments.map((app) => (
              <ListItem key={app.id}>
                <ListItemText
                  primary={formatAppointmentPrimaryText(app)}
                  secondary={
                    app.reservationType === "outpatient"
                      ? app.consultation
                      : app.reservationType === "visit"
                      ? app.consultation
                      : null
                  }
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
