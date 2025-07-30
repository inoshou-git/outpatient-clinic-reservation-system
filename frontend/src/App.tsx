import React, { useEffect, useState, useCallback } from 'react';
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
} from '@mui/material';
import { ArrowBackIos, ArrowForwardIos, Edit, Delete } from '@mui/icons-material';
import ReservationForm from './ReservationForm';
import CalendarView from './CalendarView';
import WeeklyCalendarView from './WeeklyCalendarView';
import BlockedSlotForm from './BlockedSlotForm';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import Header from './Header';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import dayjs, { Dayjs } from 'dayjs';
import BlockedSlotManagementPage from './BlockedSlotManagementPage';
import UserManagementPage from './UserManagementPage';

// --- Interfaces ---
interface Appointment {
  id: number;
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

// --- Protected Route Component ---
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// --- Home Page Component (Old App Logic) ---
const HomePage = () => {
  const { isAuthenticated, token, user } = useAuth();
  const { isReservationFormOpen, closeReservationForm, isBlockedSlotFormOpen, closeBlockedSlotForm, openReservationForm } = useUI();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [view, setView] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('weekly');
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [selectedDateForForm, setSelectedDateForForm] = useState<Dayjs | null>(null);
  const [selectedTimeForForm, setSelectedTimeForForm] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('process.env.REACT_APP_API_BASE_URL/api/appointments').then(res => res.json()),
      fetch('process.env.REACT_APP_API_BASE_URL/api/blocked-slots').then(res => res.json())
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
    closeReservationForm();
    setEditingAppointment(null);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    openReservationForm();
  };

  const handleDeleteAppointment = async (id: number) => {
    if (window.confirm('この予約を削除してもよろしいですか？')) {
      try {
        const response = await fetch(`process.env.REACT_APP_API_BASE_URL/api/appointments/${id}`, {
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

  const handleWeeklySlotClick = (date: Dayjs, time: string) => {
    if (!isAuthenticated) return alert('ログインしてください。');
    setEditingAppointment(null);
    setSelectedDateForForm(date);
    setSelectedTimeForForm(time);
    openReservationForm();
  };

  const filteredAppointments = appointments.filter(app => {
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
                {currentDate.format(displayMode === 'calendar' ? 'YYYY年 M月' : 'YYYY年 M月D日')} - {currentDate.endOf(displayMode === 'weekly' ? 'week' : 'month').format('M月D日')}
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
              <Box sx={{ mb: 2 }}>
                <ButtonGroup variant="contained" aria-label="outlined primary button group">
                  <Button onClick={() => setView('daily')} disabled={view === 'daily'}>今日</Button>
                  <Button onClick={() => setView('weekly')} disabled={view === 'weekly'}>週間</Button>
                  <Button onClick={() => setView('monthly')} disabled={view === 'monthly'}>月間</Button>
                  <Button onClick={() => setView('all')} disabled={view === 'all'}>全て</Button>
                </ButtonGroup>
              </Box>
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>日付</TableCell>
                      <TableCell>時間</TableCell>
                      <TableCell>患者名</TableCell>
                      <TableCell>診察内容</TableCell>
                      {user?.role !== 'viewer' && <TableCell>最終更新者</TableCell>}
                      {user?.role !== 'viewer' && <TableCell>操作</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAppointments.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell component="th" scope="row">{row.id}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.time}</TableCell>
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
                    ))}
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
        <DialogTitle>{editingAppointment ? '予約編集' : '新規予約登録'}</DialogTitle>
        <DialogContent>
          <ReservationForm
            onFormSubmit={handleFormSubmit}
            blockedSlots={blockedSlots}
            appointment={editingAppointment}
            initialDate={selectedDateForForm}
            initialTime={selectedTimeForForm}
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
  return (
    <>
      <CssBaseline />
      <Header />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/blocked" element={<ProtectedRoute><BlockedSlotManagementPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

export default App;
