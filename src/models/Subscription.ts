import mongoose, { Document, Schema } from "mongoose";

export interface ISubscription extends Document {
  name: string;
  price: number;
  examAttemptsLimit?: number;
  validityDays: number;
}

const subscriptionSchema = new Schema<ISubscription>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  examAttemptsLimit: { type: Number, default: null },
  validityDays: { type: Number, required: false },
});

export default mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema
);
