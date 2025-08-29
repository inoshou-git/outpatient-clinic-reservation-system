import { supabase } from "../lib/supabaseClient";
import { User } from "./users.types";
import { sendEmail } from "../emailService";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const findUserById = async (
  userid: string
): Promise<User | undefined> => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('userid', userid)
    .eq('isDeleted', false)
    .single();

  if (error) {
    console.error("Error finding user by ID:", error);
    return undefined;
  }

  return user || undefined;
};

export const loginUser = async (
  userid: string, // ここにログイン画面で入力されたユーザーIDが来る
  password?: string
): Promise<{
  token: string;
  user: Partial<User>;
  mustChangePassword?: boolean;
} | { error: string }> => {
  console.log("--- Login Attempt Start ---"); // 追加
  console.log("Input userid:", userid); // 追加
  console.log("Input password (first 3 chars):", password ? password.substring(0, 3) + '...' : 'N/A'); // 追加

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('userid', userid) // DBの userid カラムと比較
    .eq('isDeleted', false)
    .single();

  if (fetchError) {
    console.error("Error fetching user from DB:", fetchError); // メッセージ変更
    console.log("--- Login Attempt End (Error fetching user) ---"); // 追加
    return { error: "ログインに失敗しました。" };
  }

  console.log("Fetched user from DB:", user); // 追加

  if (!user || !user.password) {
    console.log("User not found in DB or password missing in DB."); // メッセージ変更
    console.log("--- Login Attempt End (User not found/password missing) ---"); // 追加
    return { error: "ユーザーIDかパスワードが間違っています" };
  }

  const passwordMatch = await bcrypt.compare(password || '', user.password);
  console.log("Password match result:", passwordMatch); // 追加

  if (!passwordMatch) {
    console.log("Password does not match."); // 追加
    console.log("--- Login Attempt End (Password mismatch) ---"); // 追加
    return { error: "ユーザーIDかパスワードが間違っています" };
  }

  const { password: userPassword, ...userResult } = user;

  // Create JWT
  const token = jwt.sign(
    { userid: user.userid, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '1d' } // Token expires in 1 day
  );

  console.log("Login successful for user:", user.userid); // 追加
  console.log("--- Login Attempt End (Success) ---"); // 追加
  return {
    token,
    user: userResult,
    mustChangePassword: user.mustChangePassword || false,
  };
};

export const setUserPassword = async (
  userid: string,
  newPassword?: string
): Promise<boolean> => {
  if (!newPassword) {
    return false;
  }

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('userid', userid)
    .single();

  if (fetchError || !user) {
    console.error("Error fetching user for password update:", fetchError);
    return false;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedPassword, mustChangePassword: false, lastUpdatedAt: new Date().toISOString() })
    .eq('userid', userid);

  if (updateError) {
    console.error("Error updating user password:", updateError);
    return false;
  }

  return true;
};

export const getAllUsers = async (): Promise<Partial<User>[]> => {
  const { data: users, error } = await supabase
    .from('users')
    .select('userid, name, department, email, role, mustChangePassword, isDeleted, createdAt, lastUpdatedAt')
    .eq('isDeleted', false);

  if (error) {
    console.error("Error fetching all users:", error);
    return [];
  }

  return users || [];
};

