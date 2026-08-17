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
});
