import { Response } from 'express';
import bcrypt from 'bcrypt';
import { User, Organization, Municipality } from '../models';
import { AuthenticatedRequest } from '../middleware/protect';

/**
 * @desc    Pobiera listę użytkowników oczekujących na weryfikację (isVerified: false)
 * @route   GET /api/admin/users/pending
 * @access  Private (wymaga protect i adminOnly)
 */
export const getPendingUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const pendingUsers = await User.findAll({
      where: { isVerified: false },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Organization,
          as: 'organization',
          include: [
            {
              model: Municipality,
              as: 'municipality',
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: pendingUsers.length,
      data: pendingUsers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania użytkowników oczekujących na weryfikację.',
      error: error.message,
    });
  }
};

/**
 * @desc    Weryfikuje użytkownika (zmienia isVerified na true)
 * @route   PATCH /api/admin/users/:id/verify
 * @access  Private (wymaga protect i adminOnly)
 */
export const verifyUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Użytkownik o podanym identyfikatorze nie został znaleziony.',
      });
      return;
    }

    user.isVerified = true;
    await user.save();

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Organization,
          as: 'organization',
          include: [
            {
              model: Municipality,
              as: 'municipality',
            },
          ],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Użytkownik został pomyślnie zweryfikowany.',
      data: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas weryfikacji użytkownika.',
      error: error.message,
    });
  }
};

/**
 * @desc    Odrzuca weryfikację użytkownika (usuwa konto oczekujące)
 * @route   DELETE /api/admin/users/:id/reject
 * @access  Private (wymaga protect i adminOnly)
 */
export const rejectUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Użytkownik o podanym identyfikatorze nie został znaleziony.',
      });
      return;
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'Wniosek o rejestrację został odrzucony, a konto usunięte.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas odrzucania użytkownika.',
      error: error.message,
    });
  }
};

/**
 * ============================================================================
 * CRUD PRACOWNIKÓW / UŻYTKOWNIKÓW (USERS)
 * ============================================================================
 */

/**
 * @desc    Pobiera wszystkich użytkowników/pracowników systemu
 * @route   GET /api/admin/users
 * @access  Private (adminOnly)
 */
export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Organization,
          as: 'organization',
          include: [
            {
              model: Municipality,
              as: 'municipality',
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania listy pracowników.',
      error: error.message,
    });
  }
};

/**
 * @desc    Tworzy nowego pracownika w systemie
 * @route   POST /api/admin/users
 * @access  Private (adminOnly)
 */
export const createUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { firstName, lastName, email, password, phone, role, organizationId, isVerified } = req.body;

    if (!firstName || !lastName || !email || !password || !phone || !organizationId) {
      res.status(400).json({
        success: false,
        message: 'Wszystkie podstawowe pola oraz organizacja są wymagane.',
      });
      return;
    }

    const existingUser = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'Użytkownik o podanym adresie e-mail już istnieje.',
      });
      return;
    }

    const org = await Organization.findByPk(organizationId);
    if (!org) {
      res.status(404).json({
        success: false,
        message: 'Wybrana organizacja nie istnieje.',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone.trim(),
      role: role || 'czlonek',
      organizationId,
      isVerified: isVerified === undefined ? true : Boolean(isVerified),
    });

    const populatedUser = await User.findByPk(newUser.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Organization,
          as: 'organization',
          include: [
            {
              model: Municipality,
              as: 'municipality',
            },
          ],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Pracownik został pomyślnie utworzony.',
      data: populatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas tworzenia pracownika.',
      error: error.message,
    });
  }
};

/**
 * @desc    Aktualizuje dane pracownika
 * @route   PUT /api/admin/users/:id
 * @access  Private (adminOnly)
 */
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, role, organizationId, isVerified, password } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Pracownik o podanym ID nie został odnaleziony.',
      });
      return;
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({
        where: { email: email.toLowerCase().trim() },
      });
      if (existing && existing.id !== user.id) {
        res.status(409).json({
          success: false,
          message: 'Inny użytkownik korzysta już z tego adresu e-mail.',
        });
        return;
      }
      user.email = email.toLowerCase().trim();
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (phone) user.phone = phone.trim();
    if (role) user.role = role;
    if (isVerified !== undefined) user.isVerified = Boolean(isVerified);

    if (organizationId) {
      const org = await Organization.findByPk(organizationId);
      if (!org) {
        res.status(404).json({
          success: false,
          message: 'Wybrana organizacja nie istnieje.',
        });
        return;
      }
      user.organizationId = organizationId;
    }

    if (password && password.trim().length >= 6) {
      user.password = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();

    const populatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Organization,
          as: 'organization',
          include: [
            {
              model: Municipality,
              as: 'municipality',
            },
          ],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Dane pracownika zostały pomyślnie zaktualizowane.',
      data: populatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas aktualizacji pracownika.',
      error: error.message,
    });
  }
};

/**
 * @desc    Szybkie przypisanie pracownika do organizacji
 * @route   PATCH /api/admin/users/:id/assign-organization
 * @access  Private (adminOnly)
 */
