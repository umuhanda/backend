import express from "express";
import { subscriptionController } from "../controllers/subscriptionController";
import authMiddleware from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authMiddleware, subscriptionController.create);
router.get("/", authMiddleware, subscriptionController.getAll);
router.get("/:id", authMiddleware, subscriptionController.getById);
router.put("/:id", authMiddleware, subscriptionController.update);
router.delete("/:id", authMiddleware, subscriptionController.delete);

export default router;
