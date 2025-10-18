// ==================== CONFIGURACIÓN DE ENTORNO ====================
import dotenv from 'dotenv';
// Cargar variables de entorno del archivo .env
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

// Configuración para usar __dirname con módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== VERIFICACIÓN DE VARIABLES DE ENTORNO ====================
console.log('\n--- VERIFICACIÓN DE VARIABLES CRÍTICAS ---');
const criticalVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
let allVarsPresent = true;

criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`[OK] ${varName}: ${varName.includes('PASSWORD') ? 'DEFINIDO (oculto)' : value}`);
  } else {
    console.log(`[FAIL] ${varName}: NO DEFINIDO`);
    allVarsPresent = false;
  }
});

console.log('\n--- VERIFICACIÓN DE AZURE STORAGE ---');
const azureVars = ['AZURE_STORAGE_CONNECTION_STRING'];
azureVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`[OK] ${varName}: DEFINIDO`);
  } else {
    console.log(`[FAIL] ${varName}: NO DEFINIDO`);
  }
});

if (!allVarsPresent) {
  console.warn('\n[ADVERTENCIA] Faltan variables críticas. El servidor podría operar con funcionalidad reducida.');
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_para_desarrollo';

// ==================== CONFIGURACIÓN DE MIDDLEWARE ====================

// Opciones de configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin 'origin' (e.g., herramientas como Postman, peticiones servidor a servidor)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://recipeboxfotosgt.z13.web.core.windows.net',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://recipeboxfotosgt.z13.web.core.windows.net' 
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS BLOQUEADO] Origen no permitido: ${origin}`);
      callback(new Error('Política CORS no permite el acceso desde este origen.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Manejar peticiones de pre-vuelo (preflight requests) para CORS
app.options('*', cors(corsOptions));

// Middleware de logging para peticiones entrantes
app.use((req, res, next) => {
  console.log(`[PETICIÓN] ${req.method} ${req.path} | Origen: ${req.headers.origin || 'N/A'}`);
  next();
});

// Middleware para parsear JSON y urlencoded con límites de tamaño
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== CONFIGURACIÓN DE AZURE BLOB STORAGE ====================
let blobServiceClient;
let profileContainerClient;
let recipesContainerClient;

/**
 * Inicializa la conexión con Azure Blob Storage y verifica/crea los contenedores.
 */
async function initializeAzureStorage() {
  try {
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
      
      // Contenedor para fotos de perfil
      profileContainerClient = blobServiceClient.getContainerClient("profile-pictures");
      await profileContainerClient.createIfNotExists({ access: 'blob' });
      console.log('[AZURE] Contenedor de perfiles listo: profile-pictures');
      
      // Contenedor para fotos de recetas
      recipesContainerClient = blobServiceClient.getContainerClient("recipe-images");
      await recipesContainerClient.createIfNotExists({ access: 'blob' });
      console.log('[AZURE] Contenedor de recetas listo: recipe-images');
      
      console.log('[AZURE] URL Base del Storage: https://recipeboxfotosgt.blob.core.windows.net/');
    } else {
      console.warn('[AZURE] Azure Storage no configurado. Las funcionalidades de carga de imágenes estarán deshabilitadas.');
    }
  } catch (error) {
    console.error('[ERROR AZURE] Error configurando Azure Storage:', error.message);
  }
}

/**
 * Sube un archivo de imagen de perfil al contenedor de Azure.
 * @param {object} file - Objeto de archivo de Multer.
 * @param {string} fileName - Nombre del archivo a usar en Azure.
 * @returns {Promise<string>} URL pública del archivo subido.
 */
async function uploadProfileImageToAzure(file, fileName) {
  if (!profileContainerClient) {
    throw new Error('Azure Storage no está disponible o configurado.');
  }

  const blockBlobClient = profileContainerClient.getBlockBlobClient(fileName);
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype }
  });
  
  const azureUrl = `https://recipeboxfotosgt.blob.core.windows.net/profile-pictures/${fileName}`;
  console.log(`[AZURE] Imagen de perfil subida: ${azureUrl}`);
  return azureUrl;
}

