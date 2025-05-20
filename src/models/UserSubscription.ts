import mongoose, { Document, Schema } from "mongoose";
import { ISubscription } from "./Subscription";

export interface IUserSubscription extends Document {
  user_id: mongoose.Schema.Types.ObjectId;
  subscription: ISubscription;
  language: string,
  start_date: Date;
  end_date: Date;
  attempts_left: number;
}

const userSubscriptionSchema = new Schema<IUserSubscription>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  subscription: { type: Schema.Types.ObjectId, ref: "Subscription", required: true },
  language:{type: String, required:true},
  start_date:{ type: Date, required: true, default: Date.now() },
  end_date: { type: Date, required: true, default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
  attempts_left: { type: Number, required: false },
  
});

export default mongoose.model<IUserSubscription>("UserSubscription", userSubscriptionSchema);
