import React, { useRef } from 'react';
import { getColorHex, getTextColor } from '../../utils/colorUtils';

export const CollectionCards = ({
  collections,
  searchTerm,
  characterDialogueCounts,
  characterMentionCounts,
  locationMentionCounts,
  searchItemDialogue,
  searchItemMentions,
  editingCollectionName,
  editingCollectionDisplayName,
  setEditingCollectionName,
  setEditingCollectionDisplayName,
  editingInputRef,
  onCollectionClick,
  onColorChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDeleteCollection,
  onCharacterSelect,
  onLocationSelect,
  onItemSelect,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(collections)
        .filter(([collectionName]) => {
          if (!searchTerm) return true;
          const collection = collections[collectionName];
          const config = collection.config || {};
          const name = (config.name || collectionName).toLowerCase();
          return name.includes(searchTerm.toLowerCase());
        })
        .map(([collectionName, collection]) => {
          const config = collection.config || {};
          const isCharacterCollection = collectionName === 'characters';
          const isLocationCollection = collectionName === 'locations';
          const isKeywordCollection = collectionName === 'keywords';
          
          // Get stats for characters
          let dialogueCount = 0;
          let mentionCount = 0;
          if (isCharacterCollection) {
            collection.items.forEach((charName) => {
              dialogueCount += characterDialogueCounts.get(charName) || 0;
              mentionCount += characterMentionCounts.get(charName) || 0;
            });
          }
          
          // Get stats for locations
          let locationMentionCount = 0;
          if (isLocationCollection) {
            collection.items.forEach((locName) => {
              locationMentionCount += locationMentionCounts.get(locName) || 0;
            });
          }
          
          const displayName = config.name || collectionName;
          const isEditing = editingCollectionName === collectionName;
          const currentColorHex = getColorHex(config.color);
          
          return (
            <div
              key={collectionName}
              className="group relative bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 hover:shadow-xl hover:shadow-purple-500/10 transition-colors cursor-pointer overflow-hidden"
              onClick={(e) => onCollectionClick(collectionName, e)}
            >
              {/* Color accent bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: currentColorHex }}
              />
              
              {/* Content */}
              <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={editingCollectionName === collectionName ? editingInputRef : null}
                          type="text"
                          value={editingCollectionDisplayName}
                          onChange={(e) => setEditingCollectionDisplayName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              onSaveRename(collectionName);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              onCancelRename();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSaveRename(collectionName);
                          }}
                          className="text-green-400 hover:text-green-300 transition-colors p-1 rounded hover:bg-green-400/10"
                          title="Save"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelRename();
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-400/10"
                          title="Cancel"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                          {displayName}
                        </h3>
                        <p className="text-slate-400 text-sm mt-0.5">
                          {collection.items.length} {collection.items.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {/* Color Picker */}
                      <div className="relative">
                        <input
                          type="color"
                          value={currentColorHex}
                          onChange={(e) => onColorChange(collectionName, e.target.value)}
                          className="absolute opacity-0 w-0 h-0"
                          id={`color-picker-${collectionName}`}
                        />
                        <label
                          htmlFor={`color-picker-${collectionName}`}
                          className="h-8 w-8 rounded-lg border-2 border-slate-600 cursor-pointer block hover:border-purple-400 transition-colors hover:scale-110"
                          style={{ backgroundColor: currentColorHex }}
                          title="Change color"
                        />
                      </div>
                      {/* Rename Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartRename(collectionName, displayName);
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                        title="Rename collection"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCollection(collectionName);
                        }}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Delete collection"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Stats section */}
                {(dialogueCount > 0 || mentionCount > 0 || locationMentionCount > 0) && (
                  <div className="flex items-center gap-4 pt-3 border-t border-slate-700">
                    {dialogueCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                        <span className="text-xs text-slate-300">
                          {dialogueCount} {dialogueCount === 1 ? 'dialogue' : 'dialogues'}
                        </span>
                      </div>
                    )}
                    {(mentionCount > 0 || locationMentionCount > 0) && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="text-xs text-slate-300">
                          {mentionCount + locationMentionCount} {(mentionCount + locationMentionCount) === 1 ? 'mention' : 'mentions'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
};


