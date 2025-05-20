import logger from "./logger.service";
import emailService from "./email.service";
import smsService from "./sms.service";
import { IUserSubscription } from "../models/UserSubscription";

interface ISubscriptionNotification {
  subscriptionName: string;
  expiryDate: Date;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
}

class NotificationService {
  private getTimeUntilExpiry(expiryDate: Date): string {
    const hours = Math.ceil(
      (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60)
    );

    if (hours <= 0) return "has expired";
    if (hours === 1) return "will expire in 1 hour";
    if (hours < 24) return `will expire in ${hours} hours`;

    const days = Math.floor(hours / 24);
    return `will expire in ${days} day${days > 1 ? "s" : ""}`;
  }

  private async sendExpiryEmail(
    notification: ISubscriptionNotification
  ): Promise<boolean> {
    if (!notification.userEmail) return false;

    const timeUntilExpiry = this.getTimeUntilExpiry(notification.expiryDate);
    const isExpired = timeUntilExpiry === "has expired";

    const subject = isExpired
      ? "Your subscription has expired"
      : "Your subscription is about to expire";

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Subscription ${isExpired ? "Expiration" : "Expiration Warning"}</h2>
        <p>Dear ${notification.userName},</p>
        <p>Your subscription <strong>${
          notification.subscriptionName
        }</strong> ${timeUntilExpiry}.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
          <p><strong>Subscription Details:</strong></p>
          <ul>
            <li>Name: ${notification.subscriptionName}</li>
            <li>Expiry Date: ${notification.expiryDate.toLocaleString()}</li>
          </ul>
        </div>
        <p>Please renew your subscription to continue enjoying our services.</p>
        <p>Best regards,<br>Umuhanda team</p>
      </div>
    `;

    return emailService.sendEmail({
      to: notification.userEmail,
      subject,
      html,
    });
  }

  private async sendExpirySMS(
    notification: ISubscriptionNotification
  ): Promise<boolean> {
    if (!notification.userPhone) return false;

    const timeUntilExpiry = this.getTimeUntilExpiry(notification.expiryDate);
    const message = `Hi ${notification.userName}, your subscription "${
      notification.subscriptionName
    }" ${timeUntilExpiry}. Expiry: ${notification.expiryDate.toLocaleString()}. Please renew to continue services.`;

    return smsService.sendSMS(notification.userPhone, message);
  }

  async sendSubscriptionNotification(
    notification: ISubscriptionNotification
  ): Promise<void> {
    const logContext = {
      userId: notification.userId,
      subscriptionName: notification.subscriptionName,
      expiryDate: notification.expiryDate,
    };

    try {
      const results = await Promise.allSettled([
        notification.userEmail
          ? this.sendExpiryEmail(notification)
          : Promise.resolve(false),
        notification.userPhone
          ? this.sendExpirySMS(notification)
          : Promise.resolve(false),
      ]);

      const [emailResult, smsResult] = results;

      // Log results
      if (emailResult.status === "fulfilled" && emailResult.value) {
        logger.info("Email notification sent successfully", logContext);
      }
      if (smsResult.status === "fulfilled" && smsResult.value) {
        logger.info("SMS notification sent successfully", logContext);
      }

      // Log failures
      if (
        emailResult.status === "rejected" ||
        (emailResult.status === "fulfilled" && !emailResult.value)
      ) {
        logger.error("Failed to send email notification", logContext);
      }
      if (
        smsResult.status === "rejected" ||
        (smsResult.status === "fulfilled" && !smsResult.value)
      ) {
        logger.error("Failed to send SMS notification", logContext);
      }
    } catch (error) {
      logger.error("Error in notification process", { ...logContext, error });
    }
  }

  async processSubscriptionNotifications(
    notifications: ISubscriptionNotification[]
  ): Promise<void> {
    // Process each notification independently
    await Promise.all(
      notifications.map((notification) =>
        this.sendSubscriptionNotification(notification)
      )
    );
  }
}

export default new NotificationService();
