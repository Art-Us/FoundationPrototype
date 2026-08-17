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
    const { content, category, municipality, municipalityId, lat, lng } = req.body;

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

    const alert = await Alert.create({
      content,
      category,
      municipalityId: targetMunicipalityId,
      authorId: req.user!.id,
      isActive: true,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
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

    // Pobranie gminy użytkownika na podstawie jego organizacji
    let userMunicipalityId: string | null = null;
    if (user.organizationId) {
      const userOrg = await Organization.findByPk(user.organizationId);
      if (userOrg) {
        userMunicipalityId = userOrg.municipalityId;
      }
    }

    const isSameMunicipality = userMunicipalityId && userMunicipalityId === alert.municipalityId;

    // Dostęp ma admin, autor lub członek ze zgodnej gminy
    if (!isAdmin && !isAuthor && !isSameMunicipality) {
      res.status(403).json({
        success: false,
        message: 'Dostęp zabroniony. Możesz dezaktywować wyłącznie alerty ze swojej gminy lub organizacji.',
      });
      return;
    }

    alert.isActive = false;
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
