import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isEqual, isWithinInterval, isAfter, isBefore } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { sendEmail } from './emailService';
import dotenv from 'dotenv';

const app = express();
const port = 3001;

dotenv.config();

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, '../db.json');

// --- Data Store ---
let appointments: any[] = [];
let blockedSlots: any[] = [];
let users: any[] = [];

const loadData = () => {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    const jsonData = JSON.parse(data);
    appointments = jsonData.appointments || [];
    blockedSlots = jsonData.blockedSlots || [];
    users = jsonData.users || [];
  } catch (error) {
    console.error('Error reading db.json, starting with empty data.', error);
    appointments = [];
    blockedSlots = [];
    users = [];
  }
};

const saveData = () => {
  try {
    const data = JSON.stringify({ appointments, blockedSlots, users }, null, 2);
    fs.writeFileSync(dbPath, data, 'utf-8');
  } catch (error) {
    console.error('Error writing to db.json', error);
  }
};

loadData();

// --- Middleware for Authentication ---
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  const user = users.find(u => u.userId === token);
  if (!user) return res.sendStatus(403);

  (req as any).user = user;
  next();
};

// --- Email Notification Helper ---
const notifyUsers = async (subject: string, text: string, html: string) => {
  const recipients = users.filter(u => u.email && !u.isDeleted).map(u => u.email);
  if (recipients.length > 0) {
    await sendEmail(recipients.join(','), subject, text, html);
  }
};

// --- API Endpoints ---

// User Registration
app.post('/api/register', (req: Request, res: Response) => {
  const { userId, password, name, department, email } = req.body;
  if (!userId || !password || !name || !department || !email) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (users.find(u => u.userId === userId)) {
    return res.status(409).json({ message: 'User ID already exists' });
  }
  const newUser = { userId, password, name, department, email, role: 'user', isDeleted: false };
  users.push(newUser);
  saveData();
  res.status(201).json({ userId, name, department, email, role: 'user', isDeleted: false });
});

// User Login
app.post('/api/login', (req: Request, res: Response) => {
  const { userId, password } = req.body;
  const user = users.find(u => u.userId === userId && u.password === password && !u.isDeleted);
  if (user) {
    res.json({ token: user.userId, user: { userId: user.userId, name: user.name, department: user.department, role: user.role, email: user.email } });
  } else {
    res.status(401).json({ message: 'Invalid credentials or user deleted' });
  }
});

// Get current user info
app.get('/api/me', authenticateToken, (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user && !user.isDeleted) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found or deleted' });
    }
});

// Get all users
app.get('/api/users', authenticateToken, (req: Request, res: Response) => {
  res.json(users.filter(u => !u.isDeleted).map(({ password, ...user }) => user));
});

// Update a user
app.put('/api/users/:userId', authenticateToken, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, department, password, role, email } = req.body;
  const userIndex = users.findIndex(u => u.userId === userId);

  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], name, department, password: password || users[userIndex].password, role: role || users[userIndex].role, email };
    saveData();
    const { password: _, ...updatedUser } = users[userIndex];
    res.json(updatedUser);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// Delete a user
app.delete('/api/users/:userId', authenticateToken, (req: Request, res: Response) => {
  const { userId } = req.params;
  const userIndex = users.findIndex(u => u.userId === userId);
  const lastUpdatedBy = (req as any).user.name;

  if (userIndex !== -1) {
    users[userIndex].isDeleted = true;
    users[userIndex].lastUpdatedBy = lastUpdatedBy;
    saveData();
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// Get all appointments
app.get('/api/appointments', (req: Request, res: Response) => {
  res.json(appointments.filter(a => !a.isDeleted));
});

// Get all blocked slots
app.get('/api/blocked-slots', (req: Request, res: Response) => {
  res.json(blockedSlots.filter(s => !s.isDeleted));
});

// Create a new appointment
app.post('/api/appointments', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role === 'viewer') {
    return res.status(403).json({ message: '閲覧ユーザーは予約を作成できません。' });
  }
  const { patientName, date, time, consultation, sendNotification } = req.body;
  const lastUpdatedBy = (req as any).user.name;

  const newId = appointments.length > 0 ? Math.max(...appointments.map(a => a.id)) + 1 : 1;
  const newAppointment = { id: newId, patientName, date, time, consultation, lastUpdatedBy, isDeleted: false };
  appointments.push(newAppointment);
  saveData();

  if (sendNotification) {
    const subject = '新規予約登録のお知らせ';
    const text = `新しい予約が登録されました。\n患者名: ${patientName}\n日時: ${date} ${time}\n担当: ${lastUpdatedBy}`;
    const html = `<p>新しい予約が登録されました。</p><ul><li>患者名: ${patientName}</li><li>日時: ${date} ${time}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
    await notifyUsers(subject, text, html);
  }

  res.status(201).json(newAppointment);
});

// Update an appointment
app.put('/api/appointments/:id', authenticateToken, async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは予約を更新できません。' });
    }
    const id = parseInt(req.params.id, 10);
    const { patientName, date, time, consultation, sendNotification } = req.body;
    const lastUpdatedBy = (req as any).user.name;
    const appointmentIndex = appointments.findIndex(a => a.id === id);

    if (appointmentIndex !== -1) {
        appointments[appointmentIndex] = { ...appointments[appointmentIndex], patientName, date, time, consultation, lastUpdatedBy };
        saveData();

        if (sendNotification) {
          const subject = '予約更新のお知らせ';
          const text = `予約が更新されました。\n患者名: ${patientName}\n日時: ${date} ${time}\n担当: ${lastUpdatedBy}`;
          const html = `<p>予約が更新されました。</p><ul><li>患者名: ${patientName}</li><li>日時: ${date} ${time}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
          await notifyUsers(subject, text, html);
        }

        res.json(appointments[appointmentIndex]);
    } else {
        res.status(404).json({ message: 'Appointment not found' });
    }
});

