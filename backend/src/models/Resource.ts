import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ResourceType = 'ludzie' | 'woda' | 'sprzet' | 'inne';
export type ResourceTimeframe = '24h' | '48h' | '72h' | 'tydzien';

export const RESOURCE_TYPES: ResourceType[] = ['ludzie', 'woda', 'sprzet', 'inne'];
export const RESOURCE_TIMEFRAMES: ResourceTimeframe[] = ['24h', '48h', '72h', 'tydzien'];

export interface IResource extends Document {
  organization: Types.ObjectId;
  type: ResourceType;
  quantity: number;
  timeframe: ResourceTimeframe;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema = new Schema<IResource>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Przypisanie do organizacji jest wymagane'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: RESOURCE_TYPES,
        message: 'Nieprawidłowy typ zasobu: {VALUE}',
      },
      required: [true, 'Typ zasobu jest wymagany'],
    },
    quantity: {
      type: Number,
      required: [true, 'Ilość zasobu jest wymagana'],
      min: [0, 'Ilość nie może być ujemna'],
    },
    timeframe: {
      type: String,
      enum: {
        values: RESOURCE_TIMEFRAMES,
        message: 'Nieprawidłowy horyzont czasowy: {VALUE}',
      },
      required: [true, 'Horyzont czasowy jest wymagany'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Resource: Model<IResource> =
  mongoose.models.Resource || mongoose.model<IResource>('Resource', ResourceSchema);

export default Resource;
