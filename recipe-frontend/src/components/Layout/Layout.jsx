import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  Plus, 
  Heart, 
  BookOpen, 
  LogOut,
  User,
  Search
} from 'lucide-react';

// ✅ FUNCIÓN PARA MANEJAR URLs DE IMAGEN CORRECTAMENTE
const getImageUrl = (url) => {
  if (!url) return null;
  
  // Si ya es una URL completa (Azure), úsala directamente
  if (url.startsWith('http')) {
    return url;
  }
  
  // Si es una ruta relativa, conviértela a absoluta
  if (url.startsWith('/')) {
    return `http://localhost:3000${url}`;
  }
  
  return url;
};

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: Home, label: 'Explorar' },
    { path: '/my-recipes', icon: BookOpen, label: 'Mis Recetas' },
    { path: '/favorites', icon: Heart, label: 'Favoritos' },
    { path: '/create-recipe', icon: Plus, label: 'Crear' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-gray-900 font-bold text-sm">🍳</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                RecipeShare
              </span>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'text-amber-400 bg-gray-800 shadow-lg'
                        : 'text-gray-400 hover:text-amber-400 hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {user?.profile_image ? (
                  <img
                    src={getImageUrl(user.profile_image)}
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover border border-amber-500/50"
                    onError={(e) => {
                      console.error('❌ Error loading profile image:', user.profile_image);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
                    <User size={16} className="text-amber-400" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-300 hidden sm:block">
                  {user?.username}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-400 hover:text-amber-400 transition-colors p-2 rounded-lg hover:bg-gray-800/50"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline text-sm">Salir</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden border-t border-gray-800">
            <div className="flex justify-around py-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex flex-col items-center space-y-1 px-3 py-2 text-xs transition-all ${
                      isActive
                        ? 'text-amber-400'
                        : 'text-gray-400 hover:text-amber-400'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;