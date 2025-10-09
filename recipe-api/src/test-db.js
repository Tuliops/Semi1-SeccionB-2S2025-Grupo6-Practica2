import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();

console.log('🔍 Verificando variables de entorno...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

const testConnection = async () => {
  const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Faltan variables de entorno:', missingVars);
    return;
  }

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: {
      rejectUnauthorized: false  // IMPORTANTE para RDS
    },
    connectionTimeoutMillis: 15000
  });

  try {
    console.log('🔄 Intentando conectar a AWS RDS con SSL...');
    await client.connect();
    console.log('✅ Conexión exitosa a AWS RDS PostgreSQL');
    
    const result = await client.query('SELECT version()');
    console.log('📋 Versión de PostgreSQL:', result.rows[0].version);
    
    // Probar si podemos crear tablas
    console.log('🧪 Probando permisos...');
    const testTable = await client.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        test_value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Permisos de escritura OK');
    
    await client.query('DROP TABLE IF EXISTS connection_test');
    
    await client.end();
    console.log('🎉 ¡Todas las pruebas pasaron! La base de datos está lista.');
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    
    if (error.message.includes('pg_hba.conf')) {
      console.log('\n🔧 SOLUCIÓN: Configurar Security Group en AWS RDS');
      console.log('1. Ve a AWS RDS Console → Tu instancia → Security Group');
      console.log('2. Haz clic en el Security Group vinculado');
      console.log('3. "Edit inbound rules"');
      console.log('4. Agrega esta regla:');
      console.log('   - Type: PostgreSQL');
      console.log('   - Port: 5432'); 
      console.log('   - Source: 181.209.195.78/32');
      console.log('   - Description: RecipeShare Development');
      console.log('5. "Save rules"');
    }
    
    if (error.message.includes('password authentication')) {
      console.log('\n🔧 SOLUCIÓN: Verificar credenciales');
      console.log('1. Verifica el usuario y contraseña en AWS RDS');
      console.log('2. La contraseña es la que estableciste al crear la instancia');
    }
  }
};

testConnection();