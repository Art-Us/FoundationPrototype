import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sequelize, Municipality, Organization, User, Alert, Resource } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production';

export interface TestContext {
  municipality: Municipality;
  otherMunicipality: Municipality;
  organization: Organization;
  otherOrganization: Organization;
  adminUser: User;
  verifiedUser: User;
  unverifiedUser: User;
  otherMunicipalityUser: User;
  adminToken: string;
  verifiedToken: string;
  unverifiedToken: string;
  otherMunicipalityToken: string;
  activeAlert: Alert;
  resource: Resource;
}

/**
 * Inicjalizuje czystą bazę w pamięci RAM (:memory:) i wypełnia ją podstawowymi encjami testowymi
 */
export const setupTestDb = async (): Promise<TestContext> => {
  // force: true tworzy czyste tabele w bazie in-memory
  await sequelize.sync({ force: true });

  const municipality = await Municipality.create({ name: 'Gmina Testowa A' });
  const otherMunicipality = await Municipality.create({ name: 'Gmina Testowa B' });

  const organization = await Organization.create({
    name: 'OSP Test A',
    type: 'sluzby',
    municipalityId: municipality.id,
  });

  const otherOrganization = await Organization.create({
    name: 'OSP Test B',
    type: 'sluzby',
    municipalityId: otherMunicipality.id,
  });

  const hashedPassword = await bcrypt.hash('haslo123', 10);

  const adminUser = await User.create({
    firstName: 'Admin',
    lastName: 'Testowy',
    email: 'admin@test.pl',
    password: hashedPassword,
    phone: '+48111222333',
    role: 'admin',
    organizationId: organization.id,
    isVerified: true,
  });

  const verifiedUser = await User.create({
    firstName: 'Jan',
    lastName: 'Zweryfikowany',
    email: 'jan@test.pl',
    password: hashedPassword,
    phone: '+48222333444',
    role: 'czlonek',
    organizationId: organization.id,
    isVerified: true,
  });

  const unverifiedUser = await User.create({
    firstName: 'Niezweryfikowany',
    lastName: 'Uzytkownik',
    email: 'niezweryfikowany@test.pl',
    password: hashedPassword,
    phone: '+48333444555',
    role: 'czlonek',
    organizationId: organization.id,
    isVerified: false,
  });

  const otherMunicipalityUser = await User.create({
    firstName: 'Inny',
    lastName: 'Gminny',
    email: 'inny@test.pl',
    password: hashedPassword,
    phone: '+48444555666',
    role: 'czlonek',
    organizationId: otherOrganization.id,
    isVerified: true,
  });

  const adminToken = jwt.sign(
    { id: adminUser.id, email: adminUser.email, role: adminUser.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const verifiedToken = jwt.sign(
    { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const unverifiedToken = jwt.sign(
    { id: unverifiedUser.id, email: unverifiedUser.email, role: unverifiedUser.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const otherMunicipalityToken = jwt.sign(
    { id: otherMunicipalityUser.id, email: otherMunicipalityUser.email, role: otherMunicipalityUser.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const activeAlert = await Alert.create({
    content: 'Alert testowy aktywny',
    category: 'Ostrzeżenie powodziowe',
    isActive: true,
    authorId: verifiedUser.id,
    municipalityId: municipality.id,
  });

  const resource = await Resource.create({
    organizationId: organization.id,
    type: 'woda',
    quantity: 1000,
    timeframe: '24h',
    isActive: true,
  });

  return {
    municipality,
    otherMunicipality,
    organization,
    otherOrganization,
    adminUser,
    verifiedUser,
    unverifiedUser,
    otherMunicipalityUser,
    adminToken,
    verifiedToken,
    unverifiedToken,
    otherMunicipalityToken,
    activeAlert,
    resource,
  };
};

/**
 * Zamyka połączenie z bazą po zakończeniu testów
 */
export const closeTestDb = async (): Promise<void> => {
  await sequelize.close();
};
