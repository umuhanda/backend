import { Request, Response } from "express";
import UserSubscription, {
  IUserSubscription,
} from "../models/UserSubscription";
import User from "../models/User";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import Subscription from "../models/Subscription";

class UserSubscriptionController {
  // Create new user subscription
  async create(req: AuthRequest, res: Response): Promise<void> {
    const user_id = req.user?.id;

    if (!user_id) {
      res
        .status(401)
        .json({ error: "Unauthorized. Please Login to continue !" });
      return;
    }
    try {
      const userExists = await User.findById(user_id);
      if (!userExists) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const subscriptionExists = await Subscription.findById(
        req.body.subscription_id
      );
      if (!subscriptionExists) {
        res.status(404).json({ error: "Subscription not found" });
        return;
      }

      const subscription = new UserSubscription({
        user_id: user_id,
        subscription: req.body.subscription_id,
        start_date: Date.now(),
        language: req.body.language,
        attempts_left: subscriptionExists.examAttemptsLimit,
      });

      const savedSubscription = await subscription.save();
      await User.findByIdAndUpdate(req.body.user_id, {
        $push: { subscriptions: subscription._id },
        subscribed: true,
      });

      res.status(201).json(savedSubscription);
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error creating user subscription", error });
    }
  }

  // Change active subscription
  async changeActiveSubscription(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const user_id = req.user?.id;
      const { subscription_id } = req.body;

      if (!user_id || !subscription_id) {
        res
          .status(400)
          .json({ message: "User ID and subscription ID are required." });
        return;
      }

      const subscription = await UserSubscription.findOne({
        _id: new mongoose.Types.ObjectId(subscription_id),
        user_id: new mongoose.Types.ObjectId(user_id),
      });

      if (!subscription) {
        res
          .status(404)
          .json({ message: "Subscription not found for this user." });
        return;
      }

      const currentDate = new Date();
      if (subscription.end_date && subscription.end_date <= currentDate) {
        console.log(
          "Cannot activate an expired subscription. End date was : ",
          subscription.end_date
        );
        res
          .status(400)
          .json({ message: "Cannot activate an expired subscription." });
        return;
      }

      await User.findByIdAndUpdate(user_id, {
        active_subscription: subscription_id,
      });

      res
        .status(200)
        .json({ message: "Active subscription updated successfully." });
      return;
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error changing active subscription", error });
    }
  }

  // Get all subscriptions for a user
  async getUserSubscriptions(req: AuthRequest, res: Response) {
    const user_id = req.user?.id;

    if (!user_id) {
      res
        .status(401)
        .json({ error: "Unauthorized. Please Login to continue !" });
      return;
    }

    try {
      const userSubscriptions = await UserSubscription.find({
        user_id: user_id,
      })
        .populate("subscription")
        .sort({ end_date: -1 });
      res.status(200).json(userSubscriptions);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching user subscriptions", error });
    }
  }

  // Get active subscriptions for a user
  async getActiveUserSubscriptions(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        res
          .status(401)
          .json({ error: "Unauthorized. Please Login to continue !" });
        return;
      }

      const currentDate = new Date();
      const userSubscriptions = await UserSubscription.find({
        user_id: req.params.id,
        end_date: { $gt: currentDate },
      }).populate("subscription");
      res.status(200).json(userSubscriptions);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching active user subscriptions", error });
    }
  }

  // Update subscription attempts
  async updateAttempts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        res
          .status(401)
          .json({ error: "Unauthorized. Please Login to continue !" });
        return;
      }
      const subscription = await UserSubscription.findByIdAndUpdate(
        req.user?.id,
        { attempts_left: req.body.attempts_left },
        { new: true }
      );

      if (!subscription) {
        res.status(404).json({ message: "User subscription not found" });
        return;
      }

      res.status(200).json(subscription);
    } catch (error) {
      res.status(400).json({ message: "Error updating attempts", error });
    }
  }

  // Clean expired subscriptions and update user status
  async cleanExpiredSubscriptions(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user_id = req.user?.id;

      if (!user_id) {
        res
          .status(401)
          .json({ error: "Unauthorized. Please Login to continue !" });
        return;
      }
      const currentDate = new Date();

      // Find all expired subscriptions for the user
      const expiredSubscriptions = await UserSubscription.find({
        user_id: user_id,
        end_date: { $lt: currentDate },
      }).session(session);

      // Get the expired subscription IDs
      const expiredSubscriptionIds = expiredSubscriptions.map(
        (sub) => sub.subscription
      );

      // Remove expired subscriptions from user's subscriptions array
      await User.findByIdAndUpdate(user_id, {
        $pull: { subscriptions: { $in: expiredSubscriptionIds } },
      }).session(session);

      // Delete expired user subscriptions
      await UserSubscription.deleteMany({
        user_id: user_id,
        end_date: { $lt: currentDate },
      }).session(session);

      // Check if user has any active subscriptions left
      const activeSubscriptions = await UserSubscription.find({
        user_id: user_id,
        end_date: { $gt: currentDate },
      }).session(session);

      // Update user's subscription status
      await User.findByIdAndUpdate(user_id, {
        subscribed: activeSubscriptions.length > 0,
        active_subscription:
          activeSubscriptions.length > 0 ? activeSubscriptions[0]._id : null,
      }).session(session);

      await session.commitTransaction();
      res.status(200).json({
        message: "Expired subscriptions cleaned",
        activeSubscriptionsCount: activeSubscriptions.length,
      });
    } catch (error) {
      await session.abortTransaction();
      res
        .status(500)
        .json({ message: "Error cleaning expired subscriptions", error });
    } finally {
      session.endSession();
    }
  }

  // Extend subscription end date
  async extendSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const subscription = await UserSubscription.findByIdAndUpdate(
        req.params.id,
        { end_date: req.body.end_date },
        { new: true }
      );

      if (!subscription) {
        res.status(404).json({ message: "User subscription not found" });
        return;
      }

      res.status(200).json(subscription);
    } catch (error) {
      res.status(400).json({ message: "Error extending subscription", error });
    }
  }

  // Check if a user has an active subscription
  async checkActiveSubscription(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const currentDate = new Date();
      const activeSubscription = await UserSubscription.findOne({
        user_id: req.user?.id,
        end_date: { $gt: currentDate },
      }).populate("subscription_id");

      res.status(200).json({
        hasActiveSubscription: !!activeSubscription,
        subscription: activeSubscription,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error checking subscription status", error });
    }
  }
}

export default new UserSubscriptionController();
