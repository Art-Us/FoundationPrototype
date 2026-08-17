import { Router } from 'express';
import {
  getPublicAlerts,
  getAlertsByMunicipality,
  getMyMunicipalityAlerts,
  createAlert,
  deactivateAlert,
  reactivateAlert,
  updateAlert,
} from '../controllers/alertController';
import { protect } from '../middleware/protect';

const router = Router();

// GET /api/alerts/public - Zwraca wszystkie aktywne alerty (brak autoryzacji)
router.get('/public', getPublicAlerts);

// GET /api/alerts/my-municipality - Zwraca wszystkie alerty dla gminy usera (wymaga protect)
router.get('/my-municipality', protect, getMyMunicipalityAlerts);

// GET /api/alerts/municipality/:id - Zwraca wszystkie alerty dla danej gminy (wymaga protect)
router.get('/municipality/:id', protect, getAlertsByMunicipality);

// POST /api/alerts - Tworzy nowy alert (wymaga protect)
router.post('/', protect, createAlert);

// PUT /api/alerts/:id oraz PATCH /api/alerts/:id - Aktualizuje alert (wymaga protect)
router.put('/:id', protect, updateAlert);
router.patch('/:id', protect, updateAlert);

// PATCH /api/alerts/:id/deactivate - Dezaktywuje alert (wymaga protect)
router.patch('/:id/deactivate', protect, deactivateAlert);

// PATCH /api/alerts/:id/reactivate - Reaktywuje alert (wymaga protect)
router.patch('/:id/reactivate', protect, reactivateAlert);

export default router;
