import request from 'supertest';
import app from '../app';
import { setupTestDb, closeTestDb, TestContext } from './helpers';

describe('1. Autoryzacja (Auth Controller)', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('POST /api/auth/register', () => {
    it('powinien pomyślnie zarejestrować użytkownika z isVerified: false i bez tokenu', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Nowy',
          lastName: 'Uzytkownik',
          email: 'nowy@test.pl',
          password: 'haslotestowe123',
          phone: '+48999888777',
          organizationId: context.organization.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('nowy@test.pl');
      expect(res.body.user.isVerified).toBe(false);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.token).toBeUndefined(); // Zgodnie z wymaganiami: rejestracja bez tokenu
    });

    it('powinien zwrócić błąd 409 w przypadku próby rejestracji istniejącego emaila', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'jan@test.pl', // Email już istnieje w fixture
          password: 'haslotestowe123',
          phone: '+48123123123',
          organizationId: context.organization.id,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('powinien zwrócić błąd 400 w przypadku braku wymaganych pól', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Brakujacy',
          // brak lastName, email, password, phone, organizationId
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('powinien zalogować użytkownika i zwrócić poprawny token JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jan@test.pl',
          password: 'haslo123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('jan@test.pl');
    });

    it('powinien zwrócić błąd 401 przy podaniu błędnego hasła', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jan@test.pl',
          password: 'zlehaslo',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.token).toBeUndefined();
    });

    it('powinien zwrócić błąd 401 przy próbie logowania nieistniejącego emaila', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nieistnieje@test.pl',
          password: 'haslo',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
