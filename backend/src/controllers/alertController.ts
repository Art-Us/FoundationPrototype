import { Request, Response } from 'express';
import { Alert, User, Organization, Municipality } from '../models';
import { AuthenticatedRequest } from '../middleware/protect';

/**
 * @desc    Pobiera wszystkie aktywne alerty (publiczny dostęp)
 * @route   GET /api/alerts/public
 * @access  Public
 */
export const getPublicAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await Alert.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name', 'type'],
            },
          ],
        },
        {
          model: Municipality,
          as: 'municipality',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania publicznych alertów.',
      error: error.message,
    });
  }
};

/**
 * @desc    Pobiera wszystkie alerty (aktywne i nieaktywne) dla danej gminy
 * @route   GET /api/alerts/municipality/:id
 * @access  Private (wymaga protect)
 */
export const getAlertsByMunicipality = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: municipalityId } = req.params;

    const alerts = await Alert.findAll({
      where: { municipalityId },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name', 'type'],
            },
          ],
        },
        {
          model: Municipality,
          as: 'municipality',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania alertów dla gminy.',
      error: error.message,
    });
  }
};

/**
 * @desc    Pobiera wszystkie alerty dla gminy zalogowanego użytkownika
 * @route   GET /api/alerts/my-municipality
 * @access  Private (wymaga protect)
 */
export const getMyMunicipalityAlerts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    let municipalityId = req.query.municipalityId as string;

    if (!municipalityId && req.user?.organizationId) {
      const userOrg = await Organization.findByPk(req.user.organizationId);
      if (userOrg) {
        municipalityId = userOrg.municipalityId;
      }
    }

    const whereClause: any = {};
    if (municipalityId) {
      whereClause.municipalityId = municipalityId;
    }

    const alerts = await Alert.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name', 'type'],
            },
          ],
        },
        {
          model: Municipality,
          as: 'municipality',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: alerts.length,
      municipalityId,
      data: alerts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania alertów dla Twojej gminy.',
      error: error.message,
    });
  }
};

/**
 * @desc    Tworzy nowy alert
 * @route   POST /api/alerts
 * @access  Private (wymaga protect)
 */
export const createAlert = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      content,
      category,
      municipality,
      municipalityId,
      locationName,
      county,
      voivodeship,
      lat,
      lng,
    } = req.body;

    if (!content || !category) {
      res.status(400).json({
        success: false,
        message: 'Treść (content) oraz kategoria (category) są wymagane.',
      });
      return;
    }

    let targetMunicipalityId = municipalityId || municipality;

    // Jeśli gmina nie została podana, pobierz ją z organizacji użytkownika
    if (!targetMunicipalityId && req.user?.organizationId) {
      const userOrg = await Organization.findByPk(req.user.organizationId);
      if (userOrg) {
        targetMunicipalityId = userOrg.municipalityId;
      }
    }

    if (!targetMunicipalityId) {
      res.status(400).json({
        success: false,
        message: 'Przypisanie do gminy (municipalityId) jest wymagane.',
      });
      return;
    }

    const userOrg = req.user?.organizationId
      ? await Organization.findByPk(req.user.organizationId)
      : null;

    const initialHistory = [
      {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        action: 'created' as const,
        timestamp: new Date().toISOString(),
        userName: req.user ? `${req.user.firstName} ${req.user.lastName}` : undefined,
        organizationName: userOrg?.name,
        details: 'Utworzenie i publikacja komunikatu kryzysowego',
      },
    ];

    const alert = await Alert.create({
      content,
      category,
      municipalityId: targetMunicipalityId,
      authorId: req.user!.id,
      isActive: true,
      locationName: locationName || null,
      county: county || null,
      voivodeship: voivodeship || null,
      lat: lat !== undefined && lat !== null && lat !== '' ? parseFloat(lat) : null,
      lng: lng !== undefined && lng !== null && lng !== '' ? parseFloat(lng) : null,
      history: initialHistory,
    });

    const populatedAlert = await Alert.findByPk(alert.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name', 'type'],
            },
          ],
        },
        {
          model: Municipality,
          as: 'municipality',
          attributes: ['id', 'name'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Alert został pomyślnie utworzony.',
      data: populatedAlert,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas tworzenia alertu.',
      error: error.message,
    });
  }
};

/**
 * @desc    Dezaktywuje alert (isActive = false) po weryfikacji uprawnień (gmina/organizacja)
 * @route   PATCH /api/alerts/:id/deactivate
 * @access  Private (wymaga protect)
 */
