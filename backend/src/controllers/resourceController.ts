import { Response } from 'express';
import { Resource, Organization, RESOURCE_TYPES, RESOURCE_TIMEFRAMES } from '../models';
import { AuthenticatedRequest } from '../middleware/protect';

/**
 * @desc    Pobiera zasoby dla danej gminy zgrupowane dla matrycy
 * @route   GET /api/resources/municipality/:id
 * @access  Private (wymaga protect)
 */
export const getResourcesByMunicipality = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: municipalityId } = req.params;

    // 1. Znalezienie organizacji należących do danej gminy
    const organizations = await Organization.findAll({
      where: { municipalityId },
      attributes: ['id'],
    });
    const organizationIds = organizations.map((org) => org.id);

    // 2. Pobranie aktywnych zasobów tych organizacji
    const resources = await Resource.findAll({
      where: {
        organizationId: organizationIds,
        isActive: true,
      },
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'type', 'municipalityId'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // 3. Inicjalizacja struktury macierzy zasobów (Typ zasobu x Horyzont czasowy)
    const matrix: Record<string, Record<string, number>> = {};
    for (const type of RESOURCE_TYPES) {
      matrix[type] = {};
      for (const timeframe of RESOURCE_TIMEFRAMES) {
        matrix[type][timeframe] = 0;
      }
    }

    // 4. Agregacja ilości w macierzy
    for (const resource of resources) {
      if (matrix[resource.type] && matrix[resource.type][resource.timeframe] !== undefined) {
        matrix[resource.type][resource.timeframe] += resource.quantity;
      }
    }

    res.status(200).json({
      success: true,
      municipalityId,
      matrix,
      count: resources.length,
      resources,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania zasobów dla gminy.',
      error: error.message,
    });
  }
};

/**
 * @desc    Pobiera zasoby dla gminy zalogowanego użytkownika (lub wybranej) zgrupowane dla matrycy
 * @route   GET /api/resources/my-municipality
 * @access  Private (wymaga protect)
 */
export const getMyMunicipalityResources = async (
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

    let organizationIds: string[] = [];

    if (municipalityId) {
      const organizations = await Organization.findAll({
        where: { municipalityId },
        attributes: ['id'],
      });
      organizationIds = organizations.map((org) => org.id);
    }

    const whereClause: any = { isActive: true };
    if (organizationIds.length > 0) {
      whereClause.organizationId = organizationIds;
    }

    const resources = await Resource.findAll({
      where: whereClause,
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'type', 'municipalityId'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const matrix: Record<string, Record<string, number>> = {};
    for (const type of RESOURCE_TYPES) {
      matrix[type] = {};
      for (const timeframe of RESOURCE_TIMEFRAMES) {
        matrix[type][timeframe] = 0;
      }
    }

    for (const resource of resources) {
      if (matrix[resource.type] && matrix[resource.type][resource.timeframe] !== undefined) {
        matrix[resource.type][resource.timeframe] += resource.quantity;
      }
    }

    res.status(200).json({
      success: true,
      municipalityId,
      matrix,
      count: resources.length,
      resources,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania zasobów dla Twojej gminy.',
      error: error.message,
    });
  }
};

/**
 * @desc    Dodaje nowy zasób
 * @route   POST /api/resources
 * @access  Private (wymaga protect)
 */
export const createResource = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { type, subcategory, quantity, timeframe, organization, organizationId } = req.body;

    if (!type || quantity === undefined || !timeframe) {
      res.status(400).json({
        success: false,
        message: 'Typ (type), ilość (quantity) oraz horyzont czasowy (timeframe) są wymagane.',
      });
      return;
    }

    const targetOrganizationId = organizationId || organization || req.user?.organizationId;

    if (!targetOrganizationId) {
      res.status(400).json({
        success: false,
        message: 'Przypisanie do organizacji (organizationId) jest wymagane.',
      });
      return;
    }

    const newResource = await Resource.create({
      organizationId: targetOrganizationId,
      type,
      subcategory: subcategory || null,
      quantity,
      timeframe,
      isActive: true,
    });

    const populatedResource = await Resource.findByPk(newResource.id, {
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'type', 'municipalityId'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Zasób został pomyślnie dodany.',
      data: populatedResource,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas dodawania zasobu.',
      error: error.message,
    });
  }
};
