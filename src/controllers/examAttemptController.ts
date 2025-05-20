import { Request, Response } from "express";
import ExamAttempt, { IExamAttempt } from "../models/ExamAttempt";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import smsService from "../services/sms.service";
import User from "../models/User";
import emailService from "../services/email.service";

// ✅ Create a new exam attempt
export const createExamAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { score } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      res.status(401).json({ error: "Unauthorized. Please Login To Continue" });
      return;
    }
    const userExists = await User.findById(user_id);
    if (!userExists) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const attempt = new ExamAttempt({
      user_id: new mongoose.Types.ObjectId(user_id),
      attempt_date: new Date(),
      score,
    });
    if (userExists.hasFreeTrial == true) {
      userExists.hasFreeTrial = false;
      await userExists.save();
    }
    await attempt.save();
    smsService.sendSMS(
      userExists.phone_number,
      `Muraho ${userExists.names}, wabonye amanota ${score}/20 mu isuzuma wakoze. Komeza ukore kenshi witegura ikizamini cya nyuma !`
    );
    if (userExists.email) {
      emailService.sendEmail({
        to: userExists.email,
        subject: "Amanota y'ikizamini",
        html: `Muraho ${userExists.names}, wabonye amanota ${score}/20 mu isuzuma wakoze. Komeza ukore kenshi witegura ikizamini cya nyuma !`,
      });
    }
    res
      .status(201)
      .json({ message: "Exam attempt recorded successfully", attempt });
  } catch (error) {
    console.error("❌ Error in createExamAttempt:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get all exam attempts (admin use)
export const getAllAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const attempts = await ExamAttempt.find().populate(
      "user_id",
      "names email"
    );
    res.status(200).json(attempts);
  } catch (error) {
    console.error("❌ Error in getAllAttempts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get attempts by user ID (for admin)
export const getAttemptsByUserId = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const attempts = await ExamAttempt.find({ user_id: userId });

    if (!attempts || attempts.length === 0) {
      res.status(404).json({ message: "No exam attempts found for this user" });
      return;
    }

    if (!attempts || attempts.length === 0) {
      res.status(404).json({ message: "No exam attempts found for this user" });
      return;
    }

    res.status(200).json(attempts);
  } catch (error) {
    console.error("❌ Error in getAttemptsByUserId:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get logged-in user's total attempts & max score
export const getUserExamStats = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      res.status(401).json({ error: "Unauthorized. Please Login to continue" });
      return;
    }

    const totalAttempts = await ExamAttempt.countDocuments({ user_id });
    const maxScore = await ExamAttempt.findOne({ user_id })
      .sort({ score: -1 }) // Sort by highest score
      .select("score")
      .lean();

    res.status(200).json({
      totalAttempts,
      maxScore: maxScore?.score || 0,
    });
  } catch (error) {
    console.error("❌ Error in getUserExamStats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
