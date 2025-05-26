import { Request, Response } from "express";
import dotenv from "dotenv";
import smsService from "../services/sms.service";
import emailService from "../services/email.service";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER;

export const sendMessage = async (req: Request, res: Response) => {
  const { names, phone_number, email, message } = req.body;
  if (!names || !phone_number || !message) {
    res.status(400).json({
      error: "Both names, Phone number and message body are required.",
    });
    return;
  }
  try {
    smsService.sendSMS(
      phone_number,
      "Dear, estemed customer your message to us was received successfully. We will reach out to you soon!!"
    );
    if (email) {
      await emailService.sendEmail({
        to: email,
        subject: "Message Received",
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 24px; border-radius: 10px; border: 1px solid #e5e7eb; max-width: 520px; margin: auto;">
              <h2 style="color: #111827;">Dear ${names}, 👋</h2>
              <p style="font-size: 15px; color: #374151; line-height: 1.6;">
                Your message has been received successfully. 🎉
              </p>
              <p style="font-size: 15px; color: #374151; line-height: 1.6;">
                One of our team members will get back to you shortly. Thank you for reaching out to us!
              </p>
          
              <div style="margin-top: 30px; font-size: 13px; color: #9ca3af;">
                – The Umuhanda Team
              </div>
            </div>
          `,
      });
    }
    let haveEmail = "";
    if (email) {
      haveEmail = `and email ${email} `;
    }
    if (ADMIN_PHONE_NUMBER) {
      smsService.sendSMS(
        ADMIN_PHONE_NUMBER,
        `Dear Umuhanda, ${names} with Phone number ${phone_number} ${haveEmail} is contacting you. Message is "${message}"`
      );
    }
    if (ADMIN_EMAIL) {
      await emailService.sendEmail({
        to: ADMIN_EMAIL,
        subject: "Client's Message",
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #fdfdfd; padding: 24px; border-radius: 10px; border: 1px solid #e5e7eb; max-width: 540px; margin: auto;">
          <h2 style="color: #111827;">📬 New Contact Message</h2>
          <p style="font-size: 15px; color: #374151; margin-top: 10px;">
            <strong>${names}</strong> has sent a message through the Umuhanda platform.
          </p>
          <p style="font-size: 15px; color: #374151;">
            <strong>Phone Number:</strong> ${phone_number}<br/>
            <strong>Email:</strong> ${haveEmail}
          </p>
          <p style="font-size: 15px; color: #374151; margin-top: 16px;">
            <strong>Message:</strong><br/>
            <em style="color: #1f2937;">"${message}"</em>
          </p>
      
          <div style="margin-top: 30px; font-size: 13px; color: #9ca3af;">
            – Automated Notification from Umuhanda Platform
          </div>
        </div>
      `,
      });
    }
    res.status(201).json({ message: "Message was sent successfully!" });
  } catch (error) {
    res.status(400).json({ error: "Sending message failed." + error });
  }
};
