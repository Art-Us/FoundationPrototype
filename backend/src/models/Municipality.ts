import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMunicipality extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const MunicipalitySchema = new Schema<IMunicipality>(
  {
    name: {
      type: String,
      required: [true, 'Nazwa gminy jest wymagana'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Municipality: Model<IMunicipality> =
  mongoose.models.Municipality || mongoose.model<IMunicipality>('Municipality', MunicipalitySchema);

export default Municipality;
