import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChefHat, Clock, User } from 'lucide-react';
import { recipeService } from '../services/api';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await recipeService.getFavorites();
      setFavorites(response.data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (recipeId) => {
    try {
      await recipeService.removeFromFavorites(recipeId);
      // Actualizar la lista localmente
      setFavorites(prev => prev.filter(recipe => recipe.id !== recipeId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const getRandomCookingTime = () => {
    const times = [15, 20, 25, 30, 35, 40, 45, 50];
    return times[Math.floor(Math.random() * times.length)];
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            Mis Favoritos
          </h1>
          <p className="text-gray-400 mt-2">Tus recetas guardadas</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="card animate-pulse">
              <div className="h-48 bg-gray-800 rounded-t-lg"></div>
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-800 rounded"></div>
                <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                <div className="h-3 bg-gray-800 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
          Mis Favoritos
        </h1>
        <p className="text-gray-400 mt-2">
          {favorites.length === 0 
            ? "Guarda tus recetas favoritas para acceder fácilmente"
            : `Tienes ${favorites.length} recetas guardadas`}
        </p>
      </div>

      {/* Stats */}
      {favorites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-rose-400">{favorites.length}</div>
            <div className="text-gray-400 text-sm">Total</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {favorites.filter(r => getRandomCookingTime() <= 30).length}
            </div>
            <div className="text-gray-400 text-sm">Rápidas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {favorites.filter(r => !r.image_url).length}
            </div>
            <div className="text-gray-400 text-sm">Sin imagen</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {new Set(favorites.map(r => r.author)).size}
            </div>
            <div className="text-gray-400 text-sm">Chefs distintos</div>
          </div>
        </div>
      )}

      {/* Favorites Grid */}
      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((recipe) => (
            <div key={recipe.id} className="card group hover:scale-105 hover:shadow-xl transition-all duration-300">
              {/* Imagen de la receta */}
              <div className="relative">
                {recipe.image_url ? (
                  <img
                    src={`http://localhost:3000${recipe.image_url}`}
                    alt={recipe.title}
                    className="w-full h-48 object-cover group-hover:brightness-110 transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <span className="text-4xl text-gray-600">🍳</span>
                  </div>
                )}
                
                {/* Botón de eliminar favorito */}
                <button
                  onClick={() => handleRemoveFavorite(recipe.id)}
                  className="absolute top-3 right-3 p-2 bg-rose-500/90 text-white rounded-full backdrop-blur-sm hover:bg-rose-600 transition-all duration-300 shadow-lg"
                  title="Quitar de favoritos"
                >
                  <Heart size={20} fill="currentColor" />
                </button>

                {/* Tiempo de cocina */}
                <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-sm text-amber-400 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                  <Clock size={12} />
                  <span>{getRandomCookingTime()} min</span>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-5">
                <Link to={`/recipe/${recipe.id}`} className="block">
                  <h3 className="font-semibold text-lg text-gray-100 hover:text-rose-400 transition-colors mb-2 line-clamp-2 group-hover:underline">
                    {recipe.title}
                  </h3>
                </Link>
                
                <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                  {recipe.description || 'Una deliciosa receta compartida por la comunidad.'}
                </p>

                {/* Información del autor */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    {recipe.author_profile_image ? (
                      <img
                        src={`http://localhost:3000${recipe.author_profile_image}`}
                        alt={recipe.author}
                        className="w-6 h-6 rounded-full object-cover border border-amber-500/30"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
                        <User size={12} className="text-amber-400" />
                      </div>
                    )}
                    <span className="text-gray-300">{recipe.author}</span>
                  </div>
                </div>

                {/* Fecha de guardado */}
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <span className="text-xs text-rose-400">⭐ Guardada en favoritos</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="card text-center py-16">
          <Heart size={64} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            Aún no tienes favoritos
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Cuando encuentres recetas que te gusten, haz clic en el corazón para guardarlas aquí
          </p>
          <Link
            to="/"
            className="btn-primary inline-flex items-center space-x-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
          >
            <ChefHat size={20} />
            <span>Explorar Recetas</span>
          </Link>
        </div>
      )}

      {/* Tips para favoritos */}
      {favorites.length > 0 && (
        <div className="card p-6 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700">
          <h4 className="font-semibold text-rose-400 mb-2">💡 Organiza tus favoritos</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Guarda recetas que quieras preparar más tarde</li>
            <li>• Crea tu propia colección de especialidades</li>
            <li>• Fácil acceso a tus recetas preferidas</li>
            <li>• Inspírate para tus próximas creaciones</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Favorites;