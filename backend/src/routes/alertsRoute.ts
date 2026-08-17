import { Router } from 'express';
import {
  getPublicAlerts,
  getAlertsByMunicipality,
  createAlert,
  deactivateAlert,
} from '../controllers/alertController';
import { protect } from '../middleware/protect';

const router = Router();

// GET /api/alerts/public - Zwraca wszystkie aktywne alerty (brak autoryzacji)
router.get('/public', getPublicAlerts);

// GET /api/alerts/municipality/:id - Zwraca wszystkie alerty dla danej gminy (wymaga protect)
router.get('/municipality/:id', protect, getAlertsByMunicipality);

// POST /api/alerts - Tworzy nowy alert (wymaga protect)
router.post('/', protect, createAlert);

// PATCH /api/alerts/:id/deactivate - Dezaktywuje alert (wymaga protect)
router.patch('/:id/deactivate', protect, deactivateAlert);

export default router;
