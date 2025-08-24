import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Container,
  CircularProgress,
  Box,
  ButtonGroup,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
} from "@mui/material";
import {
  ArrowBackIos,
  ArrowForwardIos,
  Edit,
  Delete,
} from "@mui/icons-material";
import ReservationForm from "../components/ReservationForm";
import CalendarView from "../components/CalendarView";
import WeeklyCalendarView from "../components/WeeklyCalendarView";
import BlockedSlotForm from "../components/BlockedSlotForm";
import SpecialReservationForm from "../components/SpecialReservationForm";
import AppointmentListTable from "../components/AppointmentListTable";

import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import dayjs, { Dayjs } from "dayjs";

import { Appointment, BlockedSlot } from "../types";
import {
  getAppointments,
  getBlockedSlots,
  deleteAppointment,
} from "../services/api";

type DisplayMode = "list" | "calendar" | "weekly";
type Order = "asc" | "desc";

interface SortConfig {
  key: keyof Appointment;
  direction: Order;
}

const HomePage = () => {
  const { isAuthenticated, token, user } = useAuth();
  const {
    isReservationFormOpen,
    closeReservationForm,
    isBlockedSlotFormOpen,
    closeBlockedSlotForm,
    openReservationForm,
    showLoader,
    hideLoader,
    reservationFormAppointment,
    reservationFormInitialDate,
    reservationFormInitialTime,
    registerAppointmentChangeCallback,
    unregisterAppointmentChangeCallback,
    registerBlockedSlotChangeCallback,
    unregisterBlockedSlotChangeCallback,
  } = useUI();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [view, setView] = useState<"all" | "daily" | "weekly" | "monthly">(
    "daily"
  );
  const [displayMode, setDisplayMode] = useState<DisplayMode>("weekly");
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: "date",
    direction: "asc",
  });
  const [selectedAppointments, setSelectedAppointments] = useState<number[]>(
    []
  );
  const [bulkActionEnabled, setBulkActionEnabled] = useState(false);
  const [isSpecialReservationFormOpen, setIsSpecialReservationFormOpen] =
    useState(false);
  const [editingSpecialAppointment, setEditingSpecialAppointment] =
    useState<Appointment | null>(null);

  const openSpecialReservationForm = (appointment: Appointment | null = null) => {
    setEditingSpecialAppointment(appointment);
    setIsSpecialReservationFormOpen(true);
  };

  const closeSpecialReservationForm = () => {
    setEditingSpecialAppointment(null);
    setIsSpecialReservationFormOpen(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appointmentData, blockedSlotData] = await Promise.all([
        getAppointments(token),
        getBlockedSlots(token),
      ]);
      setAppointments(appointmentData);
      setBlockedSlots(blockedSlotData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();

    // Register the callback for appointment changes
    registerAppointmentChangeCallback(fetchData);
    registerBlockedSlotChangeCallback(fetchData);

    return () => {
      // Unregister the callback when the component unmounts
      unregisterAppointmentChangeCallback();
      unregisterBlockedSlotChangeCallback();
    };
  }, [
    fetchData,
    registerAppointmentChangeCallback,
    unregisterAppointmentChangeCallback,
    registerBlockedSlotChangeCallback,
    unregisterBlockedSlotChangeCallback,
  ]);

  const handleFormSubmit = () => {
    fetchData();
  };

  const handleEditAppointment = (appointment: Appointment) => {
    openReservationForm(appointment);
  };

  const handleDeleteAppointment = async (id: number, sendNotification: boolean) => {
    showLoader();
    try {
      await deleteAppointment(id, sendNotification, token);
      fetchData();
    } catch (error: any) {
      console.error("Failed to delete appointment:", error.message);
      alert(`予約の削除に失敗しました: ${error.message}`);
    } finally {
      hideLoader();
    }
  };

  const handlePrev = () => {
    const newDate =
      displayMode === "calendar"
        ? currentDate.subtract(1, "month")
        : currentDate.subtract(1, "week");
    setCurrentDate(newDate);
  };
  const handleNext = () => {
    const newDate =
      displayMode === "calendar"
        ? currentDate.add(1, "month")
        : currentDate.add(1, "week");
    setCurrentDate(newDate);
  };
  const handleToday = () => setCurrentDate(dayjs());

  const handleRequestSort = (key: keyof Appointment) => {
    let direction: Order = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = sortedAppointments.map((n) => n.id);
      setSelectedAppointments(newSelecteds);
      return;
    }
    setSelectedAppointments([]);
  };

  const handleSelectClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selectedAppointments.indexOf(id);
    let newSelected: readonly number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedAppointments, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedAppointments.slice(1));
    } else if (selectedIndex === selectedAppointments.length - 1) {
      newSelected = newSelected.concat(selectedAppointments.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedAppointments.slice(0, selectedIndex),
        selectedAppointments.slice(selectedIndex + 1)
      );
    }
    setSelectedAppointments(newSelected as number[]);
  };

  const handleBulkDelete = async () => {
    if (
      window.confirm(
        `${selectedAppointments.length}件の予約を削除してもよろしいですか？`
      )
    ) {
      showLoader(); // ローディング開始
      try {
        // For bulk deletes, we'll default to sending notifications.
        // A more advanced implementation could have a checkbox for this too.
        const promises = selectedAppointments.map((id) =>
          deleteAppointment(id, true, token)
        );
        await Promise.all(promises);
        fetchData();
        setSelectedAppointments([]);
        setBulkActionEnabled(false);
      } catch (error: any) {
        console.error("Failed to bulk delete appointments", error.message);
        alert("予約の一括削除中にエラーが発生しました。");
      } finally {
        hideLoader(); // ローディング終了
      }
    }
  };

  const isSelected = (id: number) => selectedAppointments.indexOf(id) !== -1;

  const handleWeeklySlotClick = (date: Dayjs, time: string) => {
    if (!isAuthenticated) return alert("ログインしてください。");
    openReservationForm(null, date, time);
  };

  const sortedAppointments = useMemo(() => {
    let sortableItems = [...appointments.filter((app) => !app.isDeleted)];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === "date" || sortConfig.key === "time") {
          const aDateTime = dayjs(`${a.date} ${a.time}`);
          const bDateTime = dayjs(`${b.date} ${b.time}`);
          if (aDateTime.isBefore(bDateTime)) {
            return sortConfig.direction === "asc" ? -1 : 1;
          }
          if (aDateTime.isAfter(bDateTime)) {
            return sortConfig.direction === "asc" ? 1 : -1;
          }
          return 0;
        }

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [appointments, sortConfig]);

  const filteredAppointments = sortedAppointments.filter((app) => {
    return (
      !app.isDeleted &&
      (view === "all" ||
        (view === "daily" && dayjs(app.date).isSame(dayjs(), "day")) ||
        (view === "weekly" &&
          dayjs(app.date).isAfter(dayjs().startOf("week")) &&
          dayjs(app.date).isBefore(dayjs().endOf("week"))) ||
        (view === "monthly" && dayjs(app.date).isSame(dayjs(), "month")))
    );
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", mb: { xs: 2, md: 0 } }}
        >
          {(displayMode === "calendar" || displayMode === "weekly") && (
            <>
              <IconButton onClick={handlePrev}>
                <ArrowBackIos />
              </IconButton>
              <Typography variant="h5" sx={{ mx: 2 }}>
                {displayMode === "calendar"
                  ? currentDate.format("YYYY年 M月")
                  : `${currentDate
                      .startOf("week")
                      .format("YYYY年 M月D日")} - ${currentDate
                      .endOf("week")
                      .format("M月D日")}`}
              </Typography>
              <IconButton onClick={handleNext}>
                <ArrowForwardIos />
              </IconButton>
              <Button variant="outlined" onClick={handleToday} sx={{ ml: 2 }}>
                今日
              </Button>
            </>
          )}
          {displayMode === "list" && (
            <Typography variant="h5">予約リスト</Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Button
            variant="contained"
            onClick={() => openSpecialReservationForm()}
            sx={{ mr: 2 }}
          >
            特別予約登録
          </Button>
          <ButtonGroup variant="contained" aria-label="display mode button group">
            <Button
              onClick={() => setDisplayMode("weekly")}
              disabled={displayMode === "weekly"}
            >
              週
            </Button>
            <Button
              onClick={() => setDisplayMode("calendar")}
              disabled={displayMode === "calendar"}
            >
              月
            </Button>
            <Button
              onClick={() => setDisplayMode("list")}
              disabled={displayMode === "list"}
            >
              リスト
            </Button>
          </ButtonGroup>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {displayMode === "list" && (
            <AppointmentListTable
              appointments={appointments}
              sortConfig={sortConfig}
              handleRequestSort={handleRequestSort}
              selectedAppointments={selectedAppointments}
              handleSelectAllClick={handleSelectAllClick}
              handleSelectClick={handleSelectClick}
              handleBulkDelete={handleBulkDelete}
              bulkActionEnabled={bulkActionEnabled}
              setBulkActionEnabled={setBulkActionEnabled}
              handleEditAppointment={handleEditAppointment}
              handleEditSpecialAppointment={openSpecialReservationForm}
              handleDeleteAppointment={handleDeleteAppointment}
              userRole={user?.role}
              view={view}
              setView={setView}
            />
          )}

          {displayMode === "calendar" && (
            <CalendarView
              appointments={appointments}
              blockedSlots={blockedSlots}
              currentMonth={currentDate}
            />
          )}

          {displayMode === "weekly" && (
            <WeeklyCalendarView
              appointments={appointments}
              blockedSlots={blockedSlots}
              currentDate={currentDate}
              onSlotClick={handleWeeklySlotClick}
              onEditAppointment={handleEditAppointment}
              onEditSpecialAppointment={openSpecialReservationForm}
              onDeleteAppointment={handleDeleteAppointment}
              canEdit={user?.role !== "viewer"}
            />
          )}
        </>
      )}

      <Dialog open={isReservationFormOpen} onClose={closeReservationForm}>
        <DialogTitle>
          {reservationFormAppointment ? "予約編集" : "新規予約登録"}
        </DialogTitle>
        <DialogContent>
          <ReservationForm
            onFormSubmit={handleFormSubmit}
            blockedSlots={blockedSlots}
            appointment={reservationFormAppointment}
            initialDate={reservationFormInitialDate}
            initialTime={reservationFormInitialTime}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReservationForm}>キャンセル</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isBlockedSlotFormOpen} onClose={closeBlockedSlotForm}>
        <DialogTitle>予約不可時間帯登録</DialogTitle>
        <DialogContent>
          <BlockedSlotForm
            onFormSubmit={() => {
              fetchData();
              closeBlockedSlotForm();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBlockedSlotForm}>キャンセル</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isSpecialReservationFormOpen}
        onClose={closeSpecialReservationForm}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingSpecialAppointment ? "特別予約編集" : "特別予約登録"}
        </DialogTitle>
        <DialogContent>
          <SpecialReservationForm
            onFormSubmit={() => {
              fetchData();
              closeSpecialReservationForm();
            }}
            appointment={editingSpecialAppointment}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSpecialReservationForm}>キャンセル</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HomePage;