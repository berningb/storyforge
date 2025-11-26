import { useMemo } from 'react';

export const useHighlighting = ({ collections, highlightedCollections, hoveredText }) => {
  const highlightWords = useMemo(() => {
    const words = [];
    Object.entries(collections).forEach(([collectionName, collection]) => {
      if (highlightedCollections.has(collectionName)) {
        collection.items.forEach(item => {
          if (typeof item === 'string') {
            words.push(item);
          } else if (typeof item === 'object' && item.word) {
            words.push(item.word);
          }
        });
      }
    });
    // Add hovered text as a full phrase if it exists
    if (hoveredText) {
      const textToHighlight = hoveredText.trim();
      if (textToHighlight && !words.includes(textToHighlight)) {
        words.push(textToHighlight);
      }
    }
    return words;
  }, [collections, highlightedCollections, hoveredText]);
  
  const highlightWordColors = useMemo(() => {
    const colors = [];
    Object.entries(collections).forEach(([collectionName, collection]) => {
      if (highlightedCollections.has(collectionName)) {
        const config = collection.config || {};
        // Use the collection's color for all items in this collection
        const collectionColor = config.color || { bg: 'bg-gray-200', text: 'text-gray-800' };
        const bgColor = collectionColor.hex || collectionColor.bg || 'bg-gray-200';
        const textColor = collectionColor.text || 'text-gray-800';
        
        // Check if it's a hex color
        const isHexColor = typeof bgColor === 'string' && bgColor.startsWith('#');
        
        collection.items.forEach(item => {
          const word = typeof item === 'string' ? item : (item.word || String(item));
          if (!word) return;
          
          // Check if we already have this word
          const existingIndex = colors.findIndex(c => c.word.toLowerCase() === word.toLowerCase());
          
          if (existingIndex === -1) {
            // New word - add it with collection color
            if (isHexColor) {
              // For hex colors, use inline styles
              colors.push({ 
                word: word, 
                color: { 
                  hex: bgColor,
                  text: textColor,
                  class: '', // Empty class for hex colors
                  style: { backgroundColor: bgColor, color: textColor }
                } 
              });
            } else {
              // For Tailwind classes
              colors.push({ 
                word: word, 
                color: { 
                  class: bgColor, 
                  text: textColor,
                  hex: null
                } 
              });
            }
          }
        });
      }
    });
    
    // Add hovered text as a full phrase with special highlight color (yellow/orange glow)
    if (hoveredText) {
      const textToHighlight = hoveredText.trim();
      if (textToHighlight) {
        // Check if we already have this exact text
        const existingIndex = colors.findIndex(c => c.word.toLowerCase() === textToHighlight.toLowerCase());
        if (existingIndex === -1) {
          // Use a bright yellow highlight for hovered text phrase
          colors.push({
            word: textToHighlight,
            color: {
              hex: '#fbbf24', // amber-400
              text: '#000000',
              class: '',
            }
          });
        } else {
          // If it exists, enhance it with a brighter highlight
          colors[existingIndex] = {
            ...colors[existingIndex],
            color: {
              ...colors[existingIndex].color,
              hex: '#fbbf24', // Override with hover color
              text: '#000000',
              hoverHighlight: true, // Flag for special styling
            }
          };
        }
      }
    }
    
    return colors;
  }, [collections, highlightedCollections, hoveredText]);

  return { highlightWords, highlightWordColors };
};

