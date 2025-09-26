let cachedConfig = null;

const dotenv = require('dotenv');
dotenv.config();

const REQUIRED_ENV_VARS = [
  'GOOGLE_CLIENT_ID'
];

function getConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(', ')}`
    );
  }

  cachedConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    port: process.env.PORT || 5001,
    databasePath: process.env.DATABASE_PATH || 'data/app.db',
    secretKey: process.env.SECRET_KEY || 'default-secret-key'
  };

  return cachedConfig;
}

module.exports = {
  getConfig
};

