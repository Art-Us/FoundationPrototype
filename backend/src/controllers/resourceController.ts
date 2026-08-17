import { Response } from 'express';
import { Resource, RESOURCE_TYPES, RESOURCE_TIMEFRAMES } from '../models/Resource';
import { Organization } from '../models/Organization';
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

    // 1. Znalezienie wszystkich organizacji w danej gminie
    const organizations = await Organization.find({ municipality: municipalityId });
    const organizationIds = organizations.map((org) => org._id);

    // 2. Pobranie aktywnych zasobów należących do tych organizacji
    const resources = await Resource.find({
      organization: { $in: organizationIds },
      isActive: true,
    })
      .populate({
        path: 'organization',
        select: 'name type municipality',
      })
      .sort({ createdAt: -1 });

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
 * @desc    Dodaje nowy zasób
 * @route   POST /api/resources
 * @access  Private (wymaga protect)
 */
export const createResource = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { type, quantity, timeframe, organization } = req.body;

    if (!type || quantity === undefined || !timeframe) {
      res.status(400).json({
        success: false,
        message: 'Typ (type), ilość (quantity) oraz horyzont czasowy (timeframe) są wymagane.',
      });
      return;
    }

    // Jeśli organizacja nie została podana, użyj organizacji zalogowanego użytkownika
    const targetOrganization = organization || req.user?.organization;

    if (!targetOrganization) {
      res.status(400).json({
        success: false,
        message: 'Przypisanie do organizacji (organization) jest wymagane.',
      });
      return;
    }

    const newResource = await Resource.create({
      organization: targetOrganization,
      type,
      quantity,
      timeframe,
      isActive: true,
    });

    const populatedResource = await Resource.findById(newResource._id).populate({
      path: 'organization',
      select: 'name type municipality',
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
