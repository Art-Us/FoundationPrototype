import request from 'supertest';
import app from '../app';
import { setupTestDb, closeTestDb, TestContext } from './helpers';
import { User } from '../models';

describe('5. Endpointy Panelu Administratora (/api/admin)', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('GET /api/admin/users/pending', () => {
    it('powinien zwrócić listę użytkowników z isVerified: false dla administratora', async () => {
      const res = await request(app)
        .get('/api/admin/users/pending')
        .set('Authorization', `Bearer ${context.adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      res.body.data.forEach((user: any) => {
        expect(user.isVerified).toBe(false);
        expect(user.password).toBeUndefined();
      });
    });
  });

  describe('PATCH /api/admin/users/:id/verify', () => {
    it('powinien zmienić status użytkownika na isVerified: true', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${context.unverifiedUser.id}/verify`)
        .set('Authorization', `Bearer ${context.adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isVerified).toBe(true);

      // Weryfikacja bezpośrednio w bazie
      const updatedUser = await User.findByPk(context.unverifiedUser.id);
      expect(updatedUser?.isVerified).toBe(true);
    });

    it('powinien zwrócić 404 w przypadku nieistniejącego identyfikatora użytkownika', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/admin/users/${nonExistentId}/verify`)
        .set('Authorization', `Bearer ${context.adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/logs oraz POST /api/admin/logs/:id/revert', () => {
    it('powinien rejestrować wpis w dzienniku przy dezaktywacji alertu i pozwolić na jego pobranie w GET /api/admin/logs', async () => {
      // 1. Dezaktywujemy alert
      await request(app)
        .patch(`/api/alerts/${context.activeAlert.id}/deactivate`)
        .set('Authorization', `Bearer ${context.adminToken}`);

      // 2. Pobieramy logi
      const res = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${context.adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const deactLog = res.body.data.find((l: any) => l.action === 'alert_deactivated');
      expect(deactLog).toBeDefined();
      expect(deactLog.alertId).toBe(context.activeAlert.id);
    });

    it('powinien cofnąć dezaktywację alertu (Rollback) i przywrócić status aktywny w POST /api/admin/logs/:id/revert', async () => {
      // 1. Dezaktywujemy alert
      await request(app)
        .patch(`/api/alerts/${context.activeAlert.id}/deactivate`)
        .set('Authorization', `Bearer ${context.adminToken}`);

      // 2. Pobieramy log
      const logsRes = await request(app)
        .get(`/api/admin/logs?alertId=${context.activeAlert.id}&action=alert_deactivated`)
        .set('Authorization', `Bearer ${context.adminToken}`);

      const targetLog = logsRes.body.data[0];
      expect(targetLog).toBeDefined();

      // 3. Wykonujemy Rollback
      const revertRes = await request(app)
        .post(`/api/admin/logs/${targetLog.id}/revert`)
        .set('Authorization', `Bearer ${context.adminToken}`);

      expect(revertRes.status).toBe(200);
      expect(revertRes.body.success).toBe(true);
      expect(revertRes.body.data.isReverted).toBe(true);

      // 4. Sprawdzamy czy alert jest ponownie aktywny
      const checkAlert = await request(app).get('/api/alerts/public');
      const found = checkAlert.body.data.find((a: any) => a.id === context.activeAlert.id);
      expect(found).toBeDefined();
      expect(found.isActive).toBe(true);
    });
  });
});

