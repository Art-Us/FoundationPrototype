import { sequelize } from '../config/database';
import Municipality from './Municipality';
import Organization from './Organization';
import User from './User';
import Alert from './Alert';
import Resource from './Resource';

// Relacje Municipality <-> Organization
Municipality.hasMany(Organization, {
  foreignKey: 'municipalityId',
  as: 'organizations',
  onDelete: 'CASCADE',
});
Organization.belongsTo(Municipality, {
  foreignKey: 'municipalityId',
  as: 'municipality',
});

// Relacje Organization <-> User
Organization.hasMany(User, {
  foreignKey: 'organizationId',
  as: 'users',
  onDelete: 'CASCADE',
});
User.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

// Relacje User <-> Alert (Autor)
User.hasMany(Alert, {
  foreignKey: 'authorId',
  as: 'alerts',
  onDelete: 'CASCADE',
});
Alert.belongsTo(User, {
  foreignKey: 'authorId',
  as: 'author',
});

// Relacje Municipality <-> Alert
Municipality.hasMany(Alert, {
  foreignKey: 'municipalityId',
  as: 'alerts',
  onDelete: 'CASCADE',
});
Alert.belongsTo(Municipality, {
  foreignKey: 'municipalityId',
  as: 'municipality',
});

// Relacje Organization <-> Resource
Organization.hasMany(Resource, {
  foreignKey: 'organizationId',
  as: 'resources',
  onDelete: 'CASCADE',
});
Resource.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

export * from './Municipality';
export * from './Organization';
export * from './User';
export * from './Alert';
export * from './Resource';
export { sequelize };