export const deactivateAlert = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByPk(id);
    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert o podanym identyfikatorze nie istnieje.',
      });
      return;
    }

    const user = req.user!;
    const isAuthor = alert.authorId === user.id;
    const isAdmin = user.role === 'admin';

    let userMunicipalityId: string | null = null;
    let userOrgName: string | undefined = undefined;
    if (user.organizationId) {
      const userOrg = await Organization.findByPk(user.organizationId);
      if (userOrg) {
        userMunicipalityId = userOrg.municipalityId;
        userOrgName = userOrg.name;
      }
    }

    const isSameMunicipality = userMunicipalityId && userMunicipalityId === alert.municipalityId;

    if (!isAdmin && !isAuthor && !isSameMunicipality) {
      res.status(403).json({
        success: false,
        message: 'Dostęp zabroniony. Możesz dezaktywować wyłącznie alerty ze swojej gminy lub organizacji.',
      });
      return;
    }

    const currentHistory = Array.isArray(alert.history) ? [...alert.history] : [];
    currentHistory.push({
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action: 'deactivated',
      timestamp: new Date().toISOString(),
      userName: `${user.firstName} ${user.lastName}`,
      organizationName: userOrgName,
      details: 'Odwołanie komunikatu kryzysowego (przeniesienie do archiwum)',
    });

    alert.isActive = false;
    alert.history = currentHistory;
    await alert.save();

    const updatedAlert = await Alert.findByPk(alert.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name', 'type'],
            },
          ],
        },
        {
          model: Municipality,
          as: 'municipality',
          attributes: ['id', 'name'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Alert został pomyślnie dezaktywowany.',
      data: updatedAlert,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas dezaktywacji alertu.',
      error: error.message,
    });
  }
};

/**
 * @desc    Reaktywuje alert (isActive = true) przenosząc go z powrotem do aktywnych
 * @route   PATCH /api/alerts/:id/reactivate
 * @access  Private (wymaga protect)
 */
export const reactivateAlert = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByPk(id);
    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert o podanym identyfikatorze nie istnieje.',
      });
      return;
    }

    const user = req.user!;
    const isAuthor = alert.authorId === user.id;
    const isAdmin = user.role === 'admin';

    let userMunicipalityId: string | null = null;
    let userOrgName: string | undefined = undefined;
    if (user.organizationId) {
      const userOrg = await Organization.findByPk(user.organizationId);
      if (userOrg) {
        userMunicipalityId = userOrg.municipalityId;
        userOrgName = userOrg.name;
      }
    }

    const isSameMunicipality = userMunicipalityId && userMunicipalityId === alert.municipalityId;

    if (!isAdmin && !isAuthor && !isSameMunicipality) {
      res.status(403).json({
        success: false,
        message: 'Dostęp zabroniony. Możesz reaktywować wyłącznie alerty ze swojej gminy lub organizacji.',
      });
      return;
    }

    const currentHistory = Array.isArray(alert.history) ? [...alert.history] : [];
    currentHistory.push({
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action: 'reactivated',
      timestamp: new Date().toISOString(),
      userName: `${user.firstName} ${user.lastName}`,
      organizationName: userOrgName,
      details: 'Wznowienie i ponowna publikacja komunikatu',
    });

    alert.isActive = true;
    alert.history = currentHistory;
    await alert.save();

    const updatedAlert = await Alert.findByPk(alert.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name', 'type'],
            },
          ],
        },
        {
          model: Municipality,
          as: 'municipality',
          attributes: ['id', 'name'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Alert został pomyślnie reaktywowany i ponownie opublikowany.',
      data: updatedAlert,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas reaktywacji alertu.',
      error: error.message,
    });
  }
};

/**
 * @desc    Aktualizuje treść, kategorię lub współrzędne istniejącego alertu
 * @route   PUT /api/alerts/:id
 * @access  Private (wymaga protect)
 */
export const updateAlert = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { content, category, locationName, county, voivodeship, lat, lng, isActive } = req.body;

    const alert = await Alert.findByPk(id);
    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert o podanym identyfikatorze nie istnieje.',
      });
      return;
    }

    const user = req.user!;
    const isAuthor = alert.authorId === user.id;
    const isAdmin = user.role === 'admin';

    let userMunicipalityId: string | null = null;
    let userOrgName: string | undefined = undefined;
    if (user.organizationId) {
      const userOrg = await Organization.findByPk(user.organizationId);
      if (userOrg) {
        userMunicipalityId = userOrg.municipalityId;
        userOrgName = userOrg.name;
      }
    }

    const isSameMunicipality = userMunicipalityId && userMunicipalityId === alert.municipalityId;

    if (!isAdmin && !isAuthor && !isSameMunicipality) {
      res.status(403).json({
        success: false,
        message: 'Dostęp zabroniony. Możesz edytować wyłącznie alerty ze swojej gminy lub organizacji.',
      });
      return;
    }

    if (content !== undefined) alert.content = content.trim();
    if (category !== undefined) alert.category = category;
    if (locationName !== undefined) alert.locationName = locationName || null;
    if (county !== undefined) alert.county = county || null;
    if (voivodeship !== undefined) alert.voivodeship = voivodeship || null;
    if (lat !== undefined) alert.lat = lat !== null && lat !== '' ? parseFloat(lat) : null;
    if (lng !== undefined) alert.lng = lng !== null && lng !== '' ? parseFloat(lng) : null;
    if (isActive !== undefined) alert.isActive = Boolean(isActive);

    const currentHistory = Array.isArray(alert.history) ? [...alert.history] : [];
    currentHistory.push({
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action: 'updated',
      timestamp: new Date().toISOString(),
      userName: `${user.firstName} ${user.lastName}`,
      organizationName: userOrgName,
      details: 'Aktualizacja parametrów lub treści komunikatu',
    });
    alert.history = currentHistory;

    await alert.save();

    const updatedAlert = await Alert.findByPk(alert.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name', 'type'],
            },
          ],
        },
        {
          model: Municipality,
          as: 'municipality',
          attributes: ['id', 'name'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Alert został pomyślnie zaktualizowany.',
      data: updatedAlert,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas aktualizacji alertu.',
      error: error.message,
    });
  }
};
