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
  public id!: string;
  public content!: string;
  public category!: string;
  public isActive!: boolean;
  public authorId!: string;
  public municipalityId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
