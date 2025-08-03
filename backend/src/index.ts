import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isEqual, isWithinInterval, isAfter, isBefore } from 'date-fns';
import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { sendEmail } from './emailService';
import dotenv from 'dotenv';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import Iconv from 'iconv-lite';

interface Appointment {
  id: number;
  patientId?: string;
  patientName?: string;
  date: string;
  time?: string;
  consultation?: string;
  lastUpdatedBy?: string;
  isDeleted?: boolean;
  reservationType: 'outpatient' | 'visit' | 'rehab';
  facilityName?: string;
  startTimeRange?: string;
  endTimeRange?: string;
}

interface BlockedSlot {
  id: number;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  lastUpdatedBy?: string;
  isDeleted?: boolean;
}

interface User {
  userId: string;
  password?: string;
  name: string;
  department: string;
  email: string;
  role: 'admin' | 'general' | 'viewer';
  mustChangePassword?: boolean;
  isDeleted?: boolean;
  lastUpdatedBy?: string;
}

const app = express();
const port = 3001;

dotenv.config();

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, '../db.json');

// --- Data Store ---
let appointments: Appointment[] = [];
let blockedSlots: BlockedSlot[] = [];
let users: User[] = [];

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

// Middleware to check for Admin role
const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user.role !== 'admin') {
    return res.status(403).json({ message: 'この操作は管理者のみ許可されています。' });
  }
  next();
};

