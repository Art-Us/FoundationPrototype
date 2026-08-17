import dotenv from 'dotenv';
import app from './app';
import { sequelize, User } from './models';
import { seedDatabase } from './seeds/seed';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Połączenie z bazą SQLite
    await sequelize.authenticate();
    console.log('✅ Połączono z bazą danych SQLite');

    // 2. Synchronizacja tabel
    await sequelize.sync({ alter: true });
    console.log('✅ Zsynchronizowano tabele bazy danych SQLite');

    // 3. Automatyczne zasilenie danymi testowymi, jeśli baza jest pusta
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('ℹ️ Wykryto pustą bazę danych. Uruchamianie automatycznego seedowania...');
      await seedDatabase();
    }

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
