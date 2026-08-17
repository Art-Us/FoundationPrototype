import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IAlert extends Document {
  content: string;
  category: string;
  isActive: boolean;
  author: Types.ObjectId;
  municipality: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    content: {
      type: String,
      required: [true, 'Treść komunikatu jest wymagana'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Kategoria komunikatu jest wymagana'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Autor komunikatu jest wymagany'],
      index: true,
    },
    municipality: {
      type: Schema.Types.ObjectId,
      ref: 'Municipality',
      required: [true, 'Przypisanie do gminy jest wymagane'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Alert: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);

export default Alert;

