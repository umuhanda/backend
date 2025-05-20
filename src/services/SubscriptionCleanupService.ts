import cron from "node-cron";
import mongoose from "mongoose";
import UserSubscription from "../models/UserSubscription";
import User from "../models/User";
import logger from "./logger.service";
import notificationService from "./notification.service";
//import * as cronParser from "cron-parser";
import { ISubscription } from "../models/Subscription";
const cronParser = require("cron-parser");

interface IUser {
  _id: string;
  phone_number?: string;
  email?: string;
  names: string;
}

class SubscriptionCleanupService {
  //private cronSchedule = "*/5 * * * *"; // every 5 minutes

  private cronSchedule = "0 */6 * * *"; // Run every 6 hours
  private cronJob: cron.ScheduledTask;

  constructor() {
    this.cronJob = cron.schedule(this.cronSchedule, () => {
      this.processSubscriptions();
    });
  }

  start() {
    this.cronJob.start();
    logger.info("Subscription cleanup and notification service started");
  }

  stop() {
    this.cronJob.stop();
    logger.info("Subscription cleanup and notification service stopped");
  }

  private async processExpiredSubscriptions(session: mongoose.ClientSession) {
    const currentDate = new Date();

    // Find expired subscriptions with related user and subscription data
    const expiredSubscriptions = await UserSubscription.find({
      end_date: { $lt: currentDate },
    })
      .populate<{ subscription_id: ISubscription }>("subscription", "name")
      .populate<{ user_id: IUser }>("user_id", "names email phone_number")
      .session(session);

    if (expiredSubscriptions.length === 0) {
      logger.info("No expired subscriptions found");
      return [];
    }

    // Group expired subscriptions by user
    const userSubscriptionsMap = new Map<string, mongoose.Types.ObjectId[]>();
    expiredSubscriptions.forEach((subscription) => {
      if (!subscription.user_id || !subscription.subscription_id) {
        console.log(subscription);
        logger.warn(
          `Skipping expired subscription ${subscription._id} due to missing populated user or subscription data.`
        );
        return; // Skip this subscription if any required data is missing
      }

      const userId = (subscription.user_id as IUser)._id.toString();
      const subscriptionId = (
        subscription.subscription_id as unknown as ISubscription
      )._id as mongoose.Types.ObjectId;

      if (!userSubscriptionsMap.has(userId)) {
        userSubscriptionsMap.set(userId, []);
      }
      userSubscriptionsMap.get(userId)?.push(subscriptionId);
    });

    // Update each user's subscription status
    const updatePromises = Array.from(userSubscriptionsMap.entries()).map(
      async ([userId, expiredSubscriptionIds]) => {
        const activeSubscriptions = await UserSubscription.find({
          user_id: userId,
          end_date: { $gt: currentDate },
        })
          .sort({ end_date: -1 })
          .session(session);

        await User.findByIdAndUpdate(userId, {
          $pull: { subscriptions: { $in: expiredSubscriptionIds } },
          subscribed: activeSubscriptions.length > 0,
          active_subscription:
            activeSubscriptions.length > 0 ? activeSubscriptions[0]._id : null,
        }).session(session);
      }
    );

    await Promise.all(updatePromises);

    // Delete expired subscriptions
    await UserSubscription.deleteMany({
      _id: { $in: expiredSubscriptions.map((sub) => sub._id) },
    }).session(session);

    return expiredSubscriptions;
  }

  private async findSubscriptionsNearingExpiry(
    session: mongoose.ClientSession
  ) {
    const currentDate = new Date();
    const warningDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    return UserSubscription.find({
      end_date: {
        $gt: currentDate,
        $lte: warningDate,
      },
    })
      .populate("subscription_id", "name")
      .populate("user_id", "names email phone_number")
      .session(session);
  }

  private async sendNotifications(subscriptions: any[], isExpired: boolean) {
    const notifications = subscriptions.map((sub) => ({
      subscriptionName: sub.subscription_id.name,
      expiryDate: sub.end_date,
      userId: sub.user_id._id.toString(),
      userName: sub.user_id.names,
      userEmail: sub.user_id.email,
      userPhone: sub.user_id.phone_number,
    }));

    await notificationService.processSubscriptionNotifications(notifications);
  }

  private async processSubscriptions() {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      logger.info("Starting subscription processing");

      // Process expired subscriptions
      const expiredSubscriptions = await this.processExpiredSubscriptions(
        session
      );

      // Find subscriptions nearing expiry
      const warningSubscriptions = await this.findSubscriptionsNearingExpiry(
        session
      );

      await session.commitTransaction();

      // Send notifications after successful transaction
      if (expiredSubscriptions.length > 0) {
        await this.sendNotifications(expiredSubscriptions, true);
        logger.info(
          `Processed ${expiredSubscriptions.length} expired subscriptions`
        );
      }

      if (warningSubscriptions.length > 0) {
        await this.sendNotifications(warningSubscriptions, false);
        logger.info(
          `Sent warnings for ${warningSubscriptions.length} subscriptions nearing expiry`
        );
      }

      logger.info("Subscription processing completed successfully");
    } catch (error) {
      await session.abortTransaction();
      logger.error("Error in subscription processing:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async forceProcess() {
    logger.info("Forcing immediate subscription processing");
    await this.processSubscriptions();
  }

  updateSchedule(newSchedule: string) {
    try {
      // Validate cron schedule
      if (!cron.validate(newSchedule)) {
        throw new Error("Invalid cron schedule format");
      }

      this.cronJob.stop();
      this.cronJob = cron.schedule(newSchedule, () => {
        this.processSubscriptions();
      });
      this.cronJob.start();

      logger.info(`Cron schedule updated to: ${newSchedule}`);
    } catch (error) {
      logger.error("Failed to update cron schedule:", error);
      throw error;
    }
  }

  // Utility method to get current schedule
  getCurrentSchedule(): string {
    return this.cronSchedule;
  }

  // Method to check service status
  getServiceStatus() {
    return {
      isRunning: !!this.cronJob,
      currentSchedule: this.cronSchedule,
      nextRun: this.getNextRunTime(),
    };
  }

  private getNextRunTime(): Date {
    try {
      const interval = cronParser.default.parseExpression(this.cronSchedule); // Use .default to fix the issue
      return interval.next().toDate();
    } catch (error) {
      console.error("❌ Error parsing cron schedule:", error);
      return new Date();
    }
  }
}

export default new SubscriptionCleanupService();
