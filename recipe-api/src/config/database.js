import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

// Cargar variables de entorno
dotenv.config();

// Configuración del pool de conexiones
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false } ,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Función para probar conexión
export const testConnection = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Conexión a PostgreSQL exitosa:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    console.log('🔧 Configuración actual:');
    console.log('   Host:', process.env.DB_HOST);
    console.log('   Puerto:', process.env.DB_PORT);
    console.log('   Base de datos:', process.env.DB_NAME);
    console.log('   Usuario:', process.env.DB_USER);
    return false;
  } finally {
    client.release();
  }
};

// Scripts de migración para PostgreSQL
export const initializeDatabase = async () => {
  // Primero probar la conexión
  const connectionSuccess = await testConnection();
  if (!connectionSuccess) {
    throw new Error('No se pudo conectar a la base de datos. Verifica el archivo .env');
  }

  const client = await pool.connect();
  
  try {
    console.log('🔄 Inicializando base de datos PostgreSQL...');

    // Tabla de usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_image TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de recetas
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        ingredients TEXT,
        instructions TEXT,
        image_url TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de favoritos
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, recipe_id)
      )
    `);

    // Índices para mejorar performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
      CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
      CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    console.log('✅ Tablas PostgreSQL inicializadas correctamente');

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;