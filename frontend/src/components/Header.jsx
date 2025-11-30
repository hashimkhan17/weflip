import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemContext.jsx';
import { Link } from 'react-router-dom';
import logo from "../assets/logowebflib.jpg";

const Navbar = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <nav className="bg-black dark:bg-gray-900 w-full transition-colors duration-300">
      <div className="w-full px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo (Clickable) */}
          <div className="flex items-center">
            <Link to="/">
              <img 
                src={logo} 
                alt="Logo"
                className="h-12 w-auto object-cover cursor-pointer"
              />
            </Link>
          </div>

          {/* Simple Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors duration-300"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun className="w-6 h-6" />
            ) : (
              <Moon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
