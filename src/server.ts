import express from "express";
import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db";
import userRoutes from "./routes/userRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import UserSubscriptionRoutes from "./routes/userSubscriptionRoutes";
import attemptsRoutes from "./routes/attemptsRoutes";
import subscriptionCleanupService from "./services/SubscriptionCleanupService";
import contactRoute from "./routes/contactRoute";
import paymentRoutes from "./routes/paymentRoutes";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://umuhanda.netlify.app",
      "https://umuhanda-fn.netlify.app",
      "https://umuhanda.org"
    ], // ✅ Allow frontend origin
    credentials: true, // ✅ Allow cookies and authorization headers
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Version"], // ✅ Allow these headers
  })
);

app.use(cookieParser());

app.use("/api/auth", userRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/user-subscription", UserSubscriptionRoutes);
app.use("/api/attempts", attemptsRoutes);
app.use("/api/contact", contactRoute);
app.use("/api", paymentRoutes);

const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`✅ Server is running on port ${PORT}`));
// const server = http.createServer(app);

const server = http.createServer(app);
server.listen(PORT, () => console.log(`✅ Server is running on port ${PORT}`));

export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://umuhanda.netlify.app",
      "https://umuhanda-fn.netlify.app",
      "https://umuhanda.org"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Listen for connections
io.on("connection", (socket: any) => {
  console.log("✅ A client connected:", socket.id);
});

subscriptionCleanupService.start();

process.on("SIGTERM", () => {
  subscriptionCleanupService.stop();
});
