import mongoose, { Document, Schema } from "mongoose";

export interface IExamAttempt extends Document {
  user_id: mongoose.Schema.Types.ObjectId;
  attempt_date: Date;
  score: number;
}

const examAttemptSchema = new Schema<IExamAttempt>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  attempt_date: { type: Date, required: true },
  score: { type: Number, required: true },
});

export default mongoose.model<IExamAttempt>("ExamAttempt", examAttemptSchema);