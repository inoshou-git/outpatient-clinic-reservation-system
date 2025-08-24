import { User } from "./users.types";
import { readDb, writeDb } from "../data/db";
import { sendEmail } from "../emailService";

export const findUserById = async (
  userId: string
): Promise<User | undefined> => {
  const db = await readDb();
  return db.users.find((u) => u.userId === userId && !u.isDeleted);
};

export const loginUser = async (
  userId: string,
  password?: string
): Promise<{
  token: string;
  user: Partial<User>;
  mustChangePassword?: boolean;
} | { error: string }> => {
  const db = await readDb();
  const user = db.users.find(
    (u) => u.userId === userId && !u.isDeleted
  );

  if (!user || user.password !== password) {
    return { error: "ユーザーIDかパスワードが間違っています" };
  }

  const { password: userPassword, ...userResult } = user;
  return {
    token: user.userId, // Using userId as token for now
    user: userResult,
    mustChangePassword: user.mustChangePassword || false,
  };
};

export const setUserPassword = async (
  userId: string,
  newPassword?: string
): Promise<boolean> => {
  const db = await readDb();
  const userIndex = db.users.findIndex((u) => u.userId === userId);
  if (userIndex !== -1 && newPassword) {
    db.users[userIndex].password = newPassword;
    db.users[userIndex].mustChangePassword = false;
    await writeDb(db);
    return true;
  }
  return false;
};

export const getAllUsers = async (): Promise<Partial<User>[]> => {
  const db = await readDb();
  return db.users
    .filter((u) => !u.isDeleted)
    .map(({ password, ...user }) => user);
};

export const createUser = async (
  userData: any
): Promise<{ user?: Partial<User>; error?: string; status?: number }> => {
  const { userId, name, department, email, role } = userData;
  const db = await readDb();
  if (db.users.some((u) => u.userId === userId)) {
    return { error: "このユーザーIDは既に使用されています。", status: 409 };
  }

  const tempPassword = Math.random().toString(36).slice(-8);
  const newUser: User = {
    userId,
    password: tempPassword,
    name,
    department,
    email,
    role,
    mustChangePassword: true,
    isDeleted: false,
  };
  db.users.push(newUser);
  await writeDb(db);

  const subject = "アカウントが作成されました - 外来診療予約システム";
  const text = `あなたの新しいアカウントが作成されました.\n\nユーザーID: ${userId}\n初期パスワード: ${tempPassword}\n\n初回ログイン時にパスワードを変更してください.\nシステムURL: ${
    process.env.SYSTEM_URL || "http://localhost:3000"
  }`;
  const html = `<p>あなたの新しいアカウントが作成されました。</p>\n                <p><strong>ユーザーID:</strong> ${userId}</p>\n                <p><strong>初期パスワード:</strong> ${tempPassword}</p>\n                <p>初回ログイン時にパスワードを変更してください。</p>\n                <p>システムにアクセスするには<a href="${
    process.env.SYSTEM_URL || "http://localhost:3000"
  }">こちら</a>をクリックしてください。</p>`;

  try {
    await sendEmail(email, subject, text, html);
    const { password, ...userToReturn } = newUser;
    return { user: userToReturn };
  } catch (error) {
    console.error("Failed to send account creation email:", error);
    const { password, ...userToReturn } = newUser;
    return { user: { ...userToReturn, email_status: "failed" } };
  }
};

export const updateUser = async (
  userId: string,
  userData: any
): Promise<Partial<User> | null> => {
  const db = await readDb();
  const userIndex = db.users.findIndex((u) => u.userId === userId);
  if (userIndex !== -1) {
    const currentUser = db.users[userIndex];
    db.users[userIndex] = {
      ...currentUser,
      ...userData,
      role: userData.role || currentUser.role, // Keep existing role if not provided
    };
    await writeDb(db);
    const { password, ...updatedUser } = db.users[userIndex];
    return updatedUser;
  }
  return null;
};

export const deleteUser = async (
  userId: string,
  lastUpdatedBy: string
): Promise<boolean> => {
  const db = await readDb();
  const userIndex = db.users.findIndex((u) => u.userId === userId);
  if (userIndex !== -1) {
    db.users[userIndex].isDeleted = true;
    db.users[userIndex].lastUpdatedBy = lastUpdatedBy;
    await writeDb(db);
    return true;
  }
  return false;
};