// User Login
app.post('/api/login', (req: Request, res: Response) => {
  const { userId, password } = req.body;
  const user = users.find(u => u.userId === userId && u.password === password && !u.isDeleted);
  if (user) {
    res.json({
      token: user.userId,
      user: {
        userId: user.userId,
        name: user.name,
        department: user.department,
        role: user.role,
        email: user.email
      },
      mustChangePassword: user.mustChangePassword || false
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials or user deleted' });
  }
});

// Set a new password (for first-time login or password reset)
app.post('/api/users/set-password', authenticateToken, (req: Request, res: Response) => {
  const { newPassword } = req.body;
  const userFromToken = (req as any).user;

  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required' });
  }

  const userIndex = users.findIndex(u => u.userId === userFromToken.userId);

  if (userIndex !== -1) {
    users[userIndex].password = newPassword;
    users[userIndex].mustChangePassword = false;
    saveData();
    res.status(200).json({ message: 'Password updated successfully.' });
  } else {
    res.status(404).json({ message: 'User not found' });
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

// Get all users (Admin only)
app.get('/api/users', authenticateToken, adminOnly, (req: Request, res: Response) => {
  res.json(users.filter(u => !u.isDeleted).map(({ password, ...user }) => user));
});

// Create a new user (Admin only)
app.post('/api/users/create', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  const { userId, name, department, email, role } = req.body;

  if (!userId || !name || !department || !email || !role) {
    return res.status(400).json({ message: '全ての項目を入力してください。' });
  }
  if (users.find(u => u.userId === userId)) {
    return res.status(409).json({ message: 'このユーザーIDは既に使用されています。' });
  }

  const tempPassword = Math.random().toString(36).slice(-8);

  const newUser = {
    userId,
    password: tempPassword,
    name,
    department,
    email,
    role,
    mustChangePassword: true,
    isDeleted: false
  };
  users.push(newUser);
  saveData();

  const subject = 'アカウントが作成されました - 外来診療予約システム';
  const text = `あなたの新しいアカウントが作成されました。\n\nユーザーID: ${userId}\n初期パスワード: ${tempPassword}\n\n初回ログイン時にパスワードを変更してください。\nシステムURL: ${process.env.SYSTEM_URL || 'http://localhost:3000'}`;
  const html = `<p>あなたの新しいアカウントが作成されました。</p>\n                <p><strong>ユーザーID:</strong> ${userId}</p>\n                <p><strong>初期パスワード:</strong> ${tempPassword}</p>\n                <p>初回ログイン時にパスワードを変更してください。</p>\n                <p>システムにアクセスするには<a href="${process.env.SYSTEM_URL || 'http://localhost:3000'}">こちら</a>をクリックしてください。</p>`;

  try {
    await sendEmail(email, subject, text, html);
    const { password, ...userToReturn } = newUser;
    res.status(201).json(userToReturn);
  } catch (error) {
    console.error("Failed to send account creation email:", error);
    const { password, ...userToReturn } = newUser;
    res.status(201).json({ ...userToReturn, email_status: "failed" });
  }
});

// Update a user (Admin only)
app.put('/api/users/:userId', authenticateToken, adminOnly, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, department, role, email } = req.body;
  const userIndex = users.findIndex(u => u.userId === userId);

  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], name, department, role, email };
    // Do not allow password change from this endpoint directly for existing users
    // Password changes should go through a separate flow if needed
    saveData();
    const { password: _, ...updatedUser } = users[userIndex];
    res.json(updatedUser);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// Delete a user (Admin only)
app.delete('/api/users/:userId', authenticateToken, adminOnly, (req: Request, res: Response) => {
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
  const { reservationType, patientId, patientName, date, time, consultation, facilityName, startTimeRange, endTimeRange, sendNotification } = req.body;
  const lastUpdatedBy = (req as any).user.name;

  if (!reservationType || !date) {
    return res.status(400).json({ message: '予約種別と日付は必須項目です。' });
  }

  if (reservationType === 'outpatient') {
    if (!patientId || !patientName || !time) {
      return res.status(400).json({ message: '外来診療の場合、患者ID、患者名、時間は必須項目です。' });
    }
    if (!/^[0-9]+$/.test(patientId)) {
      return res.status(400).json({ message: '患者IDは数字のみで入力してください。' });
    }
  } else if (reservationType === 'visit' || reservationType === 'rehab') {
    if (!startTimeRange || !endTimeRange) {
      return res.status(400).json({ message: '訪問診療または通所リハ会議の場合、開始時間と終了時間は必須項目です。' });
    }
    if (dayjs(startTimeRange, 'HH:mm').isAfter(dayjs(endTimeRange, 'HH:mm'))) {
      return res.status(400).json({ message: '開始時間は終了時間より前に設定してください。' });
    }
  }

  const newId = appointments.length > 0 ? Math.max(...appointments.map(a => a.id)) + 1 : 1;
  const newAppointment: Appointment = {
    id: newId,
    date,
    reservationType,
    lastUpdatedBy,
    isDeleted: false,
  };

  if (reservationType === 'outpatient') {
    newAppointment.patientId = patientId;
    newAppointment.patientName = patientName;
    newAppointment.time = time;
    newAppointment.consultation = consultation;
  } else if (reservationType === 'visit') {
    newAppointment.facilityName = facilityName;
    newAppointment.startTimeRange = startTimeRange;
    newAppointment.endTimeRange = endTimeRange;
    newAppointment.consultation = consultation;
  } else if (reservationType === 'rehab') {
    newAppointment.startTimeRange = startTimeRange;
    newAppointment.endTimeRange = endTimeRange;
  }

  appointments.push(newAppointment);
  saveData();

  if (sendNotification) {
    let subject = '';
    let text = '';
    let html = '';

    if (reservationType === 'outpatient') {
      subject = '新規予約登録のお知らせ (外来診療)';
      text = `新しい外来診療の予約が登録されました。\n患者名: ${patientName}\n日時: ${date} ${time}\n担当: ${lastUpdatedBy}`;
      html = `<p>新しい外来診療の予約が登録されました。</p><ul><li>患者名: ${patientName}</li><li>日時: ${date} ${time}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
    } else if (reservationType === 'visit') {
      subject = '新規予約登録のお知らせ (訪問診療)';
      text = `新しい訪問診療の予約が登録されました。\n施設名: ${facilityName || '未入力'}\n日時: ${date} ${startTimeRange} - ${endTimeRange}\n診察内容: ${consultation || '未入力'}\n担当: ${lastUpdatedBy}`;
      html = `<p>新しい訪問診療の予約が登録されました。</p><ul><li>施設名: ${facilityName || '未入力'}</li><li>日時: ${date} ${startTimeRange} - ${endTimeRange}</li><li>診察内容: ${consultation || '未入力'}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
    } else if (reservationType === 'rehab') {
      subject = '新規予約登録のお知らせ (通所リハ会議)';
      text = `新しい通所リハ会議の予約が登録されました。\n日時: ${date} ${startTimeRange} - ${endTimeRange}\n担当: ${lastUpdatedBy}`;
      html = `<p>新しい通所リハ会議の予約が登録されました。</p><ul><li>日時: ${date} ${startTimeRange} - ${endTimeRange}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
    }
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
    const { reservationType, patientId, patientName, date, time, consultation, facilityName, startTimeRange, endTimeRange, sendNotification } = req.body;
    const lastUpdatedBy = (req as any).user.name;

    const appointmentIndex = appointments.findIndex(a => a.id === id);

    if (appointmentIndex !== -1) {
        const oldAppointment = { ...appointments[appointmentIndex] }; // 更新前のデータをコピー

        const updatedAppointment: Appointment = {
          ...appointments[appointmentIndex],
          date,
          reservationType,
          lastUpdatedBy,
        };

        if (reservationType === 'outpatient') {
          if (!patientId || !patientName || !time) {
            return res.status(400).json({ message: '外来診療の場合、患者ID、患者名、時間は必須項目です。' });
          }
          if (!/^[0-9]+$/.test(patientId)) {
            return res.status(400).json({ message: '患者IDは数字のみで入力してください。' });
          }
          updatedAppointment.patientId = patientId;
          updatedAppointment.patientName = patientName;
          updatedAppointment.time = time;
          updatedAppointment.consultation = consultation;
          updatedAppointment.facilityName = undefined; // Clear other types' fields
          updatedAppointment.startTimeRange = undefined;
          updatedAppointment.endTimeRange = undefined;
        } else if (reservationType === 'visit') {
          if (!startTimeRange || !endTimeRange) {
            return res.status(400).json({ message: '訪問診療の場合、開始時間と終了時間は必須項目です。' });
          }
          if (dayjs(startTimeRange, 'HH:mm').isAfter(dayjs(endTimeRange, 'HH:mm'))) {
            return res.status(400).json({ message: '開始時間は終了時間より前に設定してください。' });
          }
          updatedAppointment.facilityName = facilityName;
          updatedAppointment.startTimeRange = startTimeRange;
          updatedAppointment.endTimeRange = endTimeRange;
          updatedAppointment.consultation = consultation;
          updatedAppointment.patientId = undefined; // Clear other types' fields
          updatedAppointment.patientName = undefined;
          updatedAppointment.time = undefined;
        } else if (reservationType === 'rehab') {
          if (!startTimeRange || !endTimeRange) {
            return res.status(400).json({ message: '通所リハ会議の場合、開始時間と終了時間は必須項目です。' });
          }
          if (dayjs(startTimeRange, 'HH:mm').isAfter(dayjs(endTimeRange, 'HH:mm'))) {
            return res.status(400).json({ message: '開始時間は終了時間より前に設定してください。' });
          }
          updatedAppointment.startTimeRange = startTimeRange;
          updatedAppointment.endTimeRange = endTimeRange;
          updatedAppointment.patientId = undefined; // Clear other types' fields
          updatedAppointment.patientName = undefined;
          updatedAppointment.time = undefined;
          updatedAppointment.facilityName = undefined;
          updatedAppointment.consultation = undefined;
        }

        appointments[appointmentIndex] = updatedAppointment;
        saveData();

        if (sendNotification) {
          let subject = '';
          let text = '';
          let html = '';
          let changes = '';

          if (oldAppointment.reservationType !== reservationType) changes += `<li>予約種別: ${oldAppointment.reservationType} → ${reservationType}</li>`;

          if (reservationType === 'outpatient') {
            if (oldAppointment.patientId !== patientId) changes += `<li>患者ID: ${oldAppointment.patientId || '未入力'} → ${patientId || '未入力'}</li>`;
            if (oldAppointment.patientName !== patientName) changes += `<li>患者名: ${oldAppointment.patientName || '未入力'} → ${patientName || '未入力'}</li>`;
            if (oldAppointment.time !== time) changes += `<li>時間: ${oldAppointment.time || '未入力'} → ${time || '未入力'}</li>`;
            if (oldAppointment.consultation !== consultation) changes += `<li>診察内容: ${oldAppointment.consultation || '未入力'} → ${consultation || '未入力'}</li>`;
            subject = '予約更新のお知らせ (外来診療)';
            text = `外来診療の予約が更新されました。\n患者名: ${patientName}\n日時: ${date} ${time}\n担当: ${lastUpdatedBy}\n\n変更点:\n${changes.replace(/<li>/g, '').replace(/<\/li>/g, '\n')}`;
            html = `<p>外来診療の予約が更新されました。</p><ul><li>患者名: ${patientName}</li><li>日時: ${date} ${time}</li><li>担当: ${lastUpdatedBy}</li></ul><p>変更点：</p><ul>${changes}</ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
          } else if (reservationType === 'visit') {
            if (oldAppointment.facilityName !== facilityName) changes += `<li>施設名: ${oldAppointment.facilityName || '未入力'} → ${facilityName || '未入力'}</li>`;
            if (oldAppointment.startTimeRange !== startTimeRange) changes += `<li>開始時間: ${oldAppointment.startTimeRange || '未入力'} → ${startTimeRange || '未入力'}</li>`;
            if (oldAppointment.endTimeRange !== endTimeRange) changes += `<li>終了時間: ${oldAppointment.endTimeRange || '未入力'} → ${endTimeRange || '未入力'}</li>`;
            if (oldAppointment.consultation !== consultation) changes += `<li>診察内容: ${oldAppointment.consultation || '未入力'} → ${consultation || '未入力'}</li>`;
            subject = '予約更新のお知らせ (訪問診療)';
            text = `訪問診療の予約が更新されました。\n施設名: ${facilityName || '未入力'}\n日時: ${date} ${startTimeRange} - ${endTimeRange}\n診察内容: ${consultation || '未入力'}\n担当: ${lastUpdatedBy}\n\n変更点:\n${changes.replace(/<li>/g, '').replace(/<\/li>/g, '\n')}`;
            html = `<p>訪問診療の予約が更新されました。</p><ul><li>施設名: ${facilityName || '未入力'}</li><li>日時: ${date} ${startTimeRange} - ${endTimeRange}</li><li>診察内容: ${consultation || '未入力'}</li><li>担当: ${lastUpdatedBy}</li></ul><p>変更点：</p><ul>${changes}</ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
          } else if (reservationType === 'rehab') {
            if (oldAppointment.startTimeRange !== startTimeRange) changes += `<li>開始時間: ${oldAppointment.startTimeRange || '未入力'} → ${startTimeRange || '未入力'}</li>`;
            if (oldAppointment.endTimeRange !== endTimeRange) changes += `<li>終了時間: ${oldAppointment.endTimeRange || '未入力'} → ${endTimeRange || '未入力'}</li>`;
            subject = '予約更新のお知らせ (通所リハ会議)';
            text = `通所リハ会議の予約が更新されました。\n日時: ${date} ${startTimeRange} - ${endTimeRange}\n担当: ${lastUpdatedBy}\n\n変更点:\n${changes.replace(/<li>/g, '').replace(/<\/li>/g, '\n')}`;
            html = `<p>通所リハ会議の予約が更新されました。</p><ul><li>日時: ${date} ${startTimeRange} - ${endTimeRange}</li><li>担当: ${lastUpdatedBy}</li></ul><p>変更点：</p><ul>${changes}</ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
          }

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

// Register holidays from CSV
app.post('/api/blocked-slots/register-holidays', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role === 'viewer') {
    return res.status(403).json({ message: '閲覧ユーザーは操作できません。' });
  }

  try {
    const response = await axios.get('https://holidays-jp.github.io/api/v1/date.json');
    const holidays = response.data;

    let addedCount = 0;
    const lastUpdatedBy = (req as any).user.name;

    for (const date in holidays) {
      const holidayDate = dayjs(date).format('YYYY-MM-DD');
      const holidayName = holidays[date];

      const isAlreadyBlocked = blockedSlots.some(
        (slot) => slot.date === holidayDate && slot.reason === holidayName
      );

      if (!isAlreadyBlocked) {
        const newId = blockedSlots.length > 0 ? Math.max(...blockedSlots.map(s => s.id)) + 1 : 1;
        const newBlockedSlot = {
          id: newId,
          date: holidayDate,
          endDate: null,
          startTime: null,
          endTime: null,
          reason: holidayName,
          lastUpdatedBy,
        };
        blockedSlots.push(newBlockedSlot);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      saveData();
      res.status(201).json({ message: `${addedCount}件の祝日を登録しました。` });
    } else {
      res.status(200).json({ message: '新しい祝日はありませんでした。' });
    }
  } catch (error) {
    console.error('Error registering holidays:', error);
    res.status(500).json({ message: '祝日の登録中にエラーが発生しました。' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});