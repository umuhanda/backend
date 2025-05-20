import nodemailer from "nodemailer";
import logger from "./logger.service";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function generateEmailTemplate(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="padding: 20px; text-align: center; background-color:rgb(156, 190, 240);">
          <img src=${`https://umuhanda.netlify.app/Umuhanda_logo.png`} alt="Company Logo" style="max-height: 50px;" />
        </div>
        <div style="padding: 30px; color: #333;">
          ${content}
        </div>
        <div style="padding: 20px; text-align: center; font-size: 12px; color: #999; background-color: #f0f0f0;">
          <p>If you need help, contact us at <a href="mailto:support@umuhanda.com">support@umuhanda.com</a> or call +250 787 787 878</p>
          <p>&copy; ${new Date().getFullYear()} Umuhanda. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sendEmail(options: EmailOptions, retryCount = 0): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: options.to,
        subject: options.subject,
        html: generateEmailTemplate(options.html),
      });

      logger.info(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}`, error);

      if (retryCount < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.sendEmail(options, retryCount + 1);
      }

      return false;
    }
  }

  // Verify SMTP connection
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error("Failed to verify email connection", error);
      return false;
    }
  }
}

export default new EmailService();
