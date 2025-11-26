import React from 'react';

export const CollectionManagerModal = ({
  show,
  onClose,
  collections,
  newCollectionName,
  setNewCollectionName,
  onCreateCollection,
  onDeleteCollection,
}) => {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Manage Collections</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Create New Collection</label>
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="e.g., items, houses, phrases"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newCollectionName.trim()) {
                onCreateCollection();
              }
            }}
          />
          <button
            onClick={onCreateCollection}
            disabled={!newCollectionName.trim()}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Collection
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Existing Collections</label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(collections).map(([collectionName, collection]) => {
              return (
                <div key={collectionName} className="bg-slate-700 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{collection.config?.name || collectionName}</div>
                      <div className="text-xs text-slate-400">{collection.items.length} items</div>
                    </div>
                    <button
                      onClick={() => onDeleteCollection(collectionName)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete collection"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

