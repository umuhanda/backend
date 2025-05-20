import { AuthRequest } from "../middleware/authMiddleware";
import { Response } from "express";
import User from "../models/User";

export const checkGazetteAccess = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).lean();
    res.status(200).json({ hasAccess: !!user?.allowedToDownloadGazette });
    return;
  } catch (error) {
    console.error("❌ Error in Checking Accessing Gazette access:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const disableGazetteAccess = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (user) {
      user.allowedToDownloadGazette = false;
      await user.save();
    }
    res.status(200).json({ gazetteAccess: user?.allowedToDownloadGazette });
    return;
  } catch (error) {
    console.error("❌ Error in Disabling gazette access:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
