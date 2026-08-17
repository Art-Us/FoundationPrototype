import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type ResourceType = 'ludzie' | 'woda' | 'sprzet' | 'inne';
export type ResourceTimeframe = '24h' | '48h' | '72h' | 'tydzien';

export const RESOURCE_TYPES: ResourceType[] = ['ludzie', 'woda', 'sprzet', 'inne'];
export const RESOURCE_TIMEFRAMES: ResourceTimeframe[] = ['24h', '48h', '72h', 'tydzien'];

export interface ResourceAttributes {
  id: string;
  organizationId: string;
  type: ResourceType;
  subcategory?: string | null;
  quantity: number;
  timeframe: ResourceTimeframe;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ResourceCreationAttributes
  extends Optional<ResourceAttributes, 'id' | 'subcategory' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class Resource
  extends Model<ResourceAttributes, ResourceCreationAttributes>
  implements ResourceAttributes
{
  declare id: string;
  declare organizationId: string;
  declare type: ResourceType;
  declare subcategory: string | null;
  declare quantity: number;
  declare timeframe: ResourceTimeframe;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Resource.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'organizations',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [RESOURCE_TYPES],
          msg: 'Nieprawidłowy typ zasobu',
        },
      },
    },
    subcategory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Ilość nie może być ujemna',
        },
      },
    },
    timeframe: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [RESOURCE_TIMEFRAMES],
          msg: 'Nieprawidłowy horyzont czasowy',
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'resources',
    timestamps: true,
  }
);

export default Resource;
