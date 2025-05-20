import { Request, Response } from "express";
import dotenv from "dotenv";
import smsService from "../services/sms.service";
import emailService from "../services/email.service";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER

export const sendMessage = async (req: Request, res: Response) => {
  const { names,phone_number,email,message} = req.body;
  if(!names||!phone_number||!message){
    res.status(400).json({ error: "Both names, Phone number and message body are required." });
    return;
  }
  try {
    smsService.sendSMS(phone_number,"Dear, estemed customer your message to us was received successfully. We will reach out to you soon!!");
    if (email) {
          await emailService.sendEmail({
            to: email,
            subject: "Message Received",
            html: `<p>Dear ${names}, your message to us was received successfully. We will reach out to you soon!!</p>`
          });
    }
    let haveEmail = ""
    if(email){
      haveEmail =`and email ${email} `;
    }
    if(ADMIN_PHONE_NUMBER){
      smsService.sendSMS(ADMIN_PHONE_NUMBER,`Dear Umuhanda, ${names} with Phone number ${phone_number} ${haveEmail} is contacting you. Message is "${message}"`);
    }
    if (ADMIN_EMAIL) {
          await emailService.sendEmail({
            to: ADMIN_EMAIL,
            subject: "Client's Message",
            html: `<p>Dear Umuhanda, <strong>${names}</strong> with Phone number <strong>${phone_number}</strong> ${haveEmail} is contacting you. Message is <strong>"${message}"</strong></p>`
          });
    }
    res.status(201).json({ message: "Message was sent successfully!" });
  } catch (error) {
    res.status(400).json({ error: "Sending message failed."+error });
  }
};
