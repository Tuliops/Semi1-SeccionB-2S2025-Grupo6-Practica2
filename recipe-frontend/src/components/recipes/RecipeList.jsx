import React from 'react';
import RecipeCard from './RecipeCard';

const RecipeList = ({ recipes, onFavoriteUpdate, loading }) => {
  if (loading) {
    return (
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
    );
  }

  if (!recipes || recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🍳</div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          No hay recetas aún
        </h3>
        <p className="text-gray-500">
          Sé el primero en compartir una receta con la comunidad
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onFavoriteUpdate={onFavoriteUpdate}
        />
      ))}
    </div>
  );
};

export default RecipeList;