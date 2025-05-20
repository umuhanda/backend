import express from "express";
import UserSubscriptionController from "../controllers/userSubscriptionController";
import authMiddleware from "../middleware/authMiddleware";

const router = express.Router();

//router.post("/", authMiddleware, UserSubscriptionController.create);
router.get(
  "/",
  authMiddleware,
  UserSubscriptionController.getUserSubscriptions
);
router.get(
  "/active",
  authMiddleware,
  UserSubscriptionController.getActiveUserSubscriptions
);
router.post(
  "/change-active",
  authMiddleware,
  UserSubscriptionController.changeActiveSubscription
);
router.delete(
  "/update-attempt/:id",
  authMiddleware,
  UserSubscriptionController.updateAttempts
);
router.put(
  "/extend/:id",
  authMiddleware,
  UserSubscriptionController.extendSubscription
);

export default router;
