import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Container,
  CssBaseline,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Checkbox,
  TableSortLabel,
  Backdrop,
} from '@mui/material';
import { ArrowBackIos, ArrowForwardIos, Edit, Delete } from '@mui/icons-material';
import ReservationForm from './ReservationForm';
import CalendarView from './CalendarView';
import WeeklyCalendarView from './WeeklyCalendarView';
import BlockedSlotForm from './BlockedSlotForm';
import LoginPage from './LoginPage';
import ForcePasswordChangePage from './ForcePasswordChangePage';

import Header from './Header';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import dayjs, { Dayjs } from 'dayjs';
import BlockedSlotManagementPage from './BlockedSlotManagementPage';
import UserManagementPage from './UserManagementPage';
import ManualPage from './ManualPage';


// --- Interfaces ---
interface Appointment {
  id: number;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  consultation: string;
  lastUpdatedBy?: string;
  isDeleted?: boolean;
}

interface BlockedSlot {
  id: number;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

type DisplayMode = 'list' | 'calendar' | 'weekly';
type Order = 'asc' | 'desc';

interface SortConfig {
  key: keyof Appointment;
  direction: Order;
}

// --- Protected Route Component ---
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// --- Home Page Component (Old App Logic) ---
const HomePage = () => {
  const { isAuthenticated, token, user } = useAuth();
  const { isReservationFormOpen, closeReservationForm, isBlockedSlotFormOpen, closeBlockedSlotForm, openReservationForm, showLoader, hideLoader, reservationFormAppointment, reservationFormInitialDate, reservationFormInitialTime } = useUI();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [view, setView] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('weekly');
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'date', direction: 'asc' });
  const [selectedAppointments, setSelectedAppointments] = useState<number[]>([]);
  const [bulkActionEnabled, setBulkActionEnabled] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/appointments').then(res => res.json()),
      fetch('/api/blocked-slots').then(res => res.json())
    ]).then(([appointmentData, blockedSlotData]) => {
      setAppointments(appointmentData);
      setBlockedSlots(blockedSlotData);
      setLoading(false);
    }).catch(error => {
      console.error('Error fetching data:', error);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = () => {
    fetchData();
  };

  const handleEditAppointment = (appointment: Appointment) => {
    openReservationForm(appointment);
  };

  const handleDeleteAppointment = async (id: number) => {
    if (window.confirm('この予約を削除してもよろしいですか？')) {
      showLoader(); // ローディング開始
      try {
        const response = await fetch(`/api/appointments/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          fetchData();
        } else {
          const errorData = await response.json();
          console.error('Failed to delete appointment:', errorData.message);
          alert(`予約の削除に失敗しました: ${errorData.message}`);
        }
      } catch (error) {
        console.error('Failed to delete appointment', error);
        alert('予約の削除中にエラーが発生しました。');
      } finally {
        hideLoader(); // ローディング終了
      }
    }
  };

  const handlePrev = () => {
    const newDate = displayMode === 'calendar' ? currentDate.subtract(1, 'month') : currentDate.subtract(1, 'week');
    setCurrentDate(newDate);
  };
  const handleNext = () => {
    const newDate = displayMode === 'calendar' ? currentDate.add(1, 'month') : currentDate.add(1, 'week');
    setCurrentDate(newDate);
  };
  const handleToday = () => setCurrentDate(dayjs());

  const handleRequestSort = (key: keyof Appointment) => {
    let direction: Order = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
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
        selectedAppointments.slice(selectedIndex + 1),
      );
    }
    setSelectedAppointments(newSelected as number[]);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`${selectedAppointments.length}件の予約を削除してもよろしいですか？`)) {
      showLoader(); // ローディング開始
      try {
        const promises = selectedAppointments.map(id =>
          fetch(`/api/appointments/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          })
        );
        const responses = await Promise.all(promises);
        const failedDeletes = responses.filter(res => !res.ok);

        if (failedDeletes.length > 0) {
          alert(`${failedDeletes.length}件の予約削除に失敗しました。`);
        }
        fetchData();
        setSelectedAppointments([]);
        setBulkActionEnabled(false);
      } catch (error) {
        console.error('Failed to bulk delete appointments', error);
        alert('予約の一括削除中にエラーが発生しました。');
      } finally {
        hideLoader(); // ローディング終了
      }
    }
  };

  const isSelected = (id: number) => selectedAppointments.indexOf(id) !== -1;

  const handleWeeklySlotClick = (date: Dayjs, time: string) => {
    if (!isAuthenticated) return alert('ログインしてください。');
    openReservationForm(null, date, time);
  };

  const sortedAppointments = useMemo(() => {
    let sortableItems = [...appointments.filter(app => !app.isDeleted)];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'date' || sortConfig.key === 'time') {
          const aDateTime = dayjs(`${a.date} ${a.time}`);
          const bDateTime = dayjs(`${b.date} ${b.time}`);
          if (aDateTime.isBefore(bDateTime)) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (aDateTime.isAfter(bDateTime)) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return 0;
        }

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [appointments, sortConfig]);

  const filteredAppointments = sortedAppointments.filter(app => {
    return !app.isDeleted && (
      view === 'all' ||
      (view === 'daily' && dayjs(app.date).isSame(dayjs(), 'day')) ||
      (view === 'weekly' && dayjs(app.date).isAfter(dayjs().startOf('week')) && dayjs(app.date).isBefore(dayjs().endOf('week'))) ||
      (view === 'monthly' && dayjs(app.date).isSame(dayjs(), 'month'))
    );
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 0 } }}>
          {(displayMode === 'calendar' || displayMode === 'weekly') && (
            <>
              <IconButton onClick={handlePrev}><ArrowBackIos /></IconButton>
              <Typography variant="h5" sx={{ mx: 2 }}>
                {displayMode === 'calendar'
                  ? currentDate.format('YYYY年 M月')
                  : `${currentDate.startOf('week').format('YYYY年 M月D日')} - ${currentDate.endOf('week').format('M月D日')}`}
              </Typography>
              <IconButton onClick={handleNext}><ArrowForwardIos /></IconButton>
              <Button variant="outlined" onClick={handleToday} sx={{ ml: 2 }}>今日</Button>
            </>
          )}
          {displayMode === 'list' && <Typography variant="h5">予約リスト</Typography>}
        </Box>
        <ButtonGroup variant="contained" aria-label="display mode button group">
          <Button onClick={() => setDisplayMode('weekly')} disabled={displayMode === 'weekly'}>週</Button>
          <Button onClick={() => setDisplayMode('calendar')} disabled={displayMode === 'calendar'}>月</Button>
          <Button onClick={() => setDisplayMode('list')} disabled={displayMode === 'list'}>リスト</Button>
        </ButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          {displayMode === 'list' && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <ButtonGroup variant="contained" aria-label="outlined primary button group">
                  <Button onClick={() => setView('daily')} disabled={view === 'daily'}>今日</Button>
                  <Button onClick={() => setView('weekly')} disabled={view === 'weekly'}>週間</Button>
                  <Button onClick={() => setView('monthly')} disabled={view === 'monthly'}>月間</Button>
                  <Button onClick={() => setView('all')} disabled={view === 'all'}>全て</Button>
                </ButtonGroup>
                <Box>
                  {user?.role !== 'viewer' && bulkActionEnabled && selectedAppointments.length > 0 && (
                    <Button variant="contained" color="secondary" onClick={handleBulkDelete} sx={{ mr: 1 }}>
                      選択した項目を削除
                    </Button>
                  )}
                  {user?.role !== 'viewer' && (
                    <Button variant="outlined" onClick={() => setBulkActionEnabled(!bulkActionEnabled)}>
                      {bulkActionEnabled ? 'キャンセル' : '一括操作'}
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
                            indeterminate={selectedAppointments.length > 0 && selectedAppointments.length < sortedAppointments.length}
                            checked={sortedAppointments.length > 0 && selectedAppointments.length === sortedAppointments.length}
                            onChange={handleSelectAllClick}
                          />
                        </TableCell>
                      )}
                      <TableCell sortDirection={sortConfig?.key === 'date' ? sortConfig.direction : false}>
                        <TableSortLabel
                          active={sortConfig?.key === 'date'}
                          direction={sortConfig?.key === 'date' ? sortConfig.direction : 'asc'}
                          onClick={() => handleRequestSort('date')}
                        >
                          日付
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sortDirection={sortConfig?.key === 'time' ? sortConfig.direction : false}>
                        <TableSortLabel
                          active={sortConfig?.key === 'time'}
                          direction={sortConfig?.key === 'time' ? sortConfig.direction : 'asc'}
                          onClick={() => handleRequestSort('time')}
                        >
                          時間
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>患者ID</TableCell>
                      <TableCell>患者名</TableCell>
                      <TableCell>診察内容</TableCell>
                      {user?.role !== 'viewer' && <TableCell>最終更新者</TableCell>}
                      {user?.role !== 'viewer' && <TableCell>操作</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAppointments.map((row) => {
                      const isItemSelected = isSelected(row.id);
                      return (
                        <TableRow
                          key={row.id}
                          hover
                          onClick={(event) => bulkActionEnabled && handleSelectClick(event, row.id)}
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
                          <TableCell>{row.time}</TableCell>
                          <TableCell>{row.patientId}</TableCell>
                          <TableCell>{row.patientName}</TableCell>
                          <TableCell>{row.consultation}</TableCell>
                          {user?.role !== 'viewer' && <TableCell>{row.lastUpdatedBy || '-'}</TableCell>}
                          {user?.role !== 'viewer' && (
                            <TableCell>
                              <IconButton onClick={() => handleEditAppointment(row)} disabled={user?.role === 'viewer'}><Edit /></IconButton>
                              <IconButton onClick={() => handleDeleteAppointment(row.id)} disabled={user?.role === 'viewer'}><Delete /></IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {displayMode === 'calendar' && (
            <CalendarView appointments={appointments} blockedSlots={blockedSlots} currentMonth={currentDate} />
          )}

          {displayMode === 'weekly' && (
            <WeeklyCalendarView
              appointments={appointments}
              blockedSlots={blockedSlots}
              currentDate={currentDate}
              onSlotClick={handleWeeklySlotClick}
              onEditAppointment={handleEditAppointment}
              onDeleteAppointment={handleDeleteAppointment}
              canEdit={user?.role !== 'viewer'}
            />
          )}
        </>
      )}

      <Dialog open={isReservationFormOpen} onClose={closeReservationForm}>
        <DialogTitle>{reservationFormAppointment ? '予約編集' : '新規予約登録'}</DialogTitle>
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
          <BlockedSlotForm onFormSubmit={() => { fetchData(); closeBlockedSlotForm(); }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBlockedSlotForm}>キャンセル</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// --- Main App Component (Routing) ---
function App() {
  const { isLoading } = useUI();

  return (
    <>
      <CssBaseline />
      <Header />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/blocked" element={<ProtectedRoute><BlockedSlotManagementPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
        <Route path="/force-password-change" element={<ProtectedRoute><ForcePasswordChangePage /></ProtectedRoute>} />
        <Route path="/manual/:manualType" element={<ProtectedRoute><ManualPage /></ProtectedRoute>} />
      </Routes>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}

export default App;
