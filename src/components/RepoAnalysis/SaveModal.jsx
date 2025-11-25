import React from 'react';

export const SaveModal = ({
  showSaveModal,
  setShowSaveModal,
  fileToSync,
  commitMessage,
  setCommitMessage,
  saveError,
  isSaving,
  onSync,
}) => {
  if (!showSaveModal) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => {
        setShowSaveModal(false);
        setCommitMessage('');
      }}
    >
      <div 
        className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">Sync to GitHub</h2>
        {fileToSync && (
          <p className="text-sm text-slate-400 mb-4">File: {fileToSync.path}</p>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Commit Message
          </label>
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Enter commit message..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            rows={3}
          />
        </div>

        {saveError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {saveError}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              setShowSaveModal(false);
              setCommitMessage('');
            }}
            disabled={isSaving}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => fileToSync && onSync(fileToSync)}
            disabled={isSaving || !commitMessage.trim() || !fileToSync}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>
    </div>
  );
};

