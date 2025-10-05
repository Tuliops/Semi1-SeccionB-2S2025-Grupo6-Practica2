import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';
import Login from './pages/Login';
import Register from './pages/Register';
import ExploreRecipes from './pages/ExploreRecipes';
import CreateRecipe from './pages/CreateRecipe';
import MyRecipes from './pages/MyRecipes';
import Favorites from './pages/Favorites';
import RecipeDetail from './pages/RecipeDetail';

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner fullScreen text="Verificando autenticación..." />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Componente para rutas públicas (solo para no autenticados)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner fullScreen text="Verificando autenticación..." />;
  }
  
  return !isAuthenticated ? children : <Navigate to="/" />;
};

function AppContent() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />

        {/* Rutas protegidas */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <ExploreRecipes />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/my-recipes" element={
          <ProtectedRoute>
            <Layout>
              <MyRecipes />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/favorites" element={
          <ProtectedRoute>
            <Layout>
              <Favorites />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/create-recipe" element={
          <ProtectedRoute>
            <Layout>
              <CreateRecipe />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/recipe/:id" element={
          <ProtectedRoute>
            <Layout>
              <RecipeDetail />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;