import dotenv from "dotenv";

const IremboPay = require("@irembo/irembopay-node-sdk").default;

dotenv.config();

export const iPay = new IremboPay(
  process.env.IPAY_SECRET_KEY,
  process.env.IPAY_ENVIRONMENT === "sandbox" ? "sandbox" : "live"
);
