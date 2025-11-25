import React from 'react';

export const AddEntityModal = ({
  showAddEntityModal,
  setShowAddEntityModal,
  selectedText,
  setSelectedText,
  selectedCollectionName,
  setSelectedCollectionName,
  collections = {},
  handleAddToCollection,
}) => {
  if (!showAddEntityModal) return null;

  const collectionEntries = Object.entries(collections);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => {
        setShowAddEntityModal(false);
        setSelectedText('');
        window.getSelection()?.removeAllRanges();
      }}
    >
      <div 
        className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Add to Collection</h2>
        <p className="text-slate-300 mb-4">
          Selected text: <span className="font-semibold text-white">"{selectedText}"</span>
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Select Collection</label>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {collectionEntries.map(([collectionName, collection]) => {
              const config = collection.config || {};
              const isSelected = selectedCollectionName === collectionName;
              const colorClass = config.color?.bg?.replace('bg-', 'bg-').replace('-200', '-600') || 'bg-gray-600';
              
              return (
                <button
                  key={collectionName}
                  onClick={() => setSelectedCollectionName(collectionName)}
                  className={`py-2 px-4 rounded-lg font-semibold transition-colors text-sm ${
                    isSelected
                      ? `${colorClass} text-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
            onClick={() => {
              setShowAddEntityModal(false);
              setSelectedText('');
              window.getSelection()?.removeAllRanges();
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              try {
                const collection = collections[selectedCollectionName];
                if (!collection) {
                  alert('Please select a collection');
                  return;
                }

                if (!handleAddToCollection) {
                  alert('Collection handler not available');
                  return;
                }
                
                await handleAddToCollection(selectedCollectionName, selectedText);

                const collectionName = collection.config?.name || selectedCollectionName;
                alert(`Added "${selectedText}" to ${collectionName}!`);
              } catch (error) {
                alert(`Failed to add: ${error.message}`);
              }
              setShowAddEntityModal(false);
              setSelectedText('');
              window.getSelection()?.removeAllRanges();
            }}
            disabled={!selectedCollectionName}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

