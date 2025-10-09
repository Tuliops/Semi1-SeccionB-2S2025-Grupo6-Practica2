import dotenv from 'dotenv';
dotenv.config();

console.log('🧪 TEST: Verificando variables para el servidor...');
console.log('📍 Directorio actual:', process.cwd());
console.log('');

const requiredVars = [
  'DB_HOST', 
  'DB_USER', 
  'DB_PASSWORD', 
  'DB_NAME',
  'NODE_ENV',
  'PORT',
  'JWT_SECRET'
];

console.log('📋 Variables de entorno requeridas:');
let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName.includes('PASSWORD') || varName.includes('SECRET')) {
      console.log(`   ${varName}: ✅ DEFINIDO (valor oculto por seguridad)`);
    } else {
      console.log(`   ${varName}: ✅ ${value}`);
    }
  } else {
    console.log(`   ${varName}: ❌ NO DEFINIDO`);
    allPresent = false;
  }
});

console.log('');
if (allPresent) {
  console.log('🎉 ¡Todas las variables están presentes!');
  console.log('💡 Ahora puedes ejecutar: npm run dev');
} else {
  console.log('🔧 Para solucionar:');
  console.log('   1. Asegúrate de que el archivo .env esté en la raíz del proyecto');
  console.log('   2. Verifica que no tenga espacios alrededor del =');
  console.log('   3. Verifica que no use comillas en los valores');
  console.log('   4. Verifica que los nombres de variables sean exactos');
}