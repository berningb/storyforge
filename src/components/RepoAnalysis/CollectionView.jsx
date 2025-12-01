import React from 'react';

export const CollectionView = ({
  collectionName,
  collection,
  searchItemDialogue,
  searchItemMentions,
  isCharacterCollection,
  isLocationCollection,
  onBack,
  onItemClick,
  onRemoveItem,
  onCharacterSelect,
  onLocationSelect,
  onItemSelect,
}) => {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-slate-400 hover:text-white flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Collections
      </button>
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">
          {collection?.config?.name || collectionName}
        </h3>
        <div className="space-y-2">
          {collection?.items.length > 0 ? (
            collection.items.map((item, idx) => {
              const displayText = typeof item === 'string' ? item : (item.word || String(item));
              
              // Get stats for this item
              const dialogue = searchItemDialogue(displayText);
              const mentions = searchItemMentions(displayText);
              const dialogueCount = dialogue.length;
              const mentionCount = mentions.length;
              
              const handleItemClick = () => {
                if (isCharacterCollection) {
                  onCharacterSelect(displayText);
                } else if (isLocationCollection) {
                  onLocationSelect(displayText);
                } else {
                  onItemSelect(displayText, collectionName);
                }
              };
              
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-700 p-3 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors"
                  onClick={handleItemClick}
                >
                  <div className="flex-1">
                    <span className="text-white font-medium">{displayText}</span>
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
                      await onRemoveItem(collectionName, displayText);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors ml-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-slate-400">No items in this collection</p>
          )}
        </div>
      </div>
    </div>
  );
};


