import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type OrganizationType = 'samorzad' | 'sluzby' | 'ngo';

export const ORGANIZATION_TYPES: OrganizationType[] = ['samorzad', 'sluzby', 'ngo'];

export interface IOrganization extends Document {
  name: string;
  type: OrganizationType;
  municipality: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, 'Nazwa organizacji jest wymagana'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ORGANIZATION_TYPES,
        message: 'Nieprawidłowy typ organizacji: {VALUE}',
      },
      required: [true, 'Typ organizacji jest wymagany'],
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

export const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;
