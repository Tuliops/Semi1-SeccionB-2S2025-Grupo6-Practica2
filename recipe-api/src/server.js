// ==================== CONFIGURACIÓN INICIAL CRÍTICA ====================
import dotenv from 'dotenv';
// CARGAR .env PRIMERO - ESTO ES ESENCIAL
dotenv.config();

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { BlobServiceClient } from '@azure/storage-blob';
import pool, { initializeDatabase } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== VERIFICACIÓN DE VARIABLES ====================
console.log('\n🔍 VERIFICACIÓN DE VARIABLES EN SERVIDOR:');
const criticalVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
let allVarsPresent = true;

criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ${varName}: ✅ ${varName.includes('PASSWORD') ? 'DEFINIDO (oculto)' : value}`);
  } else {
    console.log(`   ${varName}: ❌ NO DEFINIDO`);
    allVarsPresent = false;
  }
});

// Verificar variables de Azure
console.log('\n🔍 VERIFICACIÓN DE VARIABLES AZURE:');
const azureVars = ['AZURE_STORAGE_CONNECTION_STRING'];
azureVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ${varName}: ✅ DEFINIDO`);
  } else {
    console.log(`   ${varName}: ❌ NO DEFINIDO`);
  }
});

if (!allVarsPresent) {
  console.log('\n⚠️  ADVERTENCIA: Faltan variables críticas. Algunas funciones pueden no trabajar.');
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_para_desarrollo';

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://recipelboxfotosgt.z13.web.core.windows.net'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// MANEJAR PREFLIGHT REQUESTS - ESTO ES CRÍTICO
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== CONFIGURACIÓN AZURE BLOB STORAGE ====================
let blobServiceClient;
let profileContainerClient;
let recipesContainerClient;

async function initializeAzureStorage() {
  try {
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
      
      // Configurar container para fotos de perfil
      profileContainerClient = blobServiceClient.getContainerClient("profile-pictures");
      await profileContainerClient.createIfNotExists({ access: 'blob' });
      console.log('✅ Container de perfiles listo: profile-pictures');
      
      // Configurar container para fotos de recetas
      recipesContainerClient = blobServiceClient.getContainerClient("recipe-images");
      await recipesContainerClient.createIfNotExists({ access: 'blob' });
      console.log('✅ Container de recetas listo: recipe-images');
      
      console.log('🔗 URL Base: https://recipeboxfotosgt.blob.core.windows.net/');
    } else {
      console.log('❌ Azure Storage no configurado - NO se podrán subir imágenes');
    }
  } catch (error) {
    console.log('❌ Error configurando Azure Storage:', error.message);
  }
}

// Función para subir imágenes de perfil a Azure
async function uploadProfileImageToAzure(file, fileName) {
  if (!profileContainerClient) {
    throw new Error('Azure Storage no configurado');
  }

  const blockBlobClient = profileContainerClient.getBlockBlobClient(fileName);
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype }
  });
  
  // ✅ URL CORREGIDA de Azure para perfil
  const azureUrl = `https://recipeboxfotosgt.blob.core.windows.net/profile-pictures/${fileName}`;
  console.log('📸 Imagen de perfil subida a Azure:', azureUrl);
  return azureUrl;
}

// Función para subir imágenes de recetas a Azure
async function uploadRecipeImageToAzure(file, fileName) {
  if (!recipesContainerClient) {
    throw new Error('Azure Storage no configurado');
  }

  const blockBlobClient = recipesContainerClient.getBlockBlobClient(fileName);
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype }
  });
  
  // ✅ URL CORREGIDA de Azure para recetas
  const azureUrl = `https://recipeboxfotosgt.blob.core.windows.net/recipe-images/${fileName}`;
  console.log('🍳 Imagen de receta subida a Azure:', azureUrl);
  return azureUrl;
}

// ==================== CONFIGURACIÓN MULTER ====================
const storage = multer.memoryStorage(); // Usar memory storage para Azure

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ==================== INICIALIZACIÓN BASE DE DATOS ====================
initializeDatabase().then(() => {
  console.log('✅ Base de datos lista');
}).catch(error => {
  console.error('❌ Error iniciando base de datos:', error.message);
  console.log('⚠️  El servidor continuará ejecutándose, pero algunas funciones pueden no trabajar');
});

// ==================== MIDDLEWARE DE AUTENTICACIÓN ====================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// ==================== RUTAS DE USUARIO ====================

