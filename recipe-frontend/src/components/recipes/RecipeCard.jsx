import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Clock, User, Star } from 'lucide-react';
import { recipeService } from '../../services/api';

const RecipeCard = ({ recipe, onFavoriteUpdate }) => {
  const [isFavorite, setIsFavorite] = useState(recipe.is_favorite);
  const [isLoading, setIsLoading] = useState(false);

  const handleFavoriteClick = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (isFavorite) {
        await recipeService.removeFromFavorites(recipe.id);
        setIsFavorite(false);
      } else {
        await recipeService.addToFavorites(recipe.id);
        setIsFavorite(true);
      }
      
      if (onFavoriteUpdate) {
        onFavoriteUpdate();
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRandomCookingTime = () => {
    const times = [15, 20, 25, 30, 35, 40, 45, 50];
    return times[Math.floor(Math.random() * times.length)];
  };

  const getRandomRating = () => {
    return (Math.random() * (5 - 3.5) + 3.5).toFixed(1);
  };

  // ✅ FUNCIÓN PARA MANEJAR URLs DE IMAGEN CORRECTAMENTE
  const getImageUrl = (url) => {
    if (!url) return null;
    
    // Si ya es una URL completa de Azure, úsala directamente
    if (url.startsWith('http')) {
      return url;
    }
    
    // Si es una ruta relativa, conviértela a absoluta
    if (url.startsWith('/')) {
      return `http://localhost:3000${url}`;
    }
    
    return url;
  };

  console.log('🖼️ Recipe image URL:', recipe.image_url); // Debug
  console.log('👤 Author image URL:', recipe.author_profile_image); // Debug

  return (
    <div className="card group hover:scale-105 hover:shadow-xl transition-all duration-300">
      {/* Imagen de la receta */}
      <div className="relative">
        {recipe.image_url ? (
          <img
            src={getImageUrl(recipe.image_url)} // ✅ CORREGIDO
            alt={recipe.title}
            className="w-full h-48 object-cover group-hover:brightness-110 transition-all duration-300"
            onError={(e) => {
              console.error('❌ Error loading recipe image:', recipe.image_url);
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <span className="text-4xl text-gray-600">🍳</span>
          </div>
        )}
        
        {/* Fallback si la imagen falla */}
        <div 
          className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center hidden"
          style={{ display: recipe.image_url ? 'none' : 'flex' }}
        >
          <span className="text-4xl text-gray-600">🍳</span>
        </div>
        
        {/* Botón de favoritos */}
        <button
          onClick={handleFavoriteClick}
          disabled={isLoading}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
            isFavorite 
              ? 'bg-rose-500/90 text-white shadow-lg' 
              : 'bg-gray-900/70 text-gray-300 hover:bg-gray-900/90 hover:text-rose-400'
          } ${isLoading ? 'opacity-50' : ''}`}
        >
          <Heart 
            size={20} 
            fill={isFavorite ? 'currentColor' : 'none'}
            className={isFavorite ? 'scale-110' : ''}
          />
        </button>

        {/* Badge de rating */}
        <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-sm text-amber-400 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
          <Star size={12} fill="currentColor" />
          <span>{getRandomRating()}</span>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-5">
        <Link to={`/recipe/${recipe.id}`} className="block">
          <h3 className="font-semibold text-lg text-gray-100 hover:text-amber-400 transition-colors mb-2 line-clamp-2 group-hover:underline">
            {recipe.title}
          </h3>
        </Link>
        
        <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
          {recipe.description || 'Una deliciosa receta compartida por la comunidad.'}
        </p>

        {/* Información adicional */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          {/* Autor */}
          <div className="flex items-center space-x-2">
            {recipe.author_profile_image ? (
              <img
                src={getImageUrl(recipe.author_profile_image)} // ✅ CORREGIDO
                alt={recipe.author}
                className="w-6 h-6 rounded-full object-cover border border-amber-500/30"
                onError={(e) => {
                  console.error('❌ Error loading profile image:', recipe.author_profile_image);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : (
              <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
                <User size={12} className="text-amber-400" />
              </div>
            )}
            {/* Fallback para imagen de perfil */}
            {recipe.author_profile_image && (
              <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 hidden">
                <User size={12} className="text-amber-400" />
              </div>
            )}
            <span className="text-gray-300">{recipe.author}</span>
          </div>

          {/* Tiempo de cocina */}
          <div className="flex items-center space-x-1 bg-gray-800/50 px-2 py-1 rounded-full">
            <Clock size={14} className="text-amber-400" />
            <span>{getRandomCookingTime()} min</span>
          </div>
        </div>

        {/* Ingredientes preview */}
        {recipe.ingredients && (
          <div className="pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 line-clamp-1">
              <span className="text-amber-400 font-medium">Ingredientes:</span>{' '}
              {typeof recipe.ingredients === 'string' 
                ? recipe.ingredients.substring(0, 80) + '...'
                : 'Ingredientes disponibles'
              }
            </p>
          </div>
        )}

        {/* Fecha */}
        <div className="mt-3 pt-3 border-t border-gray-800">
          <span className="text-xs text-gray-600">
            {formatDate(recipe.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;