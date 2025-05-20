import express from "express";
import { sendMessage } from "../controllers/contactController";

const router = express.Router();

router.post("/", sendMessage);

export default router;