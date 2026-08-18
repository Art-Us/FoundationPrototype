import { Router } from 'express';
import {
  getResourcesByMunicipality,
  getMyMunicipalityResources,
  getMyOrganizationResources,
  createResource,
} from '../controllers/resourceController';
import { protect } from '../middleware/protect';

const router = Router();

// GET /api/resources/my-organization - Zwraca zasoby organizacji zalogowanego usera (wymaga protect)
router.get('/my-organization', protect, getMyOrganizationResources);

// GET /api/resources/my-municipality - Zwraca zasoby dla gminy usera (wymaga protect)
router.get('/my-municipality', protect, getMyMunicipalityResources);

// GET /api/resources/municipality/:id - Zwraca zasoby dla danej gminy zgrupowane dla matrycy (wymaga protect)
router.get('/municipality/:id', protect, getResourcesByMunicipality);

// POST /api/resources - Dodaje nowy zasób (wymaga protect)
router.post('/', protect, createResource);

export default router;
