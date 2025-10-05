const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'tu_clave_secreta_para_desarrollo';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configuración de Multer para imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
});

// Base de datos SQLite
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error conectando a SQLite:', err);
  } else {
    console.log('✅ Conectado a SQLite');
    initializeDatabase();
  }
});

// Inicializar tablas
function initializeDatabase() {
  // Tabla de Usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      profile_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de Recetas
  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      ingredients TEXT,
      instructions TEXT,
      image_url TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Tabla de Favoritos
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      recipe_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
      UNIQUE(user_id, recipe_id)
    )
  `);

  console.log('✅ Tablas inicializadas correctamente');
}

// Middleware de autenticación
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

// 1. Registro de usuario (CONFIRMACIÓN DE CONTRASEÑA)
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
    db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error en la base de datos' });
      }
      if (row) {
        return res.status(400).json({ error: 'Usuario o email ya existe' });
      }

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      const profileImage = req.file ? `/uploads/${req.file.filename}` : null;

      db.run(
        'INSERT INTO users (username, email, password, profile_image) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, profileImage],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error creando usuario' });
          }
          
          const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '24h' });
          res.status(201).json({ 
            message: 'Usuario creado exitosamente',
            token,
            user: { 
              id: this.lastID, 
              username, 
              email, 
              profile_image: profileImage 
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 2. Login de usuario
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Error en la base de datos' });
    }
    if (!user) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '24h' });
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
  });
});

// ==================== RUTAS DE RECETAS ====================

// 3. Obtener todas las recetas (EXPLORAR RECETAS)
app.get('/api/recipes', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      r.*, 
      u.username as author,
      u.profile_image as author_profile_image,
      EXISTS(
        SELECT 1 FROM favorites f 
        WHERE f.user_id = ? AND f.recipe_id = r.id
      ) as is_favorite
    FROM recipes r 
    JOIN users u ON r.user_id = u.id 
    ORDER BY r.created_at DESC
  `;

  db.all(query, [req.user.id], (err, rows) => {
    if (err) {
      console.error('Error obteniendo recetas:', err);
      return res.status(500).json({ error: 'Error obteniendo recetas' });
    }
    
    // Parsear ingredients e instructions de JSON si es necesario
    const recipes = rows.map(recipe => ({
      ...recipe,
      is_favorite: Boolean(recipe.is_favorite)
    }));
    
    res.json(recipes);
  });
});

// 4. Crear receta (CREAR Y COMPARTIR RECETAS)
app.post('/api/recipes', authenticateToken, upload.single('image'), (req, res) => {
  const { title, description, ingredients, instructions } = req.body;

  if (!title || !ingredients || !instructions) {
    return res.status(400).json({ error: 'Título, ingredientes e instrucciones son requeridos' });
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    'INSERT INTO recipes (title, description, ingredients, instructions, image_url, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [title, description, ingredients, instructions, imageUrl, req.user.id],
    function(err) {
      if (err) {
        console.error('Error creando receta:', err);
        return res.status(500).json({ error: 'Error creando receta' });
      }
      
      res.status(201).json({ 
        message: 'Receta creada y compartida exitosamente',
        recipeId: this.lastID 
      });
    }
  );
});

// 5. Obtener mis recetas (MIS RECETAS)
app.get('/api/my-recipes', authenticateToken, (req, res) => {
  const query = `
    SELECT * FROM recipes 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `;

  db.all(query, [req.user.id], (err, rows) => {
    if (err) {
      console.error('Error obteniendo mis recetas:', err);
      return res.status(500).json({ error: 'Error obteniendo recetas' });
    }
    res.json(rows);
  });
});

// ==================== RUTAS DE FAVORITOS ====================

// 6. Agregar a favoritos (GUARDAR RECETAS)
app.post('/api/recipes/:id/favorite', authenticateToken, (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id;

  db.run(
    'INSERT OR IGNORE INTO favorites (user_id, recipe_id) VALUES (?, ?)',
    [userId, recipeId],
    function(err) {
      if (err) {
        console.error('Error agregando a favoritos:', err);
        return res.status(500).json({ error: 'Error agregando a favoritos' });
      }

      if (this.changes === 0) {
        return res.status(400).json({ error: 'La receta ya está en favoritos' });
      }

      res.json({ message: 'Receta agregada a favoritos' });
    }
  );
});

// 7. Remover de favoritos
app.delete('/api/recipes/:id/favorite', authenticateToken, (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id;

  db.run(
    'DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?',
    [userId, recipeId],
    function(err) {
      if (err) {
        console.error('Error removiendo de favoritos:', err);
        return res.status(500).json({ error: 'Error removiendo de favoritos' });
      }

      res.json({ message: 'Receta removida de favoritos' });
    }
  );
});

// 8. Obtener recetas favoritas (RECETAS FAVORITAS)
app.get('/api/favorites', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      r.*, 
      u.username as author,
      u.profile_image as author_profile_image
    FROM recipes r 
    JOIN favorites f ON r.id = f.recipe_id
    JOIN users u ON r.user_id = u.id 
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `;

  db.all(query, [req.user.id], (err, rows) => {
    if (err) {
      console.error('Error obteniendo favoritos:', err);
      return res.status(500).json({ error: 'Error obteniendo favoritos' });
    }
    res.json(rows);
  });
});

// 9. Verificar si una receta es favorita
app.get('/api/recipes/:id/is-favorite', authenticateToken, (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id;

  db.get(
    'SELECT id FROM favorites WHERE user_id = ? AND recipe_id = ?',
    [userId, recipeId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error verificando favorito' });
      }
      res.json({ isFavorite: !!row });
    }
  );
});

// ==================== RUTAS ADICIONALES ====================

// 10. Obtener perfil de usuario
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email, profile_image, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error obteniendo perfil' });
      }
      res.json(user);
    }
  );
});

// 11. Obtener receta específica
app.get('/api/recipes/:id', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      r.*, 
      u.username as author,
      u.profile_image as author_profile_image,
      EXISTS(
        SELECT 1 FROM favorites f 
        WHERE f.user_id = ? AND f.recipe_id = r.id
      ) as is_favorite
    FROM recipes r 
    JOIN users u ON r.user_id = u.id 
    WHERE r.id = ?
  `;

  db.get(query, [req.user.id, req.params.id], (err, recipe) => {
    if (err) {
      console.error('Error obteniendo receta:', err);
      return res.status(500).json({ error: 'Error obteniendo receta' });
    }
    
    if (!recipe) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    recipe.is_favorite = Boolean(recipe.is_favorite);
    res.json(recipe);
  });
});

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
    message: 'API de Recetas funcionando!',
    endpoints: {
      auth: ['POST /api/register', 'POST /api/login'],
      recipes: ['GET /api/recipes', 'POST /api/recipes', 'GET /api/my-recipes', 'GET /api/recipes/:id'],
      favorites: ['GET /api/favorites', 'POST /api/recipes/:id/favorite', 'DELETE /api/recipes/:id/favorite']
    }
  });
});

// Manejo de errores de Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 5MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📚 Documentación disponible en http://localhost:${PORT}`);
});