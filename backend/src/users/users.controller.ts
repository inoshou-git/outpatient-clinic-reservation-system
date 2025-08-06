import { Request, Response } from 'express';
import * as userService from './users.service';

export const login = async (req: Request, res: Response) => {
    const { userId, password } = req.body;
    const result = await userService.loginUser(userId, password);
    if (result) {
        res.json(result);
    } else {
        res.status(401).json({ message: 'Invalid credentials or user deleted' });
    }
};

export const setPassword = async (req: Request, res: Response) => {
    const userFromToken = (req as any).user;
    const { newPassword } = req.body;
    if (!newPassword) {
        return res.status(400).json({ message: 'New password is required' });
    }
    const success = await userService.setUserPassword(userFromToken.userId, newPassword);
    if (success) {
        res.status(200).json({ message: 'Password updated successfully.' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

export const getCurrentUser = (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user && !user.isDeleted) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found or deleted' });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    const users = await userService.getAllUsers();
    res.json(users);
};

export const createUser = async (req: Request, res: Response) => {
    const { userId, name, department, email, role } = req.body;
    if (!userId || !name || !department || !email || !role) {
        return res.status(400).json({ message: '全ての項目を入力してください。' });
    }
    try {
        const result = await userService.createUser(req.body);
        if (result.error) {
            return res.status(result.status || 400).json({ message: result.error });
        }
        res.status(201).json(result.user);
    } catch (error) {
        console.error("Failed to create user:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const updatedUser = await userService.updateUser(userId, req.body);
    if (updatedUser) {
        res.json(updatedUser);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const lastUpdatedBy = (req as any).user.name;
    const success = await userService.deleteUser(userId, lastUpdatedBy);
    if (success) {
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};