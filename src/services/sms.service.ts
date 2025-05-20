import axios from "axios";
import dotenv from "dotenv";
import logger from "./logger.service";

dotenv.config();

class SMSService {
  private readonly INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL;
  private readonly INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
  private readonly INFOBIP_SENDER_ID = process.env.INFOBIP_SENDER_ID; // Example: "MyCompany"
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  constructor() {
    if (
      !this.INFOBIP_BASE_URL ||
      !this.INFOBIP_API_KEY ||
      !this.INFOBIP_SENDER_ID
    ) {
      throw new Error(
        "Infobip configuration is missing in environment variables."
      );
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sendSMS(to: string, message: string, retryCount = 0): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.INFOBIP_BASE_URL}/sms/2/text/advanced`,
        {
          messages: [
            {
              from: this.INFOBIP_SENDER_ID,
              destinations: [{ to }],
              text: message,
            },
          ],
        },
        {
          headers: {
            Authorization: `App ${this.INFOBIP_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.messages) {
        logger.info(`✅ SMS sent successfully to ${to}`);
        return true;
      } else {
        throw new Error("Infobip response did not contain a success message.");
      }
    } catch (error: any) {
      logger.error(`❌ Failed to send SMS to ${to}`, error.message);
      console.log(error);

      if (retryCount < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.sendSMS(to, message, retryCount + 1);
      }

      return false;
    }
  }
}

export default new SMSService();
