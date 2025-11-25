import React from 'react';
import { PASTEL_COLORS } from '../../utils/editorUtils';

const ICON_SVGS = {
  character: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  location: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  keyword: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  default: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
};

export const EntityLegend = ({
  collectionName,
  collection,
  onAddItem,
  onRemoveItem,
  onDragFromOtherCollection,
  stats = null,
  handleWordClick = null,
  allCollections = {},
  searchItemDialogue = null,
  searchItemMentions = null,
  onItemClick = null,
}) => {
  if (!collection) return null;

  const { items, config } = collection;
  const { name, color, icon = 'default' } = config;
  const supportsColors = config.supportsColors || false;
  const iconSvg = ICON_SVGS[icon] || ICON_SVGS.default;
  
  // Get collection color - support both hex and Tailwind classes
  const collectionColor = color || { bg: 'bg-gray-200', text: 'text-gray-800' };
  const bgColor = collectionColor.hex || collectionColor.bg || 'bg-gray-200';
  const textColor = collectionColor.text || 'text-gray-800';
  const isHexColor = typeof bgColor === 'string' && bgColor.startsWith('#');
  
  // Helper to get color styles for hex colors
  const getColorStyle = () => {
    if (isHexColor) {
      return {
        backgroundColor: bgColor,
        color: textColor,
        borderColor: bgColor,
      };
    }
    return {};
  };
  
  // Helper to get color classes for Tailwind
  const getColorClasses = () => {
    if (isHexColor) {
      return '';
    }
    return `${bgColor} ${textColor}`;
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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove(`border-${color.border.split('-')[1]}-500`, color.bgDark.replace('/20', '/30'));
    
    const draggedText = e.dataTransfer.getData('text/plain');
    const sourceCollectionName = e.dataTransfer.getData('collection-name');
    const draggedItemJson = e.dataTransfer.getData('application/json');
    
    if (draggedText && onAddItem) {
      const trimmedText = draggedText.trim();
      const normalizedText = trimmedText.toLowerCase();
      
      // Check if item already exists
      const exists = items.some(item => {
        const display = getItemDisplay(item);
        return display.text.toLowerCase() === normalizedText;
      });
      
      if (!exists) {
        // Prepare item to add
        let itemToAdd;
        if (supportsColors) {
          const usedColors = items
            .filter(i => typeof i === 'object' && i.color)
            .map(i => i.color.class);
          const availableColor = PASTEL_COLORS.find(c => !usedColors.includes(c.class)) || 
            PASTEL_COLORS[items.length % PASTEL_COLORS.length];
          itemToAdd = { word: trimmedText.toLowerCase(), color: availableColor };
        } else {
          itemToAdd = trimmedText;
        }
        
        // Run add and remove operations in parallel for better performance
        const addPromise = onAddItem(itemToAdd);
        
        // Remove from source collection if dragging from another collection
        if (sourceCollectionName && 
            sourceCollectionName !== collectionName && 
            onDragFromOtherCollection) {
          // Use the actual item object if available, otherwise use the text
          let sourceItem = draggedText;
          if (draggedItemJson) {
            try {
              sourceItem = JSON.parse(draggedItemJson);
            } catch (e) {
              // If parsing fails, use the text
              sourceItem = draggedText;
            }
          }
          // Run remove in parallel with add - don't await, let both happen simultaneously
          onDragFromOtherCollection(sourceCollectionName, sourceItem).catch(err => {
            console.error('Error removing item from source collection:', err);
          });
        }
        
        // Wait for add to complete (but remove is already running)
        await addPromise;
      }
    }
  };

  const getItemCount = (item) => {
    if (!stats || !stats.highlightedCounts) return null;
    const display = getItemDisplay(item);
    const stat = stats.highlightedCounts.find(s => s.word.toLowerCase() === display.text.toLowerCase());
    return stat?.count || null;
  };

  if (items.length === 0) {
    return (
      <div className={`p-4 border-b border-slate-700 bg-slate-800 shrink-0`}>
        <h3 className={`text-xs font-semibold ${color.text.replace('text-', 'text-').replace('-800', '-300')} mb-2 uppercase tracking-wide flex items-center gap-2`}>
          {iconSvg}
          {name} ({items.length})
        </h3>
        <div 
          className={`flex flex-wrap items-center gap-2 min-h-[60px] p-2 rounded-md border-2 border-dashed ${isHexColor ? '' : color.bgDark || 'bg-slate-900/20'} ${isHexColor ? '' : color.borderDark || 'border-slate-700/50'}`}
          style={isHexColor ? { 
            backgroundColor: `${bgColor}20`, 
            borderColor: bgColor,
            color: textColor 
          } : {}}
          onDragOver={(e) => {
            e.preventDefault();
            if (isHexColor) {
              e.currentTarget.style.backgroundColor = `${bgColor}40`;
            } else {
              const borderColor = color.border?.split('-')[1] || 'slate';
              e.currentTarget.classList.add(`border-${borderColor}-500`, color.bgDark?.replace('/20', '/30') || 'bg-slate-900/30');
            }
          }}
          onDragLeave={(e) => {
            if (isHexColor) {
              e.currentTarget.style.backgroundColor = `${bgColor}20`;
            } else {
              const borderColor = color.border?.split('-')[1] || 'slate';
              e.currentTarget.classList.remove(`border-${borderColor}-500`, color.bgDark?.replace('/20', '/30') || 'bg-slate-900/30');
            }
          }}
          onDrop={handleDrop}
        >
          <p className="text-xs text-slate-400 italic">
            {supportsColors 
              ? 'Click words in the editor to highlight them, or drag items from other collections here'
              : 'Drag items from other collections here to add them'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border-b border-slate-700 bg-slate-800 shrink-0`}>
      <h3 className={`text-xs font-semibold ${color.text.replace('text-', 'text-').replace('-800', '-300')} mb-2 uppercase tracking-wide flex items-center gap-2`}>
        {iconSvg}
        {name} ({items.length})
      </h3>
      <div 
        className={`flex flex-wrap items-center gap-2 min-h-[60px] p-2 rounded-md border-2 border-dashed ${isHexColor ? '' : color.bgDark || 'bg-slate-900/20'} ${isHexColor ? '' : color.borderDark || 'border-slate-700/50'}`}
        style={isHexColor ? { 
          backgroundColor: `${bgColor}20`, 
          borderColor: bgColor,
          color: textColor 
        } : {}}
        onDragOver={(e) => {
          e.preventDefault();
          if (isHexColor) {
            e.currentTarget.style.backgroundColor = `${bgColor}40`;
          } else {
            const borderColor = color.border?.split('-')[1] || 'slate';
            e.currentTarget.classList.add(`border-${borderColor}-500`, color.bgDark?.replace('/20', '/30') || 'bg-slate-900/30');
          }
        }}
        onDragLeave={(e) => {
          if (isHexColor) {
            e.currentTarget.style.backgroundColor = `${bgColor}20`;
          } else {
            const borderColor = color.border?.split('-')[1] || 'slate';
            e.currentTarget.classList.remove(`border-${borderColor}-500`, color.bgDark?.replace('/20', '/30') || 'bg-slate-900/30');
          }
        }}
        onDrop={handleDrop}
      >
        {items.map((item, idx) => {
          const display = getItemDisplay(item);
          const count = getItemCount(item);
          
          // Calculate dialogue and mentions if search functions are provided
          let dialogueCount = 0;
          let mentionCount = 0;
          if (searchItemDialogue && searchItemMentions) {
            const dialogue = searchItemDialogue(display.text);
            const mentions = searchItemMentions(display.text);
            dialogueCount = dialogue.length;
            mentionCount = mentions.length;
          }
          
          const handleClick = (e) => {
            // Don't trigger if clicking remove button
            if (e.target.closest('button')) {
              return;
            }
            
            if (onItemClick) {
              e.preventDefault();
              e.stopPropagation();
              console.log('Calling onItemClick with:', display.text);
              onItemClick(display.text);
            } else if (handleWordClick && supportsColors) {
              handleWordClick(display.text);
            }
          };
          
          return (
            <div 
              key={idx}
              draggable={true}
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('text/plain', display.text);
                e.dataTransfer.setData('collection-name', collectionName);
                // Store the actual item as JSON for accurate removal
                e.dataTransfer.setData('application/json', JSON.stringify(item));
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.stopPropagation();
              }}
              onClick={handleClick}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${onItemClick ? 'cursor-pointer' : 'cursor-move'} hover:opacity-80 transition-all group ${supportsColors || onItemClick ? 'hover:opacity-90' : ''} ${isHexColor ? '' : (display.color?.class || getColorClasses())} ${isHexColor ? '' : (display.color?.text || textColor)} ${isHexColor ? '' : (display.color?.border || color.border || 'border-slate-600')}`}
              style={isHexColor ? {
                backgroundColor: display.color?.hex || bgColor,
                color: display.color?.text || textColor,
                borderColor: display.color?.hex || bgColor,
              } : {}}
            >
              <span className="text-xs font-medium flex-shrink-0">{display.text}</span>
              {count !== null && count > 0 && (
                <span 
                  className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isHexColor ? '' : 'text-purple-300 bg-purple-900/50'}`}
                  style={isHexColor ? {
                    backgroundColor: `${bgColor}80`,
                    color: textColor,
                  } : {}}
                >
                  {count}
                </span>
              )}
              {(dialogueCount > 0 || mentionCount > 0) && (
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                  {dialogueCount > 0 && (
                    <div 
                      className="w-3 h-3 rounded-full bg-purple-400 border border-purple-300 shadow-sm"
                      title={`${dialogueCount} dialogue`}
                    ></div>
                  )}
                  {mentionCount > 0 && (
                    <div 
                      className="w-3 h-3 rounded-full bg-blue-400 border border-blue-300 shadow-sm"
                      title={`${mentionCount} mentions`}
                    ></div>
                  )}
                </div>
              )}
              {onRemoveItem && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(display.text);
                  }}
                  className="ml-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                  title={`Remove ${name.toLowerCase()}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