// Registro de usuario
app.post('/api/register', upload.single('profile_image'), async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // Validaciones
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si usuario existe
    const userExists = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Usuario o email ya existe' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let profileImageUrl = null;
    
    // SUBIR IMAGEN DE PERFIL A AZURE
    if (req.file) {
      if (!profileContainerClient) {
        return res.status(500).json({ error: 'Azure Storage no configurado. No se pueden subir imágenes.' });
      }

      try {
        const fileName = `profile-${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname}`;
        profileImageUrl = await uploadProfileImageToAzure(req.file, fileName);
        console.log('✅ Imagen de perfil guardada en Azure:', profileImageUrl);
      } catch (azureError) {
        console.error('❌ Error subiendo imagen de perfil a Azure:', azureError);
        return res.status(500).json({ error: 'Error subiendo imagen de perfil' });
      }
    }

    // Insertar usuario en PostgreSQL
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password, profile_image) VALUES ($1, $2, $3, $4) RETURNING id, username, email, profile_image',
      [username, email, hashedPassword, profileImageUrl]
    );

    console.log('📊 Usuario guardado en BD. Imagen:', newUser.rows[0].profile_image);

    const token = jwt.sign(
      { id: newUser.rows[0].id, username }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      message: 'Usuario creado exitosamente',
      token,
      user: {
        id: newUser.rows[0].id,
        username: newUser.rows[0].username,
        email: newUser.rows[0].email,
        profile_image: newUser.rows[0].profile_image
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login de usuario
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Buscar usuario en PostgreSQL
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult.rows[0];

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '24h' });
    
    console.log('🔐 Login exitoso. Usuario:', user.username, 'Imagen:', user.profile_image);
    
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_image: user.profile_image
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener perfil de usuario
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username, email, profile_image, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult.rows[0];
    console.log('👤 Perfil consultado:', user.username, 'Imagen:', user.profile_image);
    
    res.json(user);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar perfil de usuario
app.put('/api/profile', authenticateToken, upload.single('profile_image'), async (req, res) => {
  try {
    const { username, email } = req.body;
    let profileImageUrl = null;

    // Validaciones
    if (!username || !email) {
      return res.status(400).json({ error: 'Usuario y email son requeridos' });
    }

    // Verificar si el username o email ya existen en otros usuarios
    const userExists = await pool.query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
      [username, email, req.user.id]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Usuario o email ya existe' });
    }

    // SUBIR NUEVA IMAGEN DE PERFIL A AZURE
    if (req.file) {
      if (!profileContainerClient) {
        return res.status(500).json({ error: 'Azure Storage no configurado. No se pueden subir imágenes.' });
      }

      try {
        const fileName = `profile-${req.user.id}-${Date.now()}-${req.file.originalname}`;
        profileImageUrl = await uploadProfileImageToAzure(req.file, fileName);
        console.log('✅ Nueva imagen de perfil subida a Azure:', profileImageUrl);
      } catch (azureError) {
        console.error('❌ Error subiendo nueva imagen a Azure:', azureError);
        return res.status(500).json({ error: 'Error subiendo imagen de perfil' });
      }
    }

    // Actualizar usuario en la base de datos
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, profile_image = COALESCE($3, profile_image) WHERE id = $4 RETURNING id, username, email, profile_image',
      [username, email, profileImageUrl, req.user.id]
    );

    console.log('📊 Perfil actualizado. Nueva imagen:', result.rows[0].profile_image);

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==================== RUTAS DE RECETAS ====================

// Obtener todas las recetas
app.get('/api/recipes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*, 
        u.username as author,
        u.profile_image as author_profile_image,
        EXISTS(
          SELECT 1 FROM favorites f 
          WHERE f.user_id = $1 AND f.recipe_id = r.id
        ) as is_favorite
      FROM recipes r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    // Convertir is_favorite de PostgreSQL a boolean de JavaScript
    const recipes = result.rows.map(recipe => ({
      ...recipe,
      is_favorite: Boolean(recipe.is_favorite)
    }));

    console.log('🍽️  Recetas obtenidas:', recipes.length, 'recetas');
    
    res.json(recipes);
  } catch (error) {
    console.error('Error obteniendo recetas:', error);
    res.status(500).json({ error: 'Error obteniendo recetas' });
  }
});

