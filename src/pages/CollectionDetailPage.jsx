import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { useAuth } from '../contexts/AuthContext';
import { useRepo } from '../contexts/RepoContext';

// Helper function to convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Helper function to calculate luminance and determine if text should be dark or light
const getTextColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  
  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

// Helper to convert Tailwind class to hex (for backward compatibility)
const tailwindToHex = (tailwindClass) => {
  const colorMap = {
    'bg-purple-200': '#e9d5ff',
    'bg-green-200': '#bbf7d0',
    'bg-orange-200': '#fed7aa',
    'bg-blue-200': '#bfdbfe',
    'bg-pink-200': '#fce7f3',
    'bg-yellow-200': '#fef08a',
    'bg-cyan-200': '#a5f3fc',
    'bg-indigo-200': '#c7d2fe',
    'bg-gray-200': '#e5e7eb',
  };
  return colorMap[tailwindClass] || '#e5e7eb';
};

// Helper to get hex from color config (supports both hex and Tailwind)
const getColorHex = (colorConfig) => {
  if (!colorConfig) return '#e5e7eb';
  if (colorConfig.hex) return colorConfig.hex;
  if (colorConfig.bg && colorConfig.bg.startsWith('#')) return colorConfig.bg;
  if (colorConfig.bg) return tailwindToHex(colorConfig.bg);
  return '#e5e7eb';
};

