import express from "express";
import {
  createExamAttempt,
  getAllAttempts,
  getUserExamStats,
} from "../controllers/examAttemptController";
import authMiddleware from "../middleware/authMiddleware";

const router = express.Router();

router.post("/new", authMiddleware, createExamAttempt);
router.get("/all", authMiddleware, getAllAttempts);
router.get("/", authMiddleware, getUserExamStats);

export default router;
