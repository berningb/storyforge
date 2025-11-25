import React from 'react';

export const AddEntityModal = ({
  showAddEntityModal,
  setShowAddEntityModal,
  selectedText,
  setSelectedText,
  entityType,
  setEntityType,
  handleAddCharacter,
  handleAddLocation,
}) => {
  if (!showAddEntityModal) return null;

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
        <h2 className="text-xl font-bold mb-4">Add as Character or Location</h2>
        <p className="text-slate-300 mb-4">
          Selected text: <span className="font-semibold text-white">"{selectedText}"</span>
        </p>
        
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setEntityType('character')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              entityType === 'character'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Character
          </button>
          <button
            onClick={() => setEntityType('location')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              entityType === 'location'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Location
          </button>
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
                if (entityType === 'character') {
                  await handleAddCharacter(selectedText);
                  alert(`Added "${selectedText}" as a character!`);
                } else if (entityType === 'location') {
                  await handleAddLocation(selectedText);
                  alert(`Added "${selectedText}" as a location!`);
                }
              } catch (error) {
                alert(`Failed to add ${entityType}: ${error.message}`);
              }
              setShowAddEntityModal(false);
              setSelectedText('');
              window.getSelection()?.removeAllRanges();
            }}
            className={`${
              entityType === 'character' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-semibold py-2 px-6 rounded-lg transition-colors`}
          >
            Add {entityType === 'character' ? 'Character' : 'Location'}
          </button>
        </div>
      </div>
    </div>
  );
};

