import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, Trash2, Loader, ChefHat } from 'lucide-react';
import { recipeService } from '../services/api';

const CreateRecipe = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ingredients: [''],
    instructions: [''],
    image: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen debe ser menor a 5MB');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  // Manejo de ingredientes dinámicos
  const handleIngredientChange = (index, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, '']
    }));
  };

  const removeIngredient = (index) => {
    if (formData.ingredients.length > 1) {
      const newIngredients = formData.ingredients.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, ingredients: newIngredients }));
    }
  };

  // Manejo de instrucciones dinámicas
  const handleInstructionChange = (index, value) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData(prev => ({ ...prev, instructions: newInstructions }));
  };

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  const removeInstruction = (index) => {
    if (formData.instructions.length > 1) {
      const newInstructions = formData.instructions.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, instructions: newInstructions }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validaciones
    if (!formData.title.trim()) {
      setError('El título es requerido');
      setLoading(false);
      return;
    }

    const validIngredients = formData.ingredients.filter(ing => ing.trim());
    if (validIngredients.length === 0) {
      setError('Agrega al menos un ingrediente');
      setLoading(false);
      return;
    }

    const validInstructions = formData.instructions.filter(inst => inst.trim());
    if (validInstructions.length === 0) {
      setError('Agrega al menos una instrucción');
      setLoading(false);
      return;
    }

    try {
      const recipeData = {
        title: formData.title,
        description: formData.description,
        ingredients: validIngredients.join('\n'),
        instructions: validInstructions.join('\n'),
        image: formData.image
      };

      await recipeService.createRecipe(recipeData);
      
      setSuccess('¡Receta creada exitosamente!');
      
      // Limpiar formulario
      setFormData({
        title: '',
        description: '',
        ingredients: [''],
        instructions: [''],
        image: null
      });

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      setError(err.error || 'Error al crear la receta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
          Crear Nueva Receta
        </h1>
        <p className="text-gray-400 mt-2">
          Comparte tu creación culinaria con la comunidad
        </p>
      </div>

      {/* Form */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mensajes de estado */}
          {error && (
            <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-900/50 border border-emerald-800 text-emerald-200 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Imagen de la receta */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Imagen de la receta
            </label>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-lg bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden">
                  {formData.image ? (
                    <img
                      src={URL.createObjectURL(formData.image)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ChefHat size={32} className="text-gray-600" />
                  )}
                </div>
                <label
                  htmlFor="recipe-image"
                  className="absolute bottom-2 right-2 bg-amber-500 hover:bg-amber-600 text-gray-900 p-2 rounded-full cursor-pointer transition-colors shadow-lg"
                >
                  <Upload size={16} />
                  <input
                    id="recipe-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">
                  Agrega una foto atractiva de tu receta (opcional)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Máximo 5MB. Formatos: JPG, PNG, WebP
                </p>
              </div>
            </div>
          </div>

          {/* Título */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Título de la receta *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={formData.title}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Ej: Pasta Carbonara Cremosa"
              disabled={loading}
            />
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleInputChange}
              className="input-field resize-none"
              placeholder="Describe tu receta, su origen, por qué es especial..."
              disabled={loading}
            />
          </div>

          {/* Ingredientes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-300">
                Ingredientes *
              </label>
              <button
                type="button"
                onClick={addIngredient}
                className="flex items-center space-x-1 text-amber-400 hover:text-amber-300 text-sm transition-colors"
                disabled={loading}
              >
                <Plus size={16} />
                <span>Agregar</span>
              </button>
            </div>
            
            <div className="space-y-2">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={ingredient}
                      onChange={(e) => handleIngredientChange(index, e.target.value)}
                      className="input-field pl-8"
                      placeholder={`Ingrediente ${index + 1}`}
                      disabled={loading}
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400 text-sm">
                      {index + 1}.
                    </span>
                  </div>
                  {formData.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-800"
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instrucciones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-300">
                Instrucciones *
              </label>
              <button
                type="button"
                onClick={addInstruction}
                className="flex items-center space-x-1 text-amber-400 hover:text-amber-300 text-sm transition-colors"
                disabled={loading}
              >
                <Plus size={16} />
                <span>Agregar paso</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-gray-900 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                    {index + 1}
                  </div>
                  <div className="flex-1 flex items-center space-x-2">
                    <textarea
                      value={instruction}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      className="input-field resize-none"
                      rows="2"
                      placeholder={`Describe el paso ${index + 1}...`}
                      disabled={loading}
                    />
                    {formData.instructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-800 self-start mt-1"
                        disabled={loading}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-800">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  <span>Creando receta...</span>
                </>
              ) : (
                <>
                  <ChefHat size={20} />
                  <span>Publicar Receta</span>
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={loading}
              className="btn-secondary disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          {/* Nota */}
          <div className="text-xs text-gray-500 text-center">
            <p>* Campos obligatorios. Tu receta será visible para toda la comunidad.</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRecipe;