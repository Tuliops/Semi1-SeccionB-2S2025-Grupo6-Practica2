import axios from 'axios';


// base de la URL :3000/api
const API_BASE_URL = 'http://'BASEDELAURL':3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 segundos timeout
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Manejo de errores de conexión
    if (error.code === 'ECONNABORTED') {
      throw new Error('El servidor está tardando demasiado en responder. Intenta nuevamente.');
    }
    
    if (!error.response) {
      throw new Error('Error de conexión. Verifica tu internet.');
    }
    
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  register: (userData) => {
    const formData = new FormData();
    formData.append('username', userData.username);
    formData.append('email', userData.email);
    formData.append('password', userData.password);
    formData.append('confirmPassword', userData.confirmPassword);
    if (userData.profile_image) {
      formData.append('profile_image', userData.profile_image);
    }
    return api.post('/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  login: (credentials) => api.post('/login', credentials),
  getProfile: () => api.get('/profile'),
  verifyToken: () => api.get('/verify-token'),
};

// Servicios de recetas
export const recipeService = {
  getAllRecipes: () => api.get('/recipes'),
  getMyRecipes: () => api.get('/my-recipes'),
  getRecipe: (id) => api.get(`/recipes/${id}`),
  createRecipe: (recipeData) => {
    const formData = new FormData();
    formData.append('title', recipeData.title);
    formData.append('description', recipeData.description);
    formData.append('ingredients', recipeData.ingredients);
    formData.append('instructions', recipeData.instructions);
    if (recipeData.image) {
      formData.append('image', recipeData.image);
    }
    return api.post('/recipes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getFavorites: () => api.get('/favorites'),
  addToFavorites: (recipeId) => api.post(`/recipes/${recipeId}/favorite`),
  removeFromFavorites: (recipeId) => api.delete(`/recipes/${recipeId}/favorite`),
  checkIsFavorite: (recipeId) => api.get(`/recipes/${recipeId}/is-favorite`),
  
  // Nuevos endpoints que podríamos agregar en el futuro
  updateRecipe: (recipeId, recipeData) => api.put(`/recipes/${recipeId}`, recipeData),
  deleteRecipe: (recipeId) => api.delete(`/recipes/${recipeId}`),
};

export default api;