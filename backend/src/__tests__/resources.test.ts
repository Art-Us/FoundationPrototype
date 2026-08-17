import request from 'supertest';
import app from '../app';
import { setupTestDb, closeTestDb, TestContext } from './helpers';
import { Resource } from '../models';

describe('4. Endpointy Zasobów (/api/resources)', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('GET /api/resources/municipality/:id', () => {
    it('powinien zwrócić zasoby dla gminy poprawnie zagregowane w matrycy', async () => {
      // Dodajemy kolejne zasoby w tej samej organizacji
      await Resource.create({
        organizationId: context.organization.id,
        type: 'woda',
        quantity: 2000,
        timeframe: '24h',
        isActive: true,
      });

      await Resource.create({
        organizationId: context.organization.id,
        type: 'ludzie',
        quantity: 15,
        timeframe: '48h',
        isActive: true,
      });

      const res = await request(app)
        .get(`/api/resources/municipality/${context.municipality.id}`)
        .set('Authorization', `Bearer ${context.verifiedToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matrix).toBeDefined();

      // Woda 24h: 1000 (z setupTestDb) + 2000 = 3000
      expect(res.body.matrix.woda['24h']).toBe(3000);
      // Ludzie 48h: 15
      expect(res.body.matrix.ludzie['48h']).toBe(15);
      expect(Array.isArray(res.body.resources)).toBe(true);
    });
  });

  describe('POST /api/resources', () => {
    it('powinien dodać nowy zasób dla organizacji zalogowanego użytkownika', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${context.verifiedToken}`)
        .send({
          type: 'sprzet',
          quantity: 5,
          timeframe: '24h',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('sprzet');
      expect(res.body.data.quantity).toBe(5);
      expect(res.body.data.organizationId).toBe(context.organization.id);
    });
  });
});
