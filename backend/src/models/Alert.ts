import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AlertAttributes {
  id: string;
  content: string;
  category: string;
  isActive: boolean;
  authorId: string;
  municipalityId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlertCreationAttributes
  extends Optional<AlertAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

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
  },
  {
    sequelize,
    tableName: 'alerts',
    timestamps: true,
  }
);

export default Alert;
