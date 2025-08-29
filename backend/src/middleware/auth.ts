import { Request, Response, NextFunction } from "express";
import { findUserById } from "../users/users.service";

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  let userid: string | undefined;

  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      userid = parts[1];
    } else {
      userid = authHeader; // No Bearer prefix, assume the whole header is the token
    }
  }

  if (userid == null) return res.sendStatus(401);

  const user = await findUserById(userid); // Assuming token is userId for now
  if (!user) return res.sendStatus(403);

  (req as any).user = user;
  next();
};

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "この操作は管理者のみ許可されています。" });
  }
  next();
};
