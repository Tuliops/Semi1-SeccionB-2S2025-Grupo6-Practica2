import { useState, useEffect } from 'react';
import { recipeService } from '../services/api';
import { useToast } from '../context/ToastContext';

export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await recipeService.getAllRecipes();
      setRecipes(response.data);
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Error al cargar recetas';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const createRecipe = async (recipeData) => {
    try {
      const response = await recipeService.createRecipe(recipeData);
      toast.success('Receta creada exitosamente');
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Error al crear receta';
      toast.error(message);
      throw err;
    }
  };

  const toggleFavorite = async (recipeId, currentState) => {
    try {
      if (currentState) {
        await recipeService.removeFromFavorites(recipeId);
        toast.success('Receta removida de favoritos');
      } else {
        await recipeService.addToFavorites(recipeId);
        toast.success('Receta agregada a favoritos');
      }
      return !currentState;
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Error al actualizar favoritos';
      toast.error(message);
      throw err;
    }
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  return {
    recipes,
    loading,
    error,
    loadRecipes,
    createRecipe,
    toggleFavorite,
    refetch: loadRecipes
  };
};