export const CollectionDetailPage = ({ collectionName, onBack, searchItemDialogue = null, searchItemMentions = null, onItemClick = null, repoOwner = null, activeTab = 'collections', onNavigateToRepo = null, onNavigateToTab = null }) => {
  const { currentUser } = useAuth();
  const { 
    collections, 
    addToCollection, 
    removeFromCollection,
    updateCollectionConfig,
    deleteCollection,
  } = useRepo();

  const collection = collections[collectionName];
  if (!collection) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <p className="text-slate-400">Collection not found</p>
          <button onClick={onBack} className="mt-4 text-blue-400 hover:text-blue-300">
            Back
          </button>
        </div>
      </div>
    );
  }

  const config = collection.config || {};
  const currentColorHex = getColorHex(config.color);
  const [editingName, setEditingName] = useState(false);
  const [collectionDisplayName, setCollectionDisplayName] = useState(config.name || collectionName);
  const isSavingRef = useRef(false);
  const inputRef = useRef(null);
  const editButtonRef = useRef(null);
  
  const [newItemName, setNewItemName] = useState('');
  const [colorHex, setColorHex] = useState(currentColorHex);

  const textColor = useMemo(() => getTextColor(colorHex), [colorHex]);

  // Sync display name when config changes externally, but only if not editing
  useEffect(() => {
    if (!editingName && config.name) {
      setCollectionDisplayName(config.name);
    }
  }, [config.name]);

  const handleStartEdit = () => {
    setCollectionDisplayName(config.name || collectionName);
    setEditingName(true);
    // Use setTimeout to ensure input is rendered before focusing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleCancelEdit = () => {
    setCollectionDisplayName(config.name || collectionName);
    setEditingName(false);
  };

  const handleSaveName = async () => {
    if (isSavingRef.current) return; // Prevent double saves
    isSavingRef.current = true;
    
    const trimmedName = collectionDisplayName.trim();
    if (trimmedName) {
      await updateCollectionConfig(collectionName, { name: trimmedName });
      setEditingName(false);
    } else {
      // Reset to original if empty
      handleCancelEdit();
    }
    
    // Reset flag after a short delay
    setTimeout(() => {
      isSavingRef.current = false;
    }, 100);
  };

  const handleColorChange = async (hex) => {
    setColorHex(hex);
    const textColorHex = getTextColor(hex);
    // Store as hex for flexibility, but also provide Tailwind classes for backward compatibility
    await updateCollectionConfig(collectionName, { 
      color: { 
        hex: hex,
        bg: hex, // Store hex as bg for inline styles
        text: textColorHex, // Store text color as hex
      } 
    });
  };

  const handleAddItem = async () => {
    if (newItemName.trim()) {
      await addToCollection(collectionName, newItemName.trim());
      setNewItemName('');
    }
  };

  const handleDeleteCollection = async () => {
    if (confirm(`Are you sure you want to delete the "${collectionDisplayName}" collection?`)) {
      await deleteCollection(collectionName);
      onBack();
    }
  };

  const getItemDisplay = (item) => {
    if (typeof item === 'string') {
      return { text: item, color: null };
    }
    if (typeof item === 'object' && item.word) {
      return { text: item.word, color: item.color };
    }
    return { text: String(item), color: null };
  };

  const handleItemClick = (itemName) => {
    console.log('CollectionDetailPage: Item clicked:', itemName);
    // Always navigate to separate ItemDetailPage
    if (onItemClick) {
      // If search functions are available, prepare the data first
      if (searchItemDialogue && searchItemMentions) {
        const dialogue = searchItemDialogue(itemName);
        const mentions = searchItemMentions(itemName);
        onItemClick({
          name: itemName,
          dialogue: dialogue,
          mentions: mentions,
          dialogueCount: dialogue.length,
          mentionCount: mentions.length,
          collectionName: collectionName,
        });
      } else {
        // Otherwise just pass the name
        onItemClick(itemName);
      }
    } else {
      console.log('CollectionDetailPage: No click handler available');
    }
  };

  // Build breadcrumbs for nav
  const navBreadcrumbs = useMemo(() => {
    const crumbs = [];
    if (repoOwner && (onNavigateToRepo || onBack)) {
      crumbs.push({
        label: repoOwner,
        onClick: onNavigateToRepo || onBack,
        isCurrent: false,
      });
    }
    if (activeTab && (onNavigateToTab || onBack)) {
      crumbs.push({
        label: activeTab,
        onClick: onNavigateToTab || onBack,
        isCurrent: false,
      });
    }
    crumbs.push({
      label: collectionDisplayName,
      onClick: undefined,
      isCurrent: true,
    });
    return crumbs;
  }, [repoOwner, onNavigateToRepo, onNavigateToTab, onBack, activeTab, collectionDisplayName]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="max-w-7xl mx-auto relative flex items-center">
          {/* Left - Breadcrumbs */}
          {navBreadcrumbs.length > 0 && (
            <div className="flex items-center gap-1">
              {navBreadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <span className={`text-slate-500 ${crumb.isCurrent ? 'text-base' : 'text-sm'}`}>/</span>
                  )}
                  {crumb.onClick ? (
                    <button
                      onClick={crumb.onClick}
                      className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                    >
                      {index === 0 && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      )}
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-white text-sm font-semibold">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          
          {/* Center - StoryForge */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-xl font-bold text-white">StoryForge</h1>
          </div>
          
          {/* Right - Avatar */}
          <div className="ml-auto flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">

            {/* Add New Item */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
              <h2 className="text-lg font-semibold mb-4">Add Item</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddItem();
                    }
                  }}
                  placeholder="Enter item name..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleAddItem}
                  disabled={!newItemName.trim()}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

        {/* Items List */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Items ({collection.items.length})</h2>
            </div>
            
            {collection.items.length > 0 ? (
              <div className="space-y-2">
                {collection.items.map((item, idx) => {
                  const display = getItemDisplay(item);
                  
                  // Calculate dialogue and mentions if search functions are provided
                  let dialogueCount = 0;
                  let mentionCount = 0;
                  if (searchItemDialogue && searchItemMentions) {
                    const dialogue = searchItemDialogue(display.text);
                    const mentions = searchItemMentions(display.text);
                    dialogueCount = dialogue.length;
                    mentionCount = mentions.length;
                  }
                  
                  const isClickable = (searchItemDialogue && searchItemMentions) || onItemClick;
                  
                  return (
                    <div
                      key={idx}
                      onClick={(e) => {
                        if (isClickable && !e.target.closest('button')) {
                          console.log('CollectionDetailPage: Clicking item:', display.text);
                          handleItemClick(display.text);
                        }
                      }}
                      className={`flex items-center justify-between bg-slate-700 p-3 rounded-lg ${isClickable ? 'cursor-pointer hover:bg-slate-600 transition-colors' : ''}`}
                    >
                      <div className="flex-1">
                        <span className="text-white font-medium">{display.text}</span>
                        {(dialogueCount > 0 || mentionCount > 0) && (
                          <div className="flex gap-4 mt-1">
                            {dialogueCount > 0 && (
                              <span className="text-xs text-purple-400">
                                {dialogueCount} dialogue
                              </span>
                            )}
                            {mentionCount > 0 && (
                              <span className="text-xs text-blue-400">
                                {mentionCount} mentions
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await removeFromCollection(collectionName, display.text);
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors ml-2"
                        title="Remove item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">No items in this collection. Add items above to get started.</p>
              </div>
            )}
          </div>
      </main>
    </div>
  );
};