// Delete an appointment
app.delete('/api/appointments/:id', authenticateToken, async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは予約を削除できません。' });
    }
    const id = parseInt(req.params.id, 10);
    const appointmentIndex = appointments.findIndex(a => a.id === id);
    const lastUpdatedBy = (req as any).user.name;

    if (appointmentIndex !== -1) {
        const deletedAppointment = appointments[appointmentIndex];
        appointments[appointmentIndex].isDeleted = true;
        appointments[appointmentIndex].lastUpdatedBy = lastUpdatedBy;
        saveData();

        const subject = '予約削除のお知らせ';
        const text = `予約が削除されました。\n患者名: ${deletedAppointment.patientName}\n日時: ${deletedAppointment.date} ${deletedAppointment.time}\n担当: ${lastUpdatedBy}`;
        const html = `<p>予約が削除されました。</p><ul><li>患者名: ${deletedAppointment.patientName}</li><li>日時: ${deletedAppointment.date} ${deletedAppointment.time}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
        await notifyUsers(subject, text, html);

        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Appointment not found' });
    }
});

// Create a new blocked slot
app.post('/api/blocked-slots', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role === 'viewer') {
    return res.status(403).json({ message: '閲覧ユーザーは予約不可設定を作成できません。' });
  }
  const { date, endDate, startTime, endTime, reason, sendNotification } = req.body;
  const lastUpdatedBy = (req as any).user.name;
  const newId = blockedSlots.length > 0 ? Math.max(...blockedSlots.map(s => s.id)) + 1 : 1;
  const newBlockedSlot = { id: newId, date, endDate, startTime, endTime, reason, lastUpdatedBy };
  blockedSlots.push(newBlockedSlot);
  saveData();

  if (sendNotification) {
    const subject = '予約不可設定追加のお知らせ';
    const text = `新しい予約不可設定が追加されました。\n期間: ${date}${endDate ? '〜' + endDate : ''}\n時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}\n理由: ${reason}\n担当: ${lastUpdatedBy}`;
    const html = `<p>新しい予約不可設定が追加されました。</p><ul><li>期間: ${date}${endDate ? '〜' + endDate : ''}</li><li>時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}</li><li>理由: ${reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
    await notifyUsers(subject, text, html);
  }

  res.status(201).json(newBlockedSlot);
});

// Update a blocked slot
app.put('/api/blocked-slots/:id', authenticateToken, async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは予約不可設定を更新できません。' });
    }
    const id = parseInt(req.params.id, 10);
    const { date, endDate, startTime, endTime, reason, sendNotification } = req.body;
    const lastUpdatedBy = (req as any).user.name;
    const slotIndex = blockedSlots.findIndex(s => s.id === id);

    if (slotIndex !== -1) {
        blockedSlots[slotIndex] = { ...blockedSlots[slotIndex], date, endDate, startTime, endTime, reason, lastUpdatedBy };
        saveData();

        if (sendNotification) {
          const subject = '予約不可設定更新のお知らせ';
          const text = `予約不可設定が更新されました。\n期間: ${date}${endDate ? '〜' + endDate : ''}\n時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}\n理由: ${reason}\n担当: ${lastUpdatedBy}`;
          const html = `<p>予約不可設定が更新されました。</p><ul><li>期間: ${date}${endDate ? '〜' + endDate : ''}</li><li>時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}</li><li>理由: ${reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
          await notifyUsers(subject, text, html);
        }

        res.json(blockedSlots[slotIndex]);
    } else {
        res.status(404).json({ message: 'Blocked slot not found' });
    }
});

// Delete a blocked slot
app.delete('/api/blocked-slots/:id', authenticateToken, async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは予約不可設定を削除できません。' });
    }
    const id = parseInt(req.params.id, 10);
    const slotIndex = blockedSlots.findIndex(s => s.id === id);
    const lastUpdatedBy = (req as any).user.name;

    if (slotIndex !== -1) {
        const deletedSlot = blockedSlots[slotIndex];
        blockedSlots[slotIndex].isDeleted = true;
        blockedSlots[slotIndex].lastUpdatedBy = lastUpdatedBy;
        saveData();

        const subject = '予約不可設定削除のお知らせ';
        const text = `予約不可設定が削除されました。\n期間: ${deletedSlot.date}${deletedSlot.endDate ? '〜' + deletedSlot.endDate : ''}\n時間: ${deletedSlot.startTime || '終日'}${deletedSlot.endTime ? '〜' + deletedSlot.endTime : ''}\n理由: ${deletedSlot.reason}\n担当: ${lastUpdatedBy}`;
        const html = `<p>予約不可設定が削除されました。</p><ul><li>期間: ${deletedSlot.date}${deletedSlot.endDate ? '〜' + deletedSlot.endDate : ''}</li><li>時間: ${deletedSlot.startTime || '終日'}${deletedSlot.endTime ? '〜' + deletedSlot.endTime : ''}</li><li>理由: ${deletedSlot.reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
        await notifyUsers(subject, text, html);

        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Blocked slot not found' });
    }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});