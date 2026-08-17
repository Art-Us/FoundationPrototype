import { Request, Response } from 'express';
import { Alert } from '../models/Alert';
import { Organization } from '../models/Organization';
import { AuthenticatedRequest } from '../middleware/protect';

/**
 * @desc    Pobiera wszystkie aktywne alerty (publiczny dostęp)
 * @route   GET /api/alerts/public
 * @access  Public
 */
export const getPublicAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await Alert.find({ isActive: true })
      .populate({
        path: 'author',
        select: 'firstName lastName email role organization',
        populate: {
          path: 'organization',
          select: 'name type',
        },
      })
      .populate('municipality', 'name')
      .sort({ createdAt: -1 });

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

    const alerts = await Alert.find({ municipality: municipalityId })
      .populate({
        path: 'author',
        select: 'firstName lastName email role organization',
        populate: {
          path: 'organization',
          select: 'name type',
        },
      })
      .populate('municipality', 'name')
      .sort({ createdAt: -1 });

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
 * @desc    Tworzy nowy alert
 * @route   POST /api/alerts
 * @access  Private (wymaga protect)
 */
export const createAlert = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { content, category, municipality } = req.body;

    if (!content || !category) {
      res.status(400).json({
        success: false,
        message: 'Treść (content) oraz kategoria (category) są wymagane.',
      });
      return;
    }

    let targetMunicipality = municipality;

    // Jeśli gmina nie została przekazana w ciele żądania, pobierz ją z organizacji użytkownika
    if (!targetMunicipality && req.user?.organization) {
      const userOrg = await Organization.findById(req.user.organization);
      if (userOrg) {
        targetMunicipality = userOrg.municipality;
      }
    }

    if (!targetMunicipality) {
      res.status(400).json({
        success: false,
        message: 'Przypisanie do gminy (municipality) jest wymagane.',
      });
      return;
    }

    const alert = await Alert.create({
      content,
      category,
      municipality: targetMunicipality,
      author: req.user!._id,
      isActive: true,
    });

    const populatedAlert = await Alert.findById(alert._id)
      .populate({
        path: 'author',
        select: 'firstName lastName email role organization',
        populate: {
          path: 'organization',
          select: 'name type',
        },
      })
      .populate('municipality', 'name');

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
 * @desc    Dezaktywuje alert (isActive = false) po weryfikacji przynależności do gminy/organizacji
 * @route   PATCH /api/alerts/:id/deactivate
 * @access  Private (wymaga protect)
 */
export const deactivateAlert = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const alert = await Alert.findById(id);
    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert o podanym identyfikatorze nie istnieje.',
      });
      return;
    }

    const user = req.user!;
    const isAuthor = alert.author.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    // Pobranie organizacji użytkownika w celu sprawdzenia gminy i organizacji
    let userMunicipalityId: string | null = null;
    let userOrgId: string | null = user.organization ? user.organization.toString() : null;

    if (user.organization) {
      const userOrg = await Organization.findById(user.organization);
      if (userOrg) {
        userMunicipalityId = userOrg.municipality.toString();
      }
    }

    const isSameMunicipality = userMunicipalityId && userMunicipalityId === alert.municipality.toString();

    // Dostęp ma admin, autor lub użytkownik ze zgodnej gminy
    if (!isAdmin && !isAuthor && !isSameMunicipality) {
      res.status(403).json({
        success: false,
        message: 'Dostęp zabroniony. Możesz dezaktywować wyłącznie alerty ze swojej gminy lub organizacji.',
      });
      return;
    }

    alert.isActive = false;
    await alert.save();

    const updatedAlert = await Alert.findById(alert._id)
      .populate({
        path: 'author',
        select: 'firstName lastName email role organization',
        populate: {
          path: 'organization',
          select: 'name type',
        },
      })
      .populate('municipality', 'name');

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
