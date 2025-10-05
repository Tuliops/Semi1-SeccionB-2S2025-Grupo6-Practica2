import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChefHat, Edit, Trash2, Eye } from 'lucide-react';
import { recipeService } from '../services/api';
import RecipeList from '../components/recipes/RecipeList';

const MyRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0
  });

  useEffect(() => {
    loadMyRecipes();
  }, []);

  const loadMyRecipes = async () => {
    try {
      setLoading(true);
      const response = await recipeService.getMyRecipes();
      setRecipes(response.data);
      
      // Calcular estadísticas
      setStats({
        total: response.data.length,
        published: response.data.length, // Todas están publicadas por ahora
        drafts: 0
      });
    } catch (error) {
      console.error('Error loading my recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteUpdate = () => {
    // Recargar recetas para actualizar estados de favoritos
    loadMyRecipes();
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta receta? Esta acción no se puede deshacer.')) {
      try {
        // Nota: Necesitaríamos agregar un endpoint de eliminar en el backend
        // Por ahora solo simulamos la eliminación
        setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
        
        // Aquí iría la llamada real al API cuando tengamos el endpoint:
        // await recipeService.deleteRecipe(recipeId);
        
      } catch (error) {
        console.error('Error deleting recipe:', error);
        alert('Error al eliminar la receta');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            Mis Recetas
          </h1>
          <p className="text-gray-400 mt-2">
            Gestiona y edita las recetas que has creado
          </p>
        </div>
        
        <Link
          to="/create-recipe"
          className="btn-primary flex items-center space-x-2 w-fit"
        >
          <Plus size={20} />
          <span>Nueva Receta</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.total}</div>
          <div className="text-gray-400 text-sm">Total</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.published}</div>
          <div className="text-gray-400 text-sm">Publicadas</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.drafts}</div>
          <div className="text-gray-400 text-sm">Borradores</div>
        </div>
      </div>

      {/* Recipe Grid with Actions */}
      {!loading && recipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
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
                
                {/* Acciones */}
                <div className="absolute top-3 right-3 flex space-x-2">
                  <Link
                    to={`/recipe/${recipe.id}`}
                    className="p-2 bg-gray-900/80 backdrop-blur-sm text-gray-300 hover:text-amber-400 rounded-full transition-colors"
                    title="Ver receta"
                  >
                    <Eye size={16} />
                  </Link>
                  <button
                    className="p-2 bg-gray-900/80 backdrop-blur-sm text-gray-300 hover:text-blue-400 rounded-full transition-colors"
                    title="Editar receta"
                    onClick={() => alert('Funcionalidad de edición próximamente')}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="p-2 bg-gray-900/80 backdrop-blur-sm text-gray-300 hover:text-red-400 rounded-full transition-colors"
                    title="Eliminar receta"
                    onClick={() => handleDeleteRecipe(recipe.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-5">
                <h3 className="font-semibold text-lg text-gray-100 mb-2 line-clamp-2">
                  {recipe.title}
                </h3>
                
                <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                  {recipe.description || 'Una deliciosa receta compartida por la comunidad.'}
                </p>

                {/* Información adicional */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                    Publicada
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(recipe.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>

                {/* Stats rápidas */}
                <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-xs text-gray-500">
                  <span>👁️ 124</span>
                  <span>❤️ 45</span>
                  <span>💬 12</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <RecipeList recipes={[]} loading={true} />
      )}

      {/* Empty State */}
      {!loading && recipes.length === 0 && (
        <div className="card text-center py-16">
          <ChefHat size={64} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            Aún no has creado recetas
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Comparte tu primera receta con la comunidad y comienza tu journey culinario
          </p>
          <Link
            to="/create-recipe"
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Crear Mi Primera Receta</span>
          </Link>
        </div>
      )}

      {/* Tips */}
      {!loading && recipes.length > 0 && (
        <div className="card p-6 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700">
          <h4 className="font-semibold text-amber-400 mb-2">💡 Tips para tus recetas</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Usa fotos atractivas para aumentar la visibilidad</li>
            <li>• Describe claramente cada paso de preparación</li>
            <li>• Incluye tiempos de cocción y porciones</li>
            <li>• Etiqueta tus recetas con ingredientes principales</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default MyRecipes;