export const createUser = async (
  userData: any
): Promise<{ user?: Partial<User>; error?: string; status?: number }> => {
  const { userid, name, department, email, role } = userData;

  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('userid')
    .eq('userid', userid)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error("Error checking for existing user:", fetchError);
    return { error: "ユーザーの確認に失敗しました。", status: 500 };
  }

  if (existingUser) {
    return { error: "このユーザーIDは既に使用されています。", status: 409 };
  }

  const tempPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  const newUser: Omit<User, 'createdAt' | 'lastUpdatedAt'> = {
    userid: userid,
    password: hashedPassword,
    name,
    department,
    email,
    role,
    mustChangePassword: true,
    isDeleted: false,
  };

  const { data: createdUser, error: insertError } = await supabase
    .from('users')
    .insert([newUser])
    .select()
    .single();

  if (insertError) {
    console.error("Error creating user:", insertError);
    return { error: "ユーザーの作成に失敗しました。", status: 500 };
  }

  if (!createdUser) {
    return { error: "ユーザーの作成に失敗しました。", status: 500 };
  }

  const subject = "アカウントが作成されました - 外来診療予約システム";
  const text = `あなたの新しいアカウントが作成されました.\n\nユーザーID: ${userid}\n初期パスワード: ${tempPassword}\n\n初回ログイン時にパスワードを変更してください.\nシステムURL: ${
    process.env.SYSTEM_URL || "http://localhost:3000"
  }`;
  const html = `<p>あなたの新しいアカウントが作成されました。</p>\n                <p><strong>ユーザーID:</strong> ${userid}</p>\n                <p><strong>初期パスワード:</strong> ${tempPassword}</p>\n                <p>初回ログイン時にパスワードを変更してください。</p>\n                <p>システムにアクセスするには<a href="${
    process.env.SYSTEM_URL || "http://localhost:3000"
  }">こちら</a>をクリックしてください。</p>`;

  try {
    await sendEmail(email, subject, text, html);
    const { password, ...userToReturn } = createdUser;
    return { user: userToReturn };
  } catch (error) {
    console.error("Failed to send account creation email:", error);
    const { password, ...userToReturn } = createdUser;
    return { user: { ...userToReturn, email_status: "failed" } };
  }
};

export const updateUser = async (
  userid: string,
  userData: any
): Promise<Partial<User> | null> => {
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('userid', userid)
    .single();

  if (fetchError || !existingUser) {
    console.error("Error fetching user for update:", fetchError);
    return null;
  }

  const updatedUserData = {
    ...existingUser,
    ...userData,
    role: userData.role || existingUser.role, // Keep existing role if not provided
    lastUpdatedAt: new Date().toISOString(),
  };

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update(updatedUserData)
    .eq('userid', userid)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating user:", updateError);
    return null;
  }

  if (!updatedUser) {
    return null;
  }

  const { password, ...userToReturn } = updatedUser;
  return userToReturn;
};

export const deleteUser = async (
  userid: string,
  lastUpdatedBy: string
): Promise<boolean> => {
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('userid', userid)
    .single();

  if (fetchError || !user) {
    console.error("Error fetching user for deletion:", fetchError);
    return false;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ isDeleted: true, lastUpdatedBy, lastUpdatedAt: new Date().toISOString() })
    .eq('userid', userid);

  if (updateError) {
    console.error("Error marking user as deleted:", updateError);
    return false;
  }

  return true;
};

export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('isDeleted', false)
    .single();

  if (fetchError || !user) {
    // To prevent user enumeration, we send a success-like response even if the email is not found.
    console.error("Password reset requested for non-existent or error-fetching email:", email, fetchError);
    return { success: true, message: "パスワードリセットの手順が送信されました。" };
  }

  const tempPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedPassword, mustChangePassword: true, lastUpdatedAt: new Date().toISOString() })
    .eq('userid', user.userid);

  if (updateError) {
    console.error("Error updating user for password reset:", updateError);
    return { success: false, message: "パスワードのリセット中にエラーが発生しました。" };
  }

  const subject = "パスワードリセットのご案内 - 外来診療予約システム";
  const text = `パスワードのリセットが要求されました。\n\n一時パスワード: ${tempPassword}\n\nこの一時パスワードでログインし、速やかに新しいパスワードを設定してください。\nシステムURL: ${
    process.env.SYSTEM_URL || "http://localhost:3000"
  }`;
  const html = `<p>パスワードのリセットが要求されました。</p>
                <p><strong>一時パスワード:</strong> ${tempPassword}</p>
                <p>この一時パスワードでログインし、速やかに新しいパスワードを設定してください。</p>
                <p>システムにアクセスするには<a href="${
    process.env.SYSTEM_URL || "http://localhost:3000"
  }">こちら</a>をクリックしてください。</p>`;

  try {
    await sendEmail(email, subject, text, html);
    return { success: true, message: "パスワードリセットの手順が送信されました。" };
  } catch (emailError) {
    console.error("Failed to send password reset email:", emailError);
    // Even if email fails, we don't want to reveal that the user exists.
    // The password has been reset in the DB, so they can try again later.
    return { success: false, message: "メールの送信中にエラーが発生しました。" };
  }
};