// Crear receta
app.post('/api/recipes', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, ingredients, instructions } = req.body;

    if (!title || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Título, ingredientes e instrucciones son requeridos' });
    }

    let imageUrl = null;

    // SUBIR IMAGEN DE RECETA A AZURE
    if (req.file) {
      if (!recipesContainerClient) {
        return res.status(500).json({ error: 'Azure Storage no configurado. No se pueden subir imágenes.' });
      }

      try {
        const fileName = `recipe-${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname}`;
        imageUrl = await uploadRecipeImageToAzure(req.file, fileName);
        console.log('✅ Imagen de receta guardada en Azure:', imageUrl);
      } catch (azureError) {
        console.error('❌ Error subiendo imagen de receta a Azure:', azureError);
        return res.status(500).json({ error: 'Error subiendo imagen de receta' });
      }
    }

    const result = await pool.query(
      'INSERT INTO recipes (title, description, ingredients, instructions, image_url, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, ingredients, instructions, imageUrl, req.user.id]
    );

    const newRecipe = result.rows[0];
    console.log('📊 Receta guardada en BD. ID:', newRecipe.id, 'Imagen:', newRecipe.image_url);

    res.status(201).json({ 
      message: 'Receta creada exitosamente',
      recipe: newRecipe
    });

  } catch (error) {
    console.error('Error creando receta:', error);
    res.status(500).json({ error: 'Error creando receta' });
  }
});

// Obtener mis recetas
app.get('/api/my-recipes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recipes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    console.log('👨‍🍳 Mis recetas obtenidas:', result.rows.length, 'recetas');
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo mis recetas:', error);
    res.status(500).json({ error: 'Error obteniendo recetas' });
  }
});

// Obtener receta específica
app.get('/api/recipes/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*, 
        u.username as author,
        u.profile_image as author_profile_image,
        EXISTS(
          SELECT 1 FROM favorites f 
          WHERE f.user_id = $1 AND f.recipe_id = r.id
        ) as is_favorite
      FROM recipes r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.id = $2
    `, [req.user.id, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    const recipe = {
      ...result.rows[0],
      is_favorite: Boolean(result.rows[0].is_favorite)
    };

    console.log('🔍 Receta específica obtenida:', recipe.title, 'Imagen:', recipe.image_url);

    res.json(recipe);
  } catch (error) {
    console.error('Error obteniendo receta:', error);
    res.status(500).json({ error: 'Error obteniendo receta' });
  }
});

// ==================== RUTAS DE FAVORITOS ====================

// Agregar a favoritos
app.post('/api/recipes/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      'INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT (user_id, recipe_id) DO NOTHING RETURNING id',
      [userId, recipeId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'La receta ya está en favoritos' });
    }

    console.log('⭐ Receta agregada a favoritos. Usuario:', userId, 'Receta:', recipeId);

    res.json({ message: 'Receta agregada a favoritos' });
  } catch (error) {
    console.error('Error agregando a favoritos:', error);
    res.status(500).json({ error: 'Error agregando a favoritos' });
  }
});

// Remover de favoritos
app.delete('/api/recipes/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'La receta no estaba en favoritos' });
    }

    console.log('❌ Receta removida de favoritos. Usuario:', userId, 'Receta:', recipeId);

    res.json({ message: 'Receta removida de favoritos' });
  } catch (error) {
    console.error('Error removiendo de favoritos:', error);
    res.status(500).json({ error: 'Error removiendo de favoritos' });
  }
});

// Obtener recetas favoritas
app.get('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*, 
        u.username as author,
        u.profile_image as author_profile_image
      FROM recipes r 
      JOIN favorites f ON r.id = f.recipe_id
      JOIN users u ON r.user_id = u.id 
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `, [req.user.id]);

    console.log('⭐ Recetas favoritas obtenidas:', result.rows.length, 'recetas');

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    res.status(500).json({ error: 'Error obteniendo favoritos' });
  }
});

// Verificar si una receta es favorita
app.get('/api/recipes/:id/is-favorite', authenticateToken, async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id FROM favorites WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );

    const isFavorite = result.rows.length > 0;
    console.log('🔍 Verificación favorito. Receta:', recipeId, 'Es favorito:', isFavorite);

    res.json({ isFavorite });
  } catch (error) {
    console.error('Error verificando favorito:', error);
    res.status(500).json({ error: 'Error verificando favorito' });
  }
});

// ==================== RUTAS ADICIONALES ====================

// Ruta de verificación de token
app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Token válido',
    user: req.user 
  });
});

// Ruta de salud
app.get('/', (req, res) => {
  res.json({ 
    message: 'RecipeShare API funcionando con PostgreSQL!',
    database: 'AWS RDS PostgreSQL',
    storage: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Azure Blob Storage' : 'No configurado',
    status: 'Online',
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, async () => {
  console.log('\n🚀 Servidor RecipeShare API iniciado:');
  console.log(`   📍 URL: http://localhost:${PORT}`);
  console.log(`   📊 Base de datos: AWS RDS PostgreSQL`);
  console.log(`   ☁️  Storage: ${process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Azure Blob Storage' : 'No configurado'}`);
  console.log(`   🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   ⏰ Hora: ${new Date().toLocaleString()}`);
  
  // Inicializar Azure Storage
  await initializeAzureStorage();
  
  console.log('\n✅ ¡Listo para recibir peticiones!');
});