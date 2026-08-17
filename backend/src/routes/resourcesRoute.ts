import { Router } from 'express';
import {
  getResourcesByMunicipality,
  createResource,
} from '../controllers/resourceController';
import { protect } from '../middleware/protect';

const router = Router();

// GET /api/resources/municipality/:id - Zwraca zasoby dla danej gminy zgrupowane dla matrycy (wymaga protect)
router.get('/municipality/:id', protect, getResourcesByMunicipality);

// POST /api/resources - Dodaje nowy zasób (wymaga protect)
router.post('/', protect, createResource);

export default router;
