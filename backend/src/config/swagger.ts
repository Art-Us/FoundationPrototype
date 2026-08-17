import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Fundacja Q API - System Koordynacji Kryzysowej',
    version: '1.0.0',
    description:
      'Dokumentacja REST API oraz interaktywny panel Swagger UI do testowania endpointów autoryzacji, alertów, zasobów oraz panelu administratora.',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Serwer lokalny (Development)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Wprowadź token JWT uzyskany podczas logowania w formacie: Bearer <token>',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66bf8a1e2f8b1c0012345678' },
          firstName: { type: 'string', example: 'Jan' },
          lastName: { type: 'string', example: 'Kowalski' },
          email: { type: 'string', example: 'jan.kowalski@example.com' },
          phone: { type: 'string', example: '+48123456789' },
          role: { type: 'string', enum: ['admin', 'koordynator', 'czlonek'], example: 'czlonek' },
          organization: { type: 'string', example: '66bf8a1e2f8b1c0012345679' },
          isVerified: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Alert: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66bf8a1e2f8b1c0012345680' },
          content: { type: 'string', example: 'Podtopienie drogi gminnej nr 12 - zalecany objazd.' },
          category: { type: 'string', example: 'Zagrożenie powodziowe' },
          isActive: { type: 'boolean', example: true },
          author: { type: 'string', example: '66bf8a1e2f8b1c0012345678' },
          municipality: { type: 'string', example: '66bf8a1e2f8b1c0012345681' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Resource: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66bf8a1e2f8b1c0012345682' },
          organization: { type: 'string', example: '66bf8a1e2f8b1c0012345679' },
          type: { type: 'string', enum: ['ludzie', 'woda', 'sprzet', 'inne'], example: 'ludzie' },
          quantity: { type: 'number', example: 15 },
          timeframe: { type: 'string', enum: ['24h', '48h', '72h', 'tydzien'], example: '24h' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'password', 'phone', 'organization'],
        properties: {
          firstName: { type: 'string', example: 'Jan' },
          lastName: { type: 'string', example: 'Kowalski' },
          email: { type: 'string', example: 'jan.kowalski@example.com' },
          password: { type: 'string', minLength: 6, example: 'tajnehaslo123' },
          phone: { type: 'string', example: '+48123456789' },
          organization: { type: 'string', description: 'ID organizacji w bazie', example: '66bf8a1e2f8b1c0012345679' },
          role: { type: 'string', enum: ['admin', 'koordynator', 'czlonek'], default: 'czlonek', example: 'czlonek' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'jan.kowalski@example.com' },
          password: { type: 'string', example: 'tajnehaslo123' },
        },
      },
      CreateAlertRequest: {
        type: 'object',
        required: ['content', 'category'],
        properties: {
          content: { type: 'string', example: 'Wysoki stan rzeki, zalecana ewakuacja sprzętu rolniczego.' },
          category: { type: 'string', example: 'Ostrzeżenie hydrologiczne' },
          municipality: { type: 'string', description: 'ID gminy (opcjonalne jeśli przypisana do organizacji usera)', example: '66bf8a1e2f8b1c0012345681' },
        },
      },
      CreateResourceRequest: {
        type: 'object',
        required: ['type', 'quantity', 'timeframe'],
        properties: {
          type: { type: 'string', enum: ['ludzie', 'woda', 'sprzet', 'inne'], example: 'woda' },
          quantity: { type: 'number', example: 500 },
          timeframe: { type: 'string', enum: ['24h', '48h', '72h', 'tydzien'], example: '48h' },
          organization: { type: 'string', description: 'ID organizacji (opcjonalne jeśli pobierane z zalogowanego usera)', example: '66bf8a1e2f8b1c0012345679' },
        },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Autoryzacja (Auth)'],
        summary: 'Rejestracja nowego użytkownika',
        description: 'Tworzy nowe konto z isVerified: false. Nie zwraca tokenu – wymagana jest weryfikacja przez administratora.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Użytkownik zarejestrowany pomyślnie, oczekuje na weryfikację.',
          },
          400: { description: 'Brakujące wymagane pola.' },
          409: { description: 'Użytkownik z tym adresem email już istnieje.' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Autoryzacja (Auth)'],
        summary: 'Logowanie użytkownika',
        description: 'Weryfikuje email oraz hasło, po czym zwraca token JWT.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Zalogowano pomyślnie. Zwrócono token JWT i profil użytkownika.',
          },
          400: { description: 'Brak adresu email lub hasła.' },
          401: { description: 'Nieprawidłowe dane logowania.' },
        },
      },
    },
    '/api/alerts/public': {
      get: {
        tags: ['Alerty (Alerts)'],
        summary: 'Pobranie aktywnych alertów (Publiczne)',
        description: 'Zwraca listę wszystkich aktywnych alertów (isActive: true) wraz z danymi autora, organizacji i gminy. Nie wymaga autoryzacji.',
        responses: {
          200: { description: 'Lista aktywnych alertów.' },
        },
      },
    },
    '/api/alerts/municipality/{id}': {
      get: {
        tags: ['Alerty (Alerts)'],
        summary: 'Pobranie wszystkich alertów dla danej gminy',
        description: 'Zwraca wszystkie alerty (aktywne i nieaktywne) przypisane do gminy o podanym ID.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID gminy (ObjectId)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Lista alertów dla wskazanej gminy.' },
          401: { description: 'Brak autoryzacji lub nieprawidłowy token.' },
          403: { description: 'Konto niezweryfikowane (isVerified !== true).' },
        },
      },
    },
    '/api/alerts': {
      post: {
        tags: ['Alerty (Alerts)'],
        summary: 'Utworzenie nowego alertu',
        description: 'Tworzy nowy alert powiązany z zalogowanym użytkownikiem i jego gminą.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAlertRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Alert został pomyślnie utworzony.' },
          400: { description: 'Brak wymaganych danych.' },
          401: { description: 'Brak autoryzacji.' },
          403: { description: 'Konto niezweryfikowane.' },
        },
      },
    },
    '/api/alerts/{id}/deactivate': {
      patch: {
        tags: ['Alerty (Alerts)'],
        summary: 'Dezaktywacja alertu (isActive: false)',
        description: 'Dezaktywuje alert. Sprawdza, czy użytkownik ma uprawnienia (admin, autor lub ta sama gmina/organizacja).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID alertu (ObjectId)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Alert został pomyślnie dezaktywowany.' },
          401: { description: 'Brak autoryzacji.' },
          403: { description: 'Brak uprawnień do modyfikacji alertu z innej gminy/organizacji lub niezweryfikowane konto.' },
          404: { description: 'Alert nie został znaleziony.' },
        },
      },
    },
    '/api/resources/municipality/{id}': {
      get: {
        tags: ['Zasoby (Resources)'],
        summary: 'Pobranie zasobów dla gminy w postaci macierzy',
        description: 'Zwraca aktywne zasoby organizacji z podanej gminy zagregowane wg typu zasobu i horyzontu czasowego (matryca zasobów).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID gminy (ObjectId)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Macierz zasobów oraz szczegółowa lista zasobów.' },
          401: { description: 'Brak autoryzacji.' },
          403: { description: 'Konto niezweryfikowane.' },
        },
      },
    },
    '/api/resources': {
      post: {
        tags: ['Zasoby (Resources)'],
        summary: 'Dodanie nowego zasobu',
        description: 'Dodaje nowy zasób dla wybranej lub domyślnej organizacji użytkownika.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateResourceRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Zasób został pomyślnie dodany.' },
          400: { description: 'Brak wymaganych danych lub nieprawidłowe wartości.' },
          401: { description: 'Brak autoryzacji.' },
          403: { description: 'Konto niezweryfikowane.' },
        },
      },
    },
    '/api/admin/users/pending': {
      get: {
        tags: ['Panel Administratora (Admin)'],
        summary: 'Lista użytkowników oczekujących na weryfikację',
        description: 'Zwraca użytkowników z isVerified: false. Dostępne wyłącznie dla roli admin.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Lista niezweryfikowanych użytkowników.' },
          401: { description: 'Brak autoryzacji.' },
          403: { description: 'Brak uprawnień administratora lub konto niezweryfikowane.' },
        },
      },
    },
    '/api/admin/users/{id}/verify': {
      patch: {
        tags: ['Panel Administratora (Admin)'],
        summary: 'Weryfikacja użytkownika (isVerified: true)',
        description: 'Zmienia status isVerified na true dla wybranego użytkownika. Wymaga roli admin.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID użytkownika (ObjectId)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Użytkownik został pomyślnie zweryfikowany.' },
          401: { description: 'Brak autoryzacji.' },
          403: { description: 'Brak uprawnień administratora.' },
          404: { description: 'Użytkownik nie został znaleziony.' },
        },
      },
    },
  },
};

/**
 * Konfiguruje Swagger UI na ścieżce /api-docs
 */
export const setupSwagger = (app: Express): void => {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: block; }',
      customSiteTitle: 'Fundacja Q - API Docs',
    })
  );
};
