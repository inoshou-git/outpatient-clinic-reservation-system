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
  ListItemText,
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
import 'dayjs/locale/ja';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const consultationOptions = [
  "新患",
  "定期処方",
  "生活習慣",
  "入職時健診",
  "インフルエンザ",
  "肺炎球菌",
  "コロナ",
  "帯状疱疹(生ワクチン)",
  "帯状疱疹(シングリックス1回目)",
  "帯状疱疹(シングリックス2回目)",
  "採血のみ",
  "整形",
  "特定健診",
  "企業健診",
  "健康診断",
  "VF",
  "その他",
];

interface AppointmentListTableProps {
  appointments: Appointment[];
  sortConfig: { key: keyof Appointment; direction: "asc" | "desc" } | null;
  handleRequestSort: (key: keyof Appointment) => void;
  selectedAppointments: number[];
  handleSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectClick: (event: React.MouseEvent<unknown>, id: number) => void;
  handleBulkUpdate: (consultation: string) => void;
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
  handleBulkUpdate,
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
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newConsultation, setNewConsultation] = useState<string[]>([]);
  const [consultationSelectOpen, setConsultationSelectOpen] = useState(false);
  const [filterReservationType, setFilterReservationType] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);

  const formatConsultation = (consultation: string | undefined | null): string => {
    if (!consultation) return "-";
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

  const handleOpenUpdateDialog = () => {
    setNewConsultation([]); // ダイアログを開くときにクリア
    setUpdateDialogOpen(true);
  };

  const handleCloseUpdateDialog = () => {
    setUpdateDialogOpen(false);
  };

  const handleConfirmBulkUpdate = async () => {
    if (newConsultation.length === 0) {
      // 何か通知するか、UIでフィードバック
      console.log("診察内容を選択してください。");
      return;
    }
    showLoader();
    try {
      await handleBulkUpdate(newConsultation.join(', '));
    } catch (error) {
      console.error("Failed to bulk update appointments", error);
    } finally {
      hideLoader();
      handleCloseUpdateDialog();
    }
  };

  const handleClearFilters = () => {
    setFilterReservationType("all");
    setFilterStartDate(null);
    setFilterEndDate(null);
  };

  const sortedAppointments = React.useMemo(() => {
    let sortableItems = [...appointments.filter((app) => !app.isDeleted)];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === "date" || sortConfig.key === "time") {
          // Determine the time to use for comparison based on reservation type
          const getTimeForSort = (appt: Appointment) => {
            // For any appointment with a start time range, use that for sorting.
            if (appt.startTimeRange) {
              return appt.startTimeRange;
            }
            // Otherwise, use the single time field.
            return appt.time;
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

        if (sortConfig.key === "lastUpdatedAt") {
          if (!a.lastUpdatedAt) return 1;
          if (!b.lastUpdatedAt) return -1;
          const aDate = dayjs(a.lastUpdatedAt);
          const bDate = dayjs(b.lastUpdatedAt);
          if (aDate.isBefore(bDate)) {
            return sortConfig.direction === "asc" ? -1 : 1;
          }
          if (aDate.isAfter(bDate)) {
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

  const filteredAppointments = React.useMemo(() => {
    return sortedAppointments.filter((app) => {
      // Existing view filter
      const matchesView =
        !app.isDeleted &&
        (view === "all" ||
          (view === "daily" && dayjs(app.date).isSame(dayjs(), "day")) ||
          (view === "weekly" &&
            dayjs(app.date).isAfter(dayjs().startOf("week")) &&
            dayjs(app.date).isBefore(dayjs().endOf("week"))) ||
          (view === "monthly" && dayjs(app.date).isSame(dayjs(), "month")));

      if (!matchesView) return false;

      // Filter by Reservation Type
      const matchesReservationType =
        filterReservationType === "all" ||
        app.reservationType === filterReservationType;

      if (!matchesReservationType) return false;

      // Filter by Date Range
      const appDate = dayjs(app.date);
      const matchesDateRange =
        (!filterStartDate || appDate.isSameOrAfter(filterStartDate, "day")) &&
        (!filterEndDate || appDate.isSameOrBefore(filterEndDate, "day"));

      return matchesDateRange;
    });
  }, [sortedAppointments, view, filterReservationType, filterStartDate, filterEndDate]);

  return (
    <div className="printable-area">
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
          }
        `}
      </style>
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
                color="primary"
                onClick={handleOpenUpdateDialog}
                sx={{ mr: 1 }}
              >
                選択した項目を更新
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

      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel size="small">予約種別</InputLabel>
          <Select
            value={filterReservationType}
            label="予約種別"
            onChange={(e) => setFilterReservationType(e.target.value as string)}
            size="small"
          >
            <MenuItem value="all">全て</MenuItem>
            <MenuItem value="outpatient">外来診療</MenuItem>
            <MenuItem value="visit">訪問診療</MenuItem>
            <MenuItem value="rehab">通所リハ会議</MenuItem>
            <MenuItem value="special">特別予約</MenuItem>
          </Select>
        </FormControl>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
          <DatePicker
            label="開始日"
            value={filterStartDate}
            onChange={(newValue) => setFilterStartDate(newValue)}
            format="YYYY/MM/DD"
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="終了日"
            value={filterEndDate}
            onChange={(newValue) => setFilterEndDate(newValue)}
            format="YYYY/MM/DD"
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
        <Button
          variant="outlined"
          onClick={handleClearFilters}
          sx={{ height: '40px' }} // Adjust height to match small size inputs
        >
          クリア
        </Button>
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
              <TableCell>患者ID</TableCell>
              <TableCell>患者名/施設名</TableCell>
              <TableCell>診察内容</TableCell>
              {userRole !== "viewer" && <TableCell>最終更新者</TableCell>}
              {userRole !== "viewer" && <TableCell
                sortDirection={
                  sortConfig?.key === "lastUpdatedAt" ? sortConfig.direction : false
                }
              >
                <TableSortLabel
                  active={sortConfig?.key === "lastUpdatedAt"}
                  direction={
                    sortConfig?.key === "lastUpdatedAt" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleRequestSort("lastUpdatedAt")}
                >
                  最終更新日
                </TableSortLabel>
              </TableCell>}
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
                    {row.startTimeRange && row.endTimeRange
                      ? `${row.startTimeRange} - ${row.endTimeRange}`
                      : row.time}
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
                    {row.patientId || "-"}
                  </TableCell>
                  <TableCell>
                    {row.patientName || "-"}
                  </TableCell>
                  <TableCell>
                    {row.reservationType === "special"
                      ? row.reason
                      : formatConsultation(row.consultation)}
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

      <Dialog open={updateDialogOpen} onClose={handleCloseUpdateDialog}>
        <DialogTitle>診察内容の一括更新</DialogTitle>
        <DialogContent>
          <DialogContentText>
            選択したすべての予約の診察内容を更新します。
          </DialogContentText>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>新しい診察内容</InputLabel>
            <Select
              multiple
              value={newConsultation}
              label="新しい診察内容"
              open={consultationSelectOpen}
              onOpen={() => setConsultationSelectOpen(true)}
              onClose={() => setConsultationSelectOpen(false)}
              onChange={(e) => setNewConsultation(e.target.value as string[])}
              renderValue={(selected) => selected.join(', ')}
            >
              {consultationOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  <Checkbox checked={newConsultation.indexOf(option) > -1} />
                  <ListItemText primary={option} />
                </MenuItem>
              ))}
              <Box sx={{ position: 'sticky', bottom: 0, background: 'white', p: 1, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #ddd' }}>
                  <Button size="small" onClick={() => setConsultationSelectOpen(false)}>閉じる</Button>
              </Box>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUpdateDialog}>キャンセル</Button>
          <Button onClick={handleConfirmBulkUpdate} color="primary">
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AppointmentListTable;