export const assignUserOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { organizationId } = req.body;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Identyfikator organizacji jest wymagany.',
      });
      return;
    }

    const [user, org] = await Promise.all([
      User.findByPk(id),
      Organization.findByPk(organizationId),
    ]);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Użytkownik nie został odnaleziony.',
      });
      return;
    }

    if (!org) {
      res.status(404).json({
        success: false,
        message: 'Organizacja nie została odnaleziona.',
      });
      return;
    }

    user.organizationId = org.id;
    await user.save();

    const populatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Organization,
          as: 'organization',
          include: [
            {
              model: Municipality,
              as: 'municipality',
            },
          ],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: `Pracownik został pomyślnie przypisany do organizacji "${org.name}".`,
      data: populatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas przypisywania pracownika do organizacji.',
      error: error.message,
    });
  }
};

/**
 * @desc    Usuwa konto pracownika z systemu
 * @route   DELETE /api/admin/users/:id
 * @access  Private (adminOnly)
 */
export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Użytkownik o podanym identyfikatorze nie został znaleziony.',
      });
      return;
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'Konto pracownika zostało pomyślnie usunięte z systemu.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas usuwania pracownika.',
      error: error.message,
    });
  }
};

/**
 * ============================================================================
 * CRUD ORGANIZACJI (ORGANIZATIONS)
 * ============================================================================
 */

/**
 * @desc    Pobiera wszystkie organizacje wraz z przypisanymi pracownikami
 * @route   GET /api/admin/organizations
 * @access  Private (adminOnly)
 */
export const getAllOrganizations = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const organizations = await Organization.findAll({
      include: [
        {
          model: Municipality,
          as: 'municipality',
        },
        {
          model: User,
          as: 'users',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'isVerified'],
        },
      ],
      order: [['name', 'ASC']],
    });

    res.status(200).json({
      success: true,
      count: organizations.length,
      data: organizations,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania listy organizacji.',
      error: error.message,
    });
  }
};

/**
 * @desc    Tworzy nową organizację w systemie
 * @route   POST /api/admin/organizations
 * @access  Private (adminOnly)
 */
export const createOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, type, municipalityId, municipalityName } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Nazwa organizacji jest wymagana.',
      });
      return;
    }

    let targetMunicipalityId = municipalityId;

    if (!targetMunicipalityId && municipalityName && municipalityName.trim()) {
      const [muni] = await Municipality.findOrCreate({
        where: { name: municipalityName.trim() },
        defaults: { name: municipalityName.trim() },
      });
      targetMunicipalityId = muni.id;
    }

    if (!targetMunicipalityId) {
      const defaultMuni = await Municipality.findOne();
      if (defaultMuni) {
        targetMunicipalityId = defaultMuni.id;
      } else {
        const newMuni = await Municipality.create({ name: 'Ogólnokrajowa' });
        targetMunicipalityId = newMuni.id;
      }
    }

    const newOrg = await Organization.create({
      name: name.trim(),
      type: type || 'sluzby',
      municipalityId: targetMunicipalityId,
    });

    const populatedOrg = await Organization.findByPk(newOrg.id, {
      include: [
        {
          model: Municipality,
          as: 'municipality',
        },
        {
          model: User,
          as: 'users',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'isVerified'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Organizacja została pomyślnie zarejestrowana w systemie.',
      data: populatedOrg,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas tworzenia organizacji.',
      error: error.message,
    });
  }
};

/**
 * @desc    Aktualizuje organizację
 * @route   PUT /api/admin/organizations/:id
 * @access  Private (adminOnly)
 */
export const updateOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, type, municipalityId } = req.body;

    const org = await Organization.findByPk(id);
    if (!org) {
      res.status(404).json({
        success: false,
        message: 'Organizacja o podanym identyfikatorze nie istnieje.',
      });
      return;
    }

    if (name) org.name = name.trim();
    if (type) org.type = type;
    if (municipalityId) org.municipalityId = municipalityId;

    await org.save();

    const populatedOrg = await Organization.findByPk(org.id, {
      include: [
        {
          model: Municipality,
          as: 'municipality',
        },
        {
          model: User,
          as: 'users',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'isVerified'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Dane organizacji zostały pomyślnie zaktualizowane.',
      data: populatedOrg,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas aktualizacji organizacji.',
      error: error.message,
    });
  }
};

/**
 * @desc    Usuwa organizację
 * @route   DELETE /api/admin/organizations/:id
 * @access  Private (adminOnly)
 */
export const deleteOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const org = await Organization.findByPk(id, {
      include: [{ model: User, as: 'users' }],
    });

    if (!org) {
      res.status(404).json({
        success: false,
        message: 'Organizacja nie została odnaleziona.',
      });
      return;
    }

    await org.destroy();

    res.status(200).json({
      success: true,
      message: 'Organizacja została pomyślnie usunięta.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas usuwania organizacji.',
      error: error.message,
    });
  }
};

/**
 * @desc    Pobiera listę wszystkich gmin
 * @route   GET /api/admin/municipalities
 * @access  Private (adminOnly)
 */
export const getAllMunicipalities = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const municipalities = await Municipality.findAll({
      order: [['name', 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: municipalities,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania gmin.',
      error: error.message,
    });
  }
};
