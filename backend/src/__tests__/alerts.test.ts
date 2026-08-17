import request from 'supertest';
import app from '../app';
import { setupTestDb, closeTestDb, TestContext } from './helpers';
import { Alert } from '../models';

describe('3. Endpointy Alertów (/api/alerts)', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('GET /api/alerts/public', () => {
    it('powinien zwrócić listę aktywnych alertów bez konieczności podawania tokenu', async () => {
      // Dodajemy jeden nieaktywny alert, aby sprawdzić filtrowanie
      await Alert.create({
        content: 'Alert archiwalny nieaktywny',
        category: 'Inne',
        isActive: false,
        authorId: context.verifiedUser.id,
        municipalityId: context.municipality.id,
      });

      const res = await request(app).get('/api/alerts/public');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Wszystkie zwrócone alerty muszą mieć isActive === true
      res.body.data.forEach((alert: any) => {
        expect(alert.isActive).toBe(true);
        expect(alert.author).toBeDefined();
        expect(alert.municipality).toBeDefined();
      });
    });
  });

  describe('GET /api/alerts/municipality/:id', () => {
    it('powinien zwrócić wszystkie alerty (aktywne i nieaktywne) dla danej gminy dla zalogowanego użytkownika', async () => {
      await Alert.create({
        content: 'Alert nieaktywny w tej samej gminie',
        category: 'Drogowe',
        isActive: false,
        authorId: context.verifiedUser.id,
        municipalityId: context.municipality.id,
      });

      const res = await request(app)
        .get(`/api/alerts/municipality/${context.municipality.id}`)
        .set('Authorization', `Bearer ${context.verifiedToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/alerts', () => {
    it('powinien utworzyć nowy alert z poprawnym autorem i statusem isActive: true', async () => {
      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${context.verifiedToken}`)
        .send({
          content: 'Nowe zagrożenie burzowe',
          category: 'Pogoda',
          municipalityId: context.municipality.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Nowe zagrożenie burzowe');
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.author.id).toBe(context.verifiedUser.id);
    });
  });

  describe('PATCH /api/alerts/:id/deactivate', () => {
    it('powinien pozwolić autorowi lub osobie z tej samej gminy na dezaktywację alertu', async () => {
      const res = await request(app)
        .patch(`/api/alerts/${context.activeAlert.id}/deactivate`)
        .set('Authorization', `Bearer ${context.verifiedToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
    });

    it('powinien zablokować dezaktywację alertu przez użytkownika z innej gminy (403)', async () => {
      const res = await request(app)
        .patch(`/api/alerts/${context.activeAlert.id}/deactivate`)
        .set('Authorization', `Bearer ${context.otherMunicipalityToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
