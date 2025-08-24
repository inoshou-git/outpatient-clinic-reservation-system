import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  ButtonGroup,
  Button,
  Checkbox,
  TableSortLabel,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { Appointment } from "../types";
import { useUI } from "../contexts/UIContext";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface AppointmentListTableProps {
  appointments: Appointment[];
  sortConfig: { key: keyof Appointment; direction: "asc" | "desc" } | null;
  handleRequestSort: (key: keyof Appointment) => void;
  selectedAppointments: number[];
  handleSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectClick: (event: React.MouseEvent<unknown>, id: number) => void;
  handleBulkDelete: () => void;
  bulkActionEnabled: boolean;
  setBulkActionEnabled: (enabled: boolean) => void;
  handleEditAppointment: (appointment: Appointment) => void;
  handleEditSpecialAppointment: (appointment: Appointment) => void;
  handleDeleteAppointment: (id: number, sendNotification: boolean) => Promise<void>;
  userRole?: string;
  view: "all" | "daily" | "weekly" | "monthly";
  setView: (view: "all" | "daily" | "weekly" | "monthly") => void;
}

const AppointmentListTable: React.FC<AppointmentListTableProps> = ( {
  appointments,
  sortConfig,
  handleRequestSort,
  selectedAppointments,
  handleSelectAllClick,
  handleSelectClick,
  handleBulkDelete,
  bulkActionEnabled,
  setBulkActionEnabled,
  handleEditAppointment,
  handleEditSpecialAppointment,
  handleDeleteAppointment,
  userRole,
  view,
  setView,
}): JSX.Element => {
  const { showLoader, hideLoader } = useUI();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [sendNotification, setSendNotification] = useState(false);
  const [filterReservationType, setFilterReservationType] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);

  const isSelected = (id: number) => selectedAppointments.indexOf(id) !== -1;

  const handleOpenDeleteDialog = (id: number) => {
    setItemToDelete(id);
    setSendNotification(false); // Reset to default
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setItemToDelete(null);
    setDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete === null) return;

    showLoader();
    try {
      await handleDeleteAppointment(itemToDelete, sendNotification);
    } catch (error) {
      console.error("Failed to delete appointment from list view", error);
    } finally {
      hideLoader();
      handleCloseDialog();
    }
  };

  const sortedAppointments = React.useMemo(() => {
    let sortableItems = [...appointments.filter((app) => !app.isDeleted)];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === "date" || sortConfig.key === "time") {
          // Determine the time to use for comparison based on reservation type
          const getTimeForSort = (appt: Appointment) => {
            if (appt.reservationType === "outpatient" || appt.reservationType === "special") {
              return appt.time;
            }
            // For visit/rehab, use startTimeRange for time-based sorting
            if (appt.reservationType === "visit" || appt.reservationType === "rehab") {
              return appt.startTimeRange;
            }
            return undefined; // Should not happen if types are correct
          };

          const aTime = getTimeForSort(a);
          const bTime = getTimeForSort(b);

          // Construct dayjs objects, handling cases where time might be missing
          const aDateTime = dayjs(`${a.date} ${aTime || '00:00'}`); // Default to '00:00' if time is missing
          const bDateTime = dayjs(`${b.date} ${bTime || '00:00'}`); // Default to '00:00' if time is missing

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
    <>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between" }}>
        <ButtonGroup
          variant="contained"
          aria-label="outlined primary button group"
        >
          <Button onClick={() => setView("daily")} disabled={view === "daily"}>
            今日
          </Button>
          <Button
            onClick={() => setView("weekly")}
            disabled={view === "weekly"}
          >
            週間
          </Button>
          <Button
            onClick={() => setView("monthly")}
            disabled={view === "monthly"}
          >
            月間
          </Button>
          <Button onClick={() => setView("all")} disabled={view === "all"}>
            全て
          </Button>
        </ButtonGroup>
        <Box>
          {userRole !== "viewer" &&
            bulkActionEnabled &&
            selectedAppointments.length > 0 && (
              <Button
                variant="contained"
                color="secondary"
                onClick={handleBulkDelete}
                sx={{ mr: 1 }}
              >
                選択した項目を削除
              </Button>
            )}
          {userRole !== "viewer" && (
            <Button
              variant="outlined"
              onClick={() => setBulkActionEnabled(!bulkActionEnabled)}
            >
              {bulkActionEnabled ? "キャンセル" : "一括操作"}
            </Button>
          )}
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              {bulkActionEnabled && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedAppointments.length > 0 &&
                      selectedAppointments.length < sortedAppointments.length
                    }
                    checked={
                      sortedAppointments.length > 0 &&
                      selectedAppointments.length === sortedAppointments.length
                    }
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
              )}
              <TableCell
                sortDirection={
                  sortConfig?.key === "date" ? sortConfig.direction : false
                }
              >
                <TableSortLabel
                  active={sortConfig?.key === "date"}
                  direction={
                    sortConfig?.key === "date" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleRequestSort("date")}
                >
                  日付
                </TableSortLabel>
              </TableCell>
              <TableCell
                sortDirection={
                  sortConfig?.key === "time" ? sortConfig.direction : false
                }
              >
                <TableSortLabel
                  active={sortConfig?.key === "time"}
                  direction={
                    sortConfig?.key === "time" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleRequestSort("time")}
                >
                  時間
                </TableSortLabel>
              </TableCell>
              <TableCell>予約種別</TableCell>
              <TableCell>患者ID/施設名</TableCell>
              <TableCell>患者名</TableCell>
              <TableCell>診察内容</TableCell>
              {userRole !== "viewer" && <TableCell>最終更新者</TableCell>}
              {userRole !== "viewer" && <TableCell>最終更新日</TableCell>}
              {userRole !== "viewer" && <TableCell>操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAppointments.map((row) => {
              const isItemSelected = isSelected(row.id);
              return (
                <TableRow
                  key={row.id}
                  hover
                  onClick={(event) =>
                    bulkActionEnabled && handleSelectClick(event, row.id)
                  }
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
                  <TableCell>{row.date}</TableCell>
                  <TableCell>
                    {(row.reservationType === "outpatient" ||
                      row.reservationType === "special") &&
                      row.time}
                    {(row.reservationType === "visit" ||
                      row.reservationType === "rehab") &&
                      `${row.startTimeRange} - ${row.endTimeRange}`}
                  </TableCell>
                  <TableCell>
                    {row.reservationType === "outpatient"
                      ? "外来診療"
                      : row.reservationType === "visit"
                      ? "訪問診療"
                      : row.reservationType === "rehab"
                      ? "通所リハ会議"
                      : row.reservationType === "special"
                      ? "特別予約"
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {row.reservationType === "outpatient" ||
                    row.reservationType === "special"
                      ? row.patientId
                      : row.facilityName || "-"}
                  </TableCell>
                  <TableCell>{row.patientName || "-"}</TableCell>
                  <TableCell>
                    {row.reservationType === "special"
                      ? row.reason
                      : row.consultation || "-"}
                  </TableCell>
                  {userRole !== "viewer" && (
                    <TableCell>{row.lastUpdatedBy || "-"}</TableCell>
                  )}
                  {userRole !== "viewer" && (
                    <TableCell>
                      {row.lastUpdatedAt ? dayjs(row.lastUpdatedAt).format("YYYY-MM-DD HH:mm") : "-"}
                    </TableCell>
                  )}
                  {userRole !== "viewer" && (
                    <TableCell>
                      <IconButton
                        onClick={() =>
                          row.reservationType === "special"
                            ? handleEditSpecialAppointment(row)
                            : handleEditAppointment(row)
                        }
                        disabled={userRole === "viewer"}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        onClick={() => handleOpenDeleteDialog(row.id)}
                        disabled={userRole === "viewer"}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>予約の削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            本当にこの予約を削除してもよろしいですか？
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
              />
            }
            label="関係者に通知する"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button onClick={handleConfirmDelete} color="secondary">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AppointmentListTable;