/**
 * Sube un archivo de imagen de receta al contenedor de Azure.
 * @param {object} file - Objeto de archivo de Multer.
 * @param {string} fileName - Nombre del archivo a usar en Azure.
 * @returns {Promise<string>} URL pública del archivo subido.
 */
async function uploadRecipeImageToAzure(file, fileName) {
  if (!recipesContainerClient) {
    throw new Error('Azure Storage no está disponible o configurado.');
  }

  const blockBlobClient = recipesContainerClient.getBlockBlobClient(fileName);
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype }
  });
  
  const azureUrl = `https://recipeboxfotosgt.blob.core.windows.net/recipe-images/${fileName}`;
  console.log(`[AZURE] Imagen de receta subida: ${azureUrl}`);
  return azureUrl;
}

// ==================== CONFIGURACIÓN DE MULTER ====================
// Usar memory storage para manejar la carga de archivos antes de enviarlos a Azure
const storage = multer.memoryStorage(); 

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB por archivo
});

// ==================== INICIALIZACIÓN DE DEPENDENCIAS CRÍTICAS ====================

// Inicializar y conectar la Base de Datos
initializeDatabase().then(() => {
  console.log('[DB] Conexión a Base de Datos establecida.');
}).catch(error => {
  console.error('[ERROR DB] Fallo al iniciar la base de datos:', error.message);
  console.warn('[ADVERTENCIA] El servidor continuará ejecutándose, pero las operaciones de base de datos fallarán.');
});

// ==================== MIDDLEWARE DE AUTENTICACIÓN ====================

/**
 * Middleware para verificar y validar el JSON Web Token (JWT).
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // El token se espera en el formato: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token de autenticación requerido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('[AUTH] Token inválido o expirado.');
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
    // Adjuntar la información del usuario al objeto de la petición
    req.user = user;
    next();
  });
};

// ==================== RUTAS DE AUTENTICACIÓN Y USUARIO ====================

// Registro de usuario
app.post('/api/register', upload.single('profile_image'), async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // Validaciones de datos de entrada
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Todos los campos son requeridos para el registro.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // Verificar unicidad de usuario/email
    const userExists = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario o correo electrónico ya está en uso.' });
    }

    // Encriptación de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let profileImageUrl = null;
    
    // Gestión de subida de imagen a Azure
    if (req.file) {
      if (!profileContainerClient) {
        return res.status(500).json({ error: 'Error de configuración de Azure Storage. No se pueden subir imágenes.' });
      }

      try {
        const fileName = `profile-${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname}`;
        profileImageUrl = await uploadProfileImageToAzure(req.file, fileName);
      } catch (azureError) {
        console.error('[ERROR AZURE] Error subiendo imagen de perfil:', azureError);
        return res.status(500).json({ error: 'Error al subir la imagen de perfil al almacenamiento externo.' });
      }
    }

    // Insertar el nuevo usuario en la base de datos
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password, profile_image) VALUES ($1, $2, $3, $4) RETURNING id, username, email, profile_image',
      [username, email, hashedPassword, profileImageUrl]
    );

    console.log(`[DB] Nuevo usuario registrado: ID ${newUser.rows[0].id}, Username: ${newUser.rows[0].username}`);

    // Generar JWT para la sesión
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
    console.error('[ERROR] Error en la ruta de registro:', error);
    res.status(500).json({ error: 'Error interno del servidor durante el registro.' });
  }
});

// Login de usuario
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    // Buscar usuario por nombre de usuario
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    const user = userResult.rows[0];

    // Verificar contraseña encriptada
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    // Generar JWT
    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '24h' });
    
    console.log(`[AUTH] Login exitoso para el usuario: ${user.username}`);
    
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
    console.error('[ERROR] Error en la ruta de login:', error);
    res.status(500).json({ error: 'Error interno del servidor durante el login.' });
  }
});

// Obtener perfil de usuario autenticado
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username, email, profile_image, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      // Esto solo debería ocurrir si el token es válido pero el usuario fue eliminado
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos.' });
    }

    const user = userResult.rows[0];
    console.log(`[DB] Perfil consultado para: ${user.username}`);
    
    res.json(user);
  } catch (error) {
    console.error('[ERROR] Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener el perfil.' });
  }
});

// Actualizar perfil de usuario
app.put('/api/profile', authenticateToken, upload.single('profile_image'), async (req, res) => {
  try {
    const { username, email } = req.body;
    let profileImageUrl = null;

    // Validaciones
    if (!username || !email) {
      return res.status(400).json({ error: 'Nombre de usuario y correo electrónico son requeridos.' });
    }

    // Verificar colisiones de username/email con otros usuarios
    const userExists = await pool.query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
      [username, email, req.user.id]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario o correo electrónico ya está en uso por otro usuario.' });
    }

    // Subir nueva imagen de perfil si se proporciona un archivo
    if (req.file) {
      if (!profileContainerClient) {
        return res.status(500).json({ error: 'Error de configuración de Azure Storage. No se pueden subir imágenes.' });
      }

      try {
        // Usar el ID de usuario en el nombre de archivo para mejor gestión
        const fileName = `profile-${req.user.id}-${Date.now()}-${req.file.originalname}`;
        profileImageUrl = await uploadProfileImageToAzure(req.file, fileName);
      } catch (azureError) {
        console.error('[ERROR AZURE] Error subiendo nueva imagen de perfil:', azureError);
        return res.status(500).json({ error: 'Error al subir la nueva imagen de perfil.' });
      }
    }

    // Actualizar usuario en la base de datos. COALESCE($3, profile_image) mantiene la URL existente si $3 (profileImageUrl) es nulo.
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, profile_image = COALESCE($3, profile_image) WHERE id = $4 RETURNING id, username, email, profile_image',
      [username, email, profileImageUrl, req.user.id]
    );

    console.log(`[DB] Perfil actualizado para: ${result.rows[0].username}. Nueva imagen: ${result.rows[0].profile_image}`);

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('[ERROR] Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar el perfil.' });
  }
});

// ==================== RUTAS DE RECETAS ====================

// Obtener todas las recetas, incluyendo estado de favorito para el usuario autenticado
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

    // Mapear el resultado para convertir el valor booleano de PostgreSQL a JavaScript
    const recipes = result.rows.map(recipe => ({
      ...recipe,
      is_favorite: Boolean(recipe.is_favorite)
    }));

    console.log(`[DB] Se obtuvieron ${recipes.length} recetas para el feed.`);
    
    res.json(recipes);
  } catch (error) {
    console.error('[ERROR] Error obteniendo recetas:', error);
    res.status(500).json({ error: 'Error al obtener el listado de recetas.' });
  }
});

// Crear una nueva receta
app.post('/api/recipes', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, ingredients, instructions } = req.body;

    if (!title || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Los campos de título, ingredientes e instrucciones son obligatorios.' });
    }

    let imageUrl = null;

    // Subir imagen de receta a Azure
    if (req.file) {
      if (!recipesContainerClient) {
        return res.status(500).json({ error: 'Error de configuración de Azure Storage. No se pueden subir imágenes.' });
      }

      try {
        // Generar un nombre de archivo único para la receta
        const fileName = `recipe-${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname}`;
        imageUrl = await uploadRecipeImageToAzure(req.file, fileName);
      } catch (azureError) {
        console.error('[ERROR AZURE] Error subiendo imagen de receta:', azureError);
        return res.status(500).json({ error: 'Error al subir la imagen de la receta al almacenamiento externo.' });
      }
    }

    // Insertar la nueva receta en la base de datos
    const result = await pool.query(
      'INSERT INTO recipes (title, description, ingredients, instructions, image_url, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, ingredients, instructions, imageUrl, req.user.id]
    );

    const newRecipe = result.rows[0];
    console.log(`[DB] Receta creada: ID ${newRecipe.id}, Título: ${newRecipe.title}`);

    res.status(201).json({ 
      message: 'Receta creada exitosamente',
      recipe: newRecipe
    });

  } catch (error) {
    console.error('[ERROR] Error creando receta:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear la receta.' });
  }
});

// Obtener las recetas creadas por el usuario autenticado
app.get('/api/my-recipes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recipes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    console.log(`[DB] Se obtuvieron ${result.rows.length} recetas propias para el usuario ID ${req.user.id}.`);
    res.json(result.rows);
  } catch (error) {
    console.error('[ERROR] Error obteniendo recetas propias:', error);
    res.status(500).json({ error: 'Error al obtener las recetas del usuario.' });
  }
});

// Obtener una receta específica por ID
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
      return res.status(404).json({ error: 'Receta no encontrada.' });
    }

    const recipe = {
      ...result.rows[0],
      is_favorite: Boolean(result.rows[0].is_favorite)
    };

    console.log(`[DB] Receta consultada: ID ${recipe.id}, Título: ${recipe.title}`);

    res.json(recipe);
  } catch (error) {
    console.error('[ERROR] Error obteniendo receta específica:', error);
    res.status(500).json({ error: 'Error al obtener la receta.' });
  }
});

// ==================== RUTAS DE FAVORITOS ====================

// Agregar una receta a la lista de favoritos
app.post('/api/recipes/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;

    // Insertar el favorito, ignorando si ya existe (ON CONFLICT DO NOTHING)
    const result = await pool.query(
      'INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT (user_id, recipe_id) DO NOTHING RETURNING id',
      [userId, recipeId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'La receta ya había sido marcada como favorita.' });
    }

    console.log(`[FAVORITO] Agregado: Usuario ID ${userId}, Receta ID ${recipeId}`);

    res.json({ message: 'Receta agregada a favoritos exitosamente.' });
  } catch (error) {
    console.error('[ERROR] Error agregando a favoritos:', error);
    res.status(500).json({ error: 'Error interno del servidor al agregar a favoritos.' });
  }
});

// Remover una receta de la lista de favoritos
app.delete('/api/recipes/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'La receta no estaba en la lista de favoritos.' });
    }

    console.log(`[FAVORITO] Removido: Usuario ID ${userId}, Receta ID ${recipeId}`);

    res.json({ message: 'Receta removida de favoritos exitosamente.' });
  } catch (error) {
    console.error('[ERROR] Error removiendo de favoritos:', error);
    res.status(500).json({ error: 'Error interno del servidor al remover de favoritos.' });
  }
});

// Obtener todas las recetas favoritas del usuario autenticado
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

    console.log(`[DB] Se obtuvieron ${result.rows.length} recetas favoritas para el usuario ID ${req.user.id}.`);

    res.json(result.rows);
  } catch (error) {
    console.error('[ERROR] Error obteniendo favoritos:', error);
    res.status(500).json({ error: 'Error al obtener la lista de favoritos.' });
  }
});

// Verificar si una receta específica es favorita para el usuario autenticado
app.get('/api/recipes/:id/is-favorite', authenticateToken, async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id FROM favorites WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );

    const isFavorite = result.rows.length > 0;
    console.log(`[DB] Verificación de favorito: Receta ID ${recipeId} | Es favorito: ${isFavorite}`);

    res.json({ isFavorite });
  } catch (error) {
    console.error('[ERROR] Error verificando favorito:', error);
    res.status(500).json({ error: 'Error interno del servidor al verificar el estado de favorito.' });
  }
});

// ==================== RUTAS ADICIONALES ====================

// Ruta de verificación de token y sesión
app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Token de autenticación válido.',
    user: req.user 
  });
});

// Ruta de salud y estado del API
app.get('/', (req, res) => {
  res.json({ 
    message: 'RecipeShare API funcionando correctamente.',
    database: 'AWS RDS PostgreSQL',
    storage: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Azure Blob Storage' : 'No configurado',
    status: 'Online',
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  });
});

// Ruta 404 para endpoints no definidos
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada. Verifique el endpoint y el método HTTP.' });
});

// Manejo de errores global de Express
app.use((error, req, res, next) => {
  console.error('[ERROR GLOBAL] Error no manejado:', error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ==================== INICIAR SERVIDOR ====================

// El '0.0.0.0' asegura que el servidor escuche en todas las interfaces disponibles.
app.listen(PORT, '0.0.0.0', async () => {
  console.log('\n--- INICIO DE SERVIDOR API ---');
  console.log(`[INFO] Servidor RecipeShare API iniciado en el puerto: ${PORT}`);
  console.log(`[INFO] Enlace de acceso: http://0.0.0.0:${PORT}`);
  console.log(`[INFO] Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  // Inicializar Azure Storage de forma asíncrona
  await initializeAzureStorage();
  
  console.log('\n[LISTO] El servidor está operativo y listo para recibir peticiones.');
});