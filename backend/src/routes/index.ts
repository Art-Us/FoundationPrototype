import { Router } from 'express';
import authRoutes from './authRoute';
import alertsRoutes from './alertsRoute';
import resourcesRoutes from './resourcesRoute';
import adminRoutes from './adminRoute';
import organizationsRoutes from './organizationsRoute';

const router = Router();

router.use('/auth', authRoutes);
router.use('/alerts', alertsRoutes);
router.use('/resources', resourcesRoutes);
router.use('/admin', adminRoutes);
router.use('/organizations', organizationsRoutes);

export default router;
export { authRoutes, alertsRoutes, resourcesRoutes, adminRoutes, organizationsRoutes };
