import { Router } from 'express';
import {
  getPublicAlerts,
  getOperationalAlerts,
  getAlertsByMunicipality,
  getMyMunicipalityAlerts,
  getAlertById,
  createAlert,
  deactivateAlert,
  reactivateAlert,
  updateAlert,
  allocateResourceToAlert,
  createAlertPost,
  addPostChatMessage,
  deleteAlert,
} from '../controllers/alertController';
import { protect } from '../middleware/protect';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

// GET /api/alerts/public - Zwraca wszystkie aktywne alerty (brak autoryzacji)
router.get('/public', getPublicAlerts);

// GET /api/alerts/operational - Zwraca wszystkie aktywne alerty z zapotrzebowaniem dla panelu operacyjnego (wymaga protect)
router.get('/operational', protect, getOperationalAlerts);

// GET /api/alerts/my-municipality - Zwraca wszystkie alerty dla gminy usera (wymaga protect)
router.get('/my-municipality', protect, getMyMunicipalityAlerts);

// GET /api/alerts/municipality/:id - Zwraca wszystkie alerty dla danej gminy (wymaga protect)
router.get('/municipality/:id', protect, getAlertsByMunicipality);

// GET /api/alerts/:id - Pobiera pojedynczy alert z pełnymi szczegółami i wpisami
router.get('/:id', getAlertById);

// POST /api/alerts - Tworzy nowy alert (wymaga protect)
router.post('/', protect, createAlert);

// POST /api/alerts/:id/allocate-resource - Przydziela zasoby do alertu (wymaga protect)
router.post('/:id/allocate-resource', protect, allocateResourceToAlert);

// POST /api/alerts/:id/posts - Dodaje nowy wpis/post do alertu (wymaga protect)
router.post('/:id/posts', protect, createAlertPost);

// POST /api/alerts/:id/posts/:postId/messages - Dodaje wiadomość do czatu pod wpisem (wymaga protect)
router.post('/:id/posts/:postId/messages', protect, addPostChatMessage);

// PUT /api/alerts/:id oraz PATCH /api/alerts/:id - Aktualizuje alert (wymaga protect)
router.put('/:id', protect, updateAlert);
router.patch('/:id', protect, updateAlert);

// PATCH /api/alerts/:id/deactivate - Dezaktywuje alert (wymaga protect)
router.patch('/:id/deactivate', protect, deactivateAlert);

// PATCH /api/alerts/:id/reactivate - Reaktywuje alert (wymaga protect)
router.patch('/:id/reactivate', protect, reactivateAlert);

// DELETE /api/alerts/:id - Całkowicie usuwa alert z zachowaniem kopii w logach audytowych (Tylko Admin)
router.delete('/:id', protect, adminOnly, deleteAlert);

export default router;
