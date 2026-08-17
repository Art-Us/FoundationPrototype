import { Router } from 'express';
import { getPendingUsers, verifyUser, rejectUser } from '../controllers/adminController';
import { protect } from '../middleware/protect';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

// Wszystkie trasy w adminRoute wymagają uwierzytelnienia (protect) oraz uprawnień administratora (adminOnly)
router.use(protect, adminOnly);

// GET /api/admin/users/pending - Zwraca użytkowników z isVerified: false
router.get('/users/pending', getPendingUsers);

// PATCH /api/admin/users/:id/verify - Zmienia isVerified na true
router.patch('/users/:id/verify', verifyUser);

// DELETE /api/admin/users/:id/reject oraz DELETE /api/admin/users/:id - Odrzuca wniosek i usuwa konto
router.delete('/users/:id/reject', rejectUser);
router.delete('/users/:id', rejectUser);

export default router;
