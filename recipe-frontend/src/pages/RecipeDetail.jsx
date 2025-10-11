import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recipeService } from '../services/api';
import { 
  Clock, 
  Users, 
  Heart, 
  Share2, 
  ChefHat, 
  ArrowLeft,
  Star,
  Clock4,
  User,
  Calendar
} from 'lucide-react';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const response = await recipeService.getRecipe(id);
      setRecipe(response.data);
      setIsFavorite(response.data.is_favorite);
    } catch (error) {
      console.error('Error loading recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteClick = async () => {
    if (favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await recipeService.removeFromFavorites(recipe.id);
        setIsFavorite(false);
      } else {
        await recipeService.addToFavorites(recipe.id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: recipe.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace copiado al portapapeles!');
    }
  };

  const getRandomData = () => {
    return {
      cookingTime: [15, 20, 25, 30, 35, 40, 45, 50][Math.floor(Math.random() * 8)],
      servings: [2, 4, 6, 8][Math.floor(Math.random() * 4)],
      difficulty: ['Fácil', 'Media', 'Difícil'][Math.floor(Math.random() * 3)],
      rating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1)
    };
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-amber-400 hover:text-amber-300 transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>
        
        <div className="card animate-pulse">
          <div className="h-96 bg-gray-800 rounded-t-lg"></div>
          <div className="p-8 space-y-6">
            <div className="h-8 bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <ChefHat size={64} className="text-gray-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-300 mb-2">Receta no encontrada</h1>
        <p className="text-gray-500 mb-6">La receta que buscas no existe o fue eliminada.</p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const randomData = getRandomData();
  const ingredients = recipe.ingredients ? recipe.ingredients.split('\n').filter(i => i.trim()) : [];
  const instructions = recipe.instructions ? recipe.instructions.split('\n').filter(i => i.trim()) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-amber-400 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleShare}
            className="flex items-center space-x-2 text-gray-400 hover:text-amber-400 transition-colors p-2 rounded-lg hover:bg-gray-800"
            title="Compartir receta"
          >
            <Share2 size={20} />
          </button>
          
          <button
            onClick={handleFavoriteClick}
            disabled={favoriteLoading}
            className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-300 ${
              isFavorite 
                ? 'text-rose-400 bg-rose-400/10' 
                : 'text-gray-400 hover:text-rose-400 hover:bg-gray-800'
            } ${favoriteLoading ? 'opacity-50' : ''}`}
            title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="card overflow-hidden">
        {/* Imagen principal */}
        <div className="relative">
          {recipe.image_url ? (
            <img
              src={`${recipe.image_url}`}
              alt={recipe.title}
              className="w-full h-96 object-cover"
            />
          ) : (
            <div className="w-full h-96 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <ChefHat size={64} className="text-gray-600" />
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>
          
          {/* Badge de autor */}
          <div className="absolute bottom-4 left-6 flex items-center space-x-3">
            {recipe.author_profile_image ? (
              <img
                src={`${recipe.author_profile_image}`}
                alt={recipe.author}
                className="w-12 h-12 rounded-full object-cover border-2 border-amber-400"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center border-2 border-amber-400">
                <User size={20} className="text-amber-400" />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-300">Por</p>
              <p className="font-semibold text-amber-400">{recipe.author}</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-8">
          {/* Título y descripción */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-100 mb-4">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="text-lg text-gray-400 leading-relaxed">
                {recipe.description}
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <Clock className="text-amber-400 mx-auto mb-2" size={24} />
              <div className="text-2xl font-bold text-gray-100">{randomData.cookingTime}</div>
              <div className="text-sm text-gray-400">Minutos</div>
            </div>
            
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <Users className="text-emerald-400 mx-auto mb-2" size={24} />
              <div className="text-2xl font-bold text-gray-100">{randomData.servings}</div>
              <div className="text-sm text-gray-400">Porciones</div>
            </div>
            
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <ChefHat className="text-blue-400 mx-auto mb-2" size={24} />
              <div className="text-2xl font-bold text-gray-100">{randomData.difficulty}</div>
              <div className="text-sm text-gray-400">Dificultad</div>
            </div>
            
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <Star className="text-yellow-400 mx-auto mb-2" size={24} fill="currentColor" />
              <div className="text-2xl font-bold text-gray-100">{randomData.rating}</div>
              <div className="text-sm text-gray-400">Rating</div>
            </div>
          </div>

          {/* Ingredientes e Instrucciones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ingredientes */}
            <div>
              <h2 className="text-2xl font-bold text-amber-400 mb-4 flex items-center">
                <ChefHat size={24} className="mr-2" />
                Ingredientes
              </h2>
              <div className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                    <div className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-300">{ingredient}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instrucciones */}
            <div>
              <h2 className="text-2xl font-bold text-amber-400 mb-4 flex items-center">
                <Clock4 size={24} className="mr-2" />
                Preparación
              </h2>
              <div className="space-y-4">
                {instructions.map((instruction, index) => (
                  <div key={index} className="flex space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-gray-900 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <p className="text-gray-300 leading-relaxed pt-1">
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Calendar size={16} />
                  <span>
                    Publicada el {new Date(recipe.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              
              {user && user.username === recipe.author && (
                <span className="text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full text-xs">
                  Tu receta
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="card p-6 text-center bg-gradient-to-r from-gray-800 to-gray-900">
        <h3 className="text-xl font-bold text-amber-400 mb-2">
          ¿Te gustó esta receta?
        </h3>
        <p className="text-gray-400 mb-4">
          Comparte tu propia versión o descubre más recetas increíbles
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/create-recipe"
            className="btn-primary"
          >
            Crear Mi Receta
          </Link>
          <Link
            to="/"
            className="btn-secondary"
          >
            Explorar Más
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;