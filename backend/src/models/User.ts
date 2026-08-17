import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type UserRole = 'admin' | 'koordynator' | 'czlonek';

export const USER_ROLES: UserRole[] = ['admin', 'koordynator', 'czlonek'];

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  organization: Types.ObjectId;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'Imię jest wymagane'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Nazwisko jest wymagane'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Adres email jest wymagany'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Podaj poprawny adres email'],
    },
    password: {
      type: String,
      required: [true, 'Hasło jest wymagane'],
      minlength: [6, 'Hasło musi mieć minimum 6 znaków'],
    },
    phone: {
      type: String,
      required: [true, 'Numer telefonu jest wymagany'],
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: 'Nieprawidłowa rola: {VALUE}',
      },
      default: 'czlonek',
      required: [true, 'Rola jest wymagana'],
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Przypisanie do organizacji jest wymagane'],
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
