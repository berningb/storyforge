import React from 'react';
import { PASTEL_COLORS } from '../../utils/editorUtils';

export const WordCollectionModal = ({
  show,
  onClose,
  clickedWord,
  wordTargetCollection,
  setWordTargetCollection,
  collections,
  onAddToCollection,
  onRemoveFromCollection,
}) => {
  if (!show) return null;

  const normalizedWord = clickedWord.toLowerCase().trim();
  
  // Check if word exists in any collection
  let foundInCollection = null;
  for (const [collectionName, collection] of Object.entries(collections)) {
    const exists = collection.items.some(item => {
      if (typeof item === 'string') {
        return item.toLowerCase() === normalizedWord;
      }
      if (typeof item === 'object' && item.word) {
        return item.word.toLowerCase() === normalizedWord;
      }
      return false;
    });
    
    if (exists) {
      foundInCollection = collectionName;
      break;
    }
  }

  const handleAdd = async () => {
    if (!wordTargetCollection) {
      alert('Please select a collection');
      return;
    }
    
    const targetCollection = collections[wordTargetCollection];
    
    if (!targetCollection) {
      alert(`Collection "${wordTargetCollection}" does not exist. Please select a different collection.`);
      return;
    }
    
    // Check if word exists in another collection and remove it
    for (const [collectionName, collection] of Object.entries(collections)) {
      if (collectionName !== wordTargetCollection) {
        const exists = collection.items.some(item => {
          if (typeof item === 'string') {
            return item.toLowerCase() === normalizedWord;
          }
          if (typeof item === 'object' && item.word) {
            return item.word.toLowerCase() === normalizedWord;
          }
          return false;
        });
        
        if (exists) {
          await onRemoveFromCollection(collectionName, clickedWord);
        }
      }
    }
    
    // Check if word already exists in target collection
    const existsInTarget = targetCollection.items.some(item => {
      if (typeof item === 'string') {
        return item.toLowerCase() === normalizedWord;
      }
      if (typeof item === 'object' && item.word) {
        return item.word.toLowerCase() === normalizedWord;
      }
      return false;
    });
    
    if (!existsInTarget) {
      // Add to target collection
      const config = targetCollection.config || {};
      if (config.supportsColors) {
        const usedColors = targetCollection.items
          .filter(i => typeof i === 'object' && i.color)
          .map(i => i.color.class);
        const availableColor = PASTEL_COLORS.find(c => !usedColors.includes(c.class)) || 
          PASTEL_COLORS[targetCollection.items.length % PASTEL_COLORS.length];
        await onAddToCollection(wordTargetCollection, { word: normalizedWord, color: availableColor });
      } else {
        await onAddToCollection(wordTargetCollection, clickedWord);
      }
    }
    
    onClose();
  };

  const handleRemove = async () => {
    await onRemoveFromCollection(foundInCollection, clickedWord);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Manage Word: "{clickedWord}"</h2>
        
        {foundInCollection ? (
          <div className="mb-4">
            <p className="text-slate-300 mb-2">
              This word is currently in: <span className="font-semibold text-white">
                {collections[foundInCollection]?.config?.name || foundInCollection}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRemove}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Remove
              </button>
              <button
                onClick={() => {
                  setWordTargetCollection(foundInCollection);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Move to Another Collection
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-300 mb-4">Add this word to a collection:</p>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Select Collection</label>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {Object.entries(collections).map(([collectionName, collection]) => {
              const config = collection.config || {};
              const isSelected = wordTargetCollection === collectionName;
              const colorClass = config.color?.bg?.replace('bg-', 'bg-').replace('-200', '-600') || 'bg-gray-600';
              
              return (
                <button
                  key={collectionName}
                  onClick={() => {
                    setWordTargetCollection(collectionName);
                  }}
                  className={`py-2 px-4 rounded-lg font-semibold transition-all text-sm border-2 ${
                    isSelected
                      ? `${colorClass} text-white border-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'
                  }`}
                >
                  {config.name || collectionName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            {foundInCollection ? 'Move' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};


