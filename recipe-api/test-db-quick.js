import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Client } = pkg;

console.log('🔧 Probando conexión a RDS PostgreSQL...');
console.log('📍 Host:', process.env.DB_HOST);
console.log('👤 Usuario:', process.env.DB_USER);
console.log('🗃️  Base de datos:', process.env.DB_NAME);

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('✅ ¡CONEXIÓN EXITOSA!');
    return client.query('SELECT NOW() as server_time');
  })
  .then(result => {
    console.log('⏰ Hora del servidor PostgreSQL:', result.rows[0].server_time);
    return client.query('SELECT version() as version');
  })
  .then(result => {
    console.log('📋 Versión:', result.rows[0].version);
    console.log('\n🎉 ¡LA BASE DE DATOS ESTÁ LISTA!');
    console.log('💡 El servidor automáticamente usará la conexión correcta.');
    client.end();
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 AÚN FALTA:');
    console.log('1. Verifica que guardaste los cambios en el Security Group');
    console.log('2. La IP debe ser exactamente: 181.209.195.78/32');
    console.log('3. El tipo debe ser: PostgreSQL');
    console.log('4. Puerto: 5432');
    console.log('5. Espera 1-2 minutos para que los cambios se propaguen');
  });