import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { IUserSubscription } from "./UserSubscription";

export interface IUser extends Document {
  names: string;
  email: string;
  phone_number: string;
  country: string;
  address: string;
  birth_date: Date;
  subscribed: boolean;
  hasFreeTrial: boolean;
  city: string;
  password: string;
  allowedToDownloadGazette: boolean;
  subscriptions: IUserSubscription[];
  active_subscription: IUserSubscription | null;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  names: { type: String, required: true },
  email: { type: String, unique: true, required: false },
  phone_number: { type: String, required: true, unique: true },
  country: { type: String, required: false },
  city: { type: String, required: false },
  address: { type: String, required: false },
  birth_date: { type: Date, required: false },
  subscribed: { type: Boolean, default: false },
  hasFreeTrial: { type: Boolean, default: true },
  password: { type: String, required: true },
  allowedToDownloadGazette: { type: Boolean, default: false },
  subscriptions: [{ type: Schema.Types.ObjectId, ref: "UserSubscription" }],
  active_subscription: {
    type: Schema.Types.ObjectId,
    ref: "UserSubscription",
    default: null,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
