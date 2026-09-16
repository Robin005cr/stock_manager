import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 8000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stock_manager',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
};
