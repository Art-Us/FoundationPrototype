import dotenv from 'dotenv';
import app from './app';
import { sequelize } from './models';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Synchronizacja bazy SQLite i modeli
    await sequelize.authenticate();
    console.log('✅ Połączono z bazą danych SQLite');

    await sequelize.sync({ alter: true });
    console.log('✅ Zsynchronizowano tabele bazy danych SQLite');

    app.listen(PORT, () => {
      console.log(`🚀 Serwer uruchomiony na porcie: ${PORT}`);
      console.log(`📑 Dokumentacja Swagger UI dostępna pod: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Błąd podczas uruchamiania serwera:', error);
    process.exit(1);
  }
};

startServer();
