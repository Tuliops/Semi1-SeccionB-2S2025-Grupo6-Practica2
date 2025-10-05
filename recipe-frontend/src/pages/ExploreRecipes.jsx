import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, ChefHat } from 'lucide-react';
import { recipeService } from '../services/api';
import RecipeList from '../components/recipes/RecipeList';

const ExploreRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await recipeService.getAllRecipes();
      setRecipes(response.data);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteUpdate = () => {
    // Recargar recetas para actualizar estados de favoritos
    loadRecipes();
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.ingredients?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: recipes.length,
    favorites: recipes.filter(r => r.is_favorite).length,
    recent: recipes.filter(r => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(r.created_at) > oneWeekAgo;
    }).length
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            Explorar Recetas
          </h1>
          <p className="text-gray-400 mt-2">
            Descubre las mejores recetas de nuestra comunidad
          </p>
        </div>
        
        <Link
          to="/create-recipe"
          className="btn-primary flex items-center space-x-2 w-fit"
        >
          <Plus size={20} />
          <span>Crear Receta</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.total}</div>
          <div className="text-gray-400 text-sm">Total Recetas</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-rose-400">{stats.favorites}</div>
          <div className="text-gray-400 text-sm">Tus Favoritos</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.recent}</div>
          <div className="text-gray-400 text-sm">Esta Semana</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Buscar recetas, ingredientes, chefs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 pr-4"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center space-x-2 w-full sm:w-auto justify-center"
          >
            <Filter size={18} />
            <span>Filtros</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ordenar por
                </label>
                <select className="input-field">
                  <option>Más recientes</option>
                  <option>Más populares</option>
                  <option>Mejor valoradas</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tiempo de cocina
                </label>
                <select className="input-field">
                  <option>Cualquier tiempo</option>
                  <option>Rápidas (≤ 30 min)</option>
                  <option>Moderadas (31-60 min)</option>
                  <option>Extensas (61+ min)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categoría
                </label>
                <select className="input-field">
                  <option>Todas las categorías</option>
                  <option>Postres</option>
                  <option>Platos principales</option>
                  <option>Ensaladas</option>
                  <option>Bebidas</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          Mostrando <span className="text-amber-400 font-medium">{filteredRecipes.length}</span> recetas
          {searchTerm && (
            <span> para "<span className="text-amber-400">{searchTerm}</span>"</span>
          )}
        </p>
      </div>

      {/* Recipe Grid */}
      <RecipeList
        recipes={filteredRecipes}
        onFavoriteUpdate={handleFavoriteUpdate}
        loading={loading}
      />

      {/* Empty State */}
      {!loading && filteredRecipes.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <ChefHat size={64} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No se encontraron recetas
          </h3>
          <p className="text-gray-500 mb-4">
            No hay recetas que coincidan con "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="btn-secondary"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}
    </div>
  );
};

export default ExploreRecipes;