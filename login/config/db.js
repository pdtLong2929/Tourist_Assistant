const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production' && !process.env.POSTGRES_URL?.includes('localhost') && !process.env.POSTGRES_URL?.includes('db') && !process.env.POSTGRES_URL?.includes('@postgres');
if (!process.env.POSTGRES_URL){
  throw new Error('FATAL: POSTGRES_URL is not defined in the environment variables.');
}

const sequelize = process.env.POSTGRES_URL ? 
new Sequelize(process.env.POSTGRES_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: isProduction ? {
      require: true,
      rejectUnauthorized: false,
    } : false,
  },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
}) : 
new Sequelize(
  process.env.DB_NAME || 'tourist_assistant',
  process.env.DB_USER || 'tourist',
  process.env.DB_PASSWORD || 'tourist_secret',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5036,
    dialect: 'postgres',
    logging: console.log,
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Database connected successfully');
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };