import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import routes from './routes';
import { setupSwagger } from './config/swagger';

const app: Application = express();

// Podstawowe middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfiguracja Swagger UI pod adresem /api-docs
setupSwagger(app);

// Główne trasy API
app.use('/api', routes);

// Endpoint weryfikacji działania API
app.get('/', (req: Request, res: Response) => {
  res.redirect('/api-docs');
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

export default app;
