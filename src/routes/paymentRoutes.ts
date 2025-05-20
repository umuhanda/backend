import express from "express";
import {
  initiatePayment,
  handlePaymentCallback,
} from "../controllers/payment/paymentController";
import authMiddleware from "../middleware/authMiddleware";

const router = express.Router();

// 🔹 Route to initiate a payment
router.post("/pay", authMiddleware, initiatePayment);

// 🔹 Route to handle webhook callback
router.post("/pay/callback", handlePaymentCallback);

export default router;
