import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AlertHistoryEvent {
  id: string;
  action: 'created' | 'deactivated' | 'reactivated' | 'updated';
  timestamp: string;
  userName?: string;
  organizationName?: string;
  details?: string;
}

export interface ResourceAllocationRecord {
  id: string;
  resourceId?: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  userName: string;
  quantity: number;
  allocatedAt: string;
  note?: string;
}

export interface NeededResourceItem {
  id: string;
  resourceType: 'ludzie' | 'woda' | 'sprzet' | 'inne' | string;
  name: string;
  quantityNeeded: number;
  quantityAllocated: number;
  unit: string;
  urgency?: 'niski' | 'średni' | 'wysoki' | 'krytyczny';
  allocations?: ResourceAllocationRecord[];
}

export interface PostChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  organizationName?: string;
  role?: string;
  content: string;
  createdAt: string;
}

export interface AlertPostItem {
  id: string;
  authorId: string;
  authorName: string;
  organizationName?: string;
  role?: string;
  title: string;
  content: string;
  postType?: 'raport_terenowy' | 'komunikat_sztabowy' | 'logistyka' | 'ogolne' | string;
  createdAt: string;
  messages: PostChatMessage[];
}

export interface AlertAttributes {
  id: string;
  content: string;
  category: string;
  isActive: boolean;
  authorId: string;
  municipalityId: string;
  locationName?: string | null;
  county?: string | null;
  voivodeship?: string | null;
  lat?: number | null;
  lng?: number | null;
  history?: AlertHistoryEvent[] | null;
  neededResources?: NeededResourceItem[] | null;
  posts?: AlertPostItem[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlertCreationAttributes
  extends Optional<
    AlertAttributes,
    | 'id'
    | 'isActive'
    | 'locationName'
    | 'county'
    | 'voivodeship'
    | 'lat'
    | 'lng'
    | 'history'
    | 'neededResources'
    | 'posts'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class Alert
  extends Model<AlertAttributes, AlertCreationAttributes>
  implements AlertAttributes
{
  declare id: string;
  declare content: string;
  declare category: string;
  declare isActive: boolean;
  declare authorId: string;
  declare municipalityId: string;
  declare locationName: string | null;
  declare county: string | null;
  declare voivodeship: string | null;
  declare lat: number | null;
  declare lng: number | null;
  declare history: AlertHistoryEvent[] | null;
  declare neededResources: NeededResourceItem[] | null;
  declare posts: AlertPostItem[] | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Alert.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Treść komunikatu jest wymagana' },
      },
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Kategoria komunikatu jest wymagana' },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    municipalityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'municipalities',
        key: 'id',
      },
    },
    locationName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    county: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    voivodeship: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lat: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    lng: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    history: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    neededResources: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    posts: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: 'alerts',
    timestamps: true,
  }
);

export default Alert;
