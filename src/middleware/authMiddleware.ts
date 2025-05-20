import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export interface AuthRequest extends Request {
  user?: { id: string };
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.authToken || req.header("Authorization")?.split(" ")[1]; 

    if (!token) {
      res.status(401).json({ error: "Unauthorized. No token provided!" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

    if (!decoded.id) {
      res.status(401).json({ error: "Invalid token!" });
      return;
    }

    req.user = { id: decoded.id };
    next(); 

  } catch (error) {
    console.error("❌ Authentication error:", error);
    res.status(401).json({ error: "Invalid or expired token!" });
    return;
  }
};

export default authMiddleware;
