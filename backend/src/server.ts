import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fundacjaq';

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Połączono z bazą danych MongoDB');

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
