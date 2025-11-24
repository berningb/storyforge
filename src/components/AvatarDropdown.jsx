import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const AvatarDropdown = () => {
  const { currentUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!currentUser) return null;

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full"
      >
        {currentUser.photoURL ? (
          <img 
            src={currentUser.photoURL} 
            alt={currentUser.displayName || 'User'} 
            className="w-8 h-8 rounded-full border-2 border-slate-600 hover:border-purple-500 transition-colors cursor-pointer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold border-2 border-slate-600 hover:border-purple-500 transition-colors cursor-pointer">
            {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-slate-700">
            <p className="text-sm font-semibold text-white truncate">
              {currentUser.displayName || 'User'}
            </p>
            <p className="text-xs text-slate-400 truncate mt-1">
              {currentUser.email}
            </p>
          </div>
          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

