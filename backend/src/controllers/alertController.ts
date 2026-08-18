import { Request, Response } from 'express';
import { Alert, User, Organization, Municipality, Resource } from '../models';
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

    const rawNeeded = Array.isArray(req.body.neededResources) ? req.body.neededResources : [];
    const formattedNeededResources = rawNeeded
      .filter((nr: any) => nr && (nr.name || nr.resourceType))
      .map((nr: any, idx: number) => ({
        id: nr.id || `req-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        resourceType: nr.resourceType || 'inne',
        name: (nr.name || '').trim() || 'Zasób ratunkowy',
        quantityNeeded: Math.max(1, Number(nr.quantityNeeded) || 1),
        quantityAllocated: Number(nr.quantityAllocated) || 0,
        unit: (nr.unit || 'szt.').trim(),
        urgency: nr.urgency || 'wysoki',
        allocations: Array.isArray(nr.allocations) ? nr.allocations : [],
      }));

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
      neededResources: formattedNeededResources,
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

    if (req.body.neededResources !== undefined && Array.isArray(req.body.neededResources)) {
      alert.neededResources = req.body.neededResources;
      alert.changed('neededResources', true);
    }

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

/**
 * @desc    Pobiera wszystkie aktywne alerty wraz z zapotrzebowaniem dla panelu operacyjnego służb
 * @route   GET /api/alerts/operational
 * @access  Private (wymaga protect)
 */
export const getOperationalAlerts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
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
      message: 'Wystąpił błąd podczas pobierania alertów operacyjnych.',
      error: error.message,
    });
  }
};

/**
 * @desc    Przydziela zasoby organizacji do zapotrzebowania wskazanego alertu i odejmuje ze stanu magazynu
 * @route   POST /api/alerts/:id/allocate-resource
 * @access  Private (wymaga protect)
 */
export const allocateResourceToAlert = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { neededResourceId, quantity, resourceId, note } = req.body;

    if (!neededResourceId || !quantity || Number(quantity) <= 0) {
      res.status(400).json({
        success: false,
        message: 'Identyfikator zapotrzebowania (neededResourceId) oraz dodatnia ilość (quantity) są wymagane.',
      });
      return;
    }

    const alert = await Alert.findByPk(id);
    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert o podanym identyfikatorze nie istnieje.',
      });
      return;
    }

    if (!alert.isActive) {
      res.status(400).json({
        success: false,
        message: 'Nie można przydzielać zasobów do odwołanego / zarchiwizowanego komunikatu.',
      });
      return;
    }

    const user = req.user!;
    if (!user.organizationId) {
      res.status(400).json({
        success: false,
        message: 'Użytkownik musi być przypisany do organizacji, aby móc dysponować zasobami.',
      });
      return;
    }

    const userOrg = await Organization.findByPk(user.organizationId);
    if (!userOrg) {
      res.status(404).json({
        success: false,
        message: 'Organizacja użytkownika nie została odnaleziona.',
      });
      return;
    }

    const neededResources = Array.isArray(alert.neededResources)
      ? [...alert.neededResources]
      : [];

    const targetReqIndex = neededResources.findIndex((r) => r.id === neededResourceId);
    if (targetReqIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Wskazane zapotrzebowanie na zasób nie istnieje w tym alercie.',
      });
      return;
    }

    const targetReq = { ...neededResources[targetReqIndex] };
    const allocQuantity = Number(quantity);

    // Jeśli wskazano konkretny zasób z magazynu organizacji lub wyszukujemy zasób
    let matchedResource: Resource | null = null;
    if (resourceId) {
      matchedResource = await Resource.findByPk(resourceId);
      if (!matchedResource || matchedResource.organizationId !== userOrg.id) {
        res.status(403).json({
          success: false,
          message: 'Wskazany zasób nie należy do Twojej organizacji.',
        });
        return;
      }

      if (matchedResource.quantity < allocQuantity) {
        res.status(400).json({
          success: false,
          message: `Niewystarczający stan magazynowy. Dostępna ilość: ${matchedResource.quantity}, próbowano przekazać: ${allocQuantity}.`,
        });
        return;
      }

      // Odejmujemy ze stanu magazynowego organizacji!
      matchedResource.quantity -= allocQuantity;
      await matchedResource.save();
    } else {
      // Wyszukaj aktywny zasób organizacji
      const existingOrgResource = await Resource.findOne({
        where: {
          organizationId: userOrg.id,
          type: targetReq.resourceType as any,
          isActive: true,
        },
      });

      if (existingOrgResource && existingOrgResource.quantity >= allocQuantity) {
        existingOrgResource.quantity -= allocQuantity;
        await existingOrgResource.save();
        matchedResource = existingOrgResource;
      }
    }

    // Aktualizacja zapotrzebowania w alercie
    targetReq.quantityAllocated = (targetReq.quantityAllocated || 0) + allocQuantity;
    const allocations = Array.isArray(targetReq.allocations) ? [...targetReq.allocations] : [];
    allocations.push({
      id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      resourceId: matchedResource ? matchedResource.id : resourceId || undefined,
      organizationId: userOrg.id,
      organizationName: userOrg.name,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      quantity: allocQuantity,
      allocatedAt: new Date().toISOString(),
      note: note ? String(note).trim() : undefined,
    });
    targetReq.allocations = allocations;
    neededResources[targetReqIndex] = targetReq;
    alert.neededResources = neededResources;
    alert.changed('neededResources', true);

    // Rejestracja w historii alertu
    const currentHistory = Array.isArray(alert.history) ? [...alert.history] : [];
    currentHistory.push({
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action: 'updated',
      timestamp: new Date().toISOString(),
      userName: `${user.firstName} ${user.lastName}`,
      organizationName: userOrg.name,
      details: `Dyspozycja zasobów: przekazano ${allocQuantity} ${targetReq.unit || 'szt.'} na zapotrzebowanie "${targetReq.name}" (jednostka: ${userOrg.name})`,
    });
    alert.history = currentHistory;
    alert.changed('history', true);

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
      message: `Pomyślnie przydzielono ${allocQuantity} ${targetReq.unit || 'szt.'} do alertu. Stan magazynu Twojej organizacji został zaktualizowany.`,
      data: updatedAlert,
      deductedResource: matchedResource,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas przydzielania zasobów.',
      error: error.message,
    });
  }
};

/**
 * @desc    Pobiera pojedynczy alert po ID ze wszystkimi relacjami, historią, zapotrzebowaniami i wpisami forum
 * @route   GET /api/alerts/:id
 * @access  Private / Public
 */
export const getAlertById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByPk(id, {
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

    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert o podanym identyfikatorze nie został odnaleziony.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania szczegółów alertu.',
      error: error.message,
    });
  }
};

/**
 * @desc    Dodaje nowy wpis operacyjny (post) do danego alertu
 * @route   POST /api/alerts/:id/posts
 * @access  Private (wymaga protect)
 */
export const createAlertPost = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, postType } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({
        success: false,
        message: 'Treść wpisu jest wymagana.',
      });
      return;
    }

    const alert = await Alert.findByPk(id);
    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert o podanym identyfikatorze nie istnieje.',
      });
      return;
    }

    const user = req.user!;
    let userOrgName: string | undefined = undefined;
    if (user.organizationId) {
      const userOrg = await Organization.findByPk(user.organizationId);
      if (userOrg) userOrgName = userOrg.name;
    }

    const currentPosts = Array.isArray(alert.posts) ? [...alert.posts] : [];

    const newPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      authorId: user.id,
      authorName: `${user.firstName} ${user.lastName}`,
      organizationName: userOrgName || 'Służby Ratunkowe',
      role: user.role,
      title: (title || 'Wpis operacyjny').trim(),
      content: content.trim(),
      postType: postType || 'ogolne',
      createdAt: new Date().toISOString(),
      messages: [],
    };

    currentPosts.unshift(newPost);
    alert.posts = currentPosts;
    alert.changed('posts', true);
    await alert.save();

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
      message: 'Nowy wpis został pomyślnie opublikowany.',
      data: populatedAlert,
      newPost,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas dodawania wpisu.',
      error: error.message,
    });
  }
};

/**
 * @desc    Dodaje wiadomość na czacie pod wskazanym wpisem alertu
 * @route   POST /api/alerts/:id/posts/:postId/messages
 * @access  Private (wymaga protect)
 */
export const addPostChatMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id, postId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({
        success: false,
        message: 'Treść wiadomości jest wymagana.',
      });
      return;
    }

    const alert = await Alert.findByPk(id);
    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert o podanym identyfikatorze nie istnieje.',
      });
      return;
    }

    const user = req.user!;
    let userOrgName: string | undefined = undefined;
    if (user.organizationId) {
      const userOrg = await Organization.findByPk(user.organizationId);
      if (userOrg) userOrgName = userOrg.name;
    }

    const currentPosts = Array.isArray(alert.posts) ? [...alert.posts] : [];
    const postIndex = currentPosts.findIndex((p) => p.id === postId);

    if (postIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Wskazany wpis nie został odnaleziony w tym alercie.',
      });
      return;
    }

    const targetPost = { ...currentPosts[postIndex] };
    const currentMessages = Array.isArray(targetPost.messages) ? [...targetPost.messages] : [];

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      authorId: user.id,
      authorName: `${user.firstName} ${user.lastName}`,
      organizationName: userOrgName || 'Służby Ratunkowe',
      role: user.role,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    currentMessages.push(newMessage);
    targetPost.messages = currentMessages;
    currentPosts[postIndex] = targetPost;

    alert.posts = currentPosts;
    alert.changed('posts', true);
    await alert.save();

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
      message: 'Wiadomość została wysłana.',
      data: populatedAlert,
      newMessage,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas wysyłania wiadomości.',
      error: error.message,
    });
  }
};
