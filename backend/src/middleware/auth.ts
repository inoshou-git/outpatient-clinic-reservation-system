import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { findUserById } from "../users/users.service";

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // if there isn't any token
  }

  jwt.verify(token, process.env.JWT_SECRET as string, async (err: any, decoded: any) => {
    if (err) {
      return res.sendStatus(403); // if token is no longer valid
    }

    const user = await findUserById(decoded.userid);
    if (!user) {
      return res.sendStatus(403); // if user not found
    }
    
    (req as any).user = user;
    next(); // proceed to the next middleware or route handler
  });
};

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "この操作は管理者のみ許可されています。" });
  }
  next();
};
