import request from 'supertest';
import app from '../app';
import { setupTestDb, closeTestDb, TestContext } from './helpers';

describe('2. Middleware Autoryzacji (protect & adminOnly)', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('Middleware protect', () => {
    it('powinien zwrócić 401, gdy brak nagłówka Authorization', async () => {
      const res = await request(app).get(`/api/alerts/municipality/${context.municipality.id}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Brak autoryzacji/i);
    });

    it('powinien zwrócić 401, gdy token jest nieprawidłowy', async () => {
      const res = await request(app)
        .get(`/api/alerts/municipality/${context.municipality.id}`)
        .set('Authorization', 'Bearer niepoprawny_token_jwt_123');

      expect(res.status).toBe(401);
    });

    it('powinien zwrócić 403 (Zabronione), gdy użytkownik ma isVerified === false', async () => {
      const res = await request(app)
        .get(`/api/alerts/municipality/${context.municipality.id}`)
        .set('Authorization', `Bearer ${context.unverifiedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/weryfikację/i);
    });

    it('powinien przepuścić użytkownika ze statusem isVerified === true', async () => {
      const res = await request(app)
        .get(`/api/alerts/municipality/${context.municipality.id}`)
        .set('Authorization', `Bearer ${context.verifiedToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Middleware adminOnly', () => {
    it('powinien zwrócić 403, gdy użytkownik nie posiada roli admin', async () => {
      const res = await request(app)
        .get('/api/admin/users/pending')
        .set('Authorization', `Bearer ${context.verifiedToken}`); // rola 'czlonek'

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Wymagane uprawnienia administratora/i);
    });

    it('powinien przepuścić żądanie, gdy użytkownik posiada rolę admin', async () => {
      const res = await request(app)
        .get('/api/admin/users/pending')
        .set('Authorization', `Bearer ${context.adminToken}`); // rola 'admin'

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
