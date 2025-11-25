import React from 'react';

export const SaveModal = ({
  showSaveModal,
  setShowSaveModal,
  commitMessage,
  setCommitMessage,
  saveError,
  isSaving,
  isFetching,
  isShaMismatchError,
  githubToken,
  setShowTokenInput,
  handleSave,
  handleFetchLatestAndRetry,
}) => {
  if (!showSaveModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Save to GitHub</h2>
        
        {!githubToken && (
          <div className="mb-4 bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded">
            <p className="mb-2">GitHub access token required.</p>
            <button
              onClick={() => {
                setShowSaveModal(false);
                setShowTokenInput(true);
              }}
              className="text-yellow-300 hover:text-yellow-100 underline"
            >
              Add GitHub Token
            </button>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Commit Message
          </label>
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Enter commit message..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
          />
        </div>

        {saveError && (
          <div className="mb-4 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
            {saveError}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              setShowSaveModal(false);
              setCommitMessage('');
              setSaveError('');
            }}
            disabled={isSaving || isFetching}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {isShaMismatchError && (
            <button
              onClick={() => handleFetchLatestAndRetry(commitMessage, () => {
                setShowSaveModal(false);
                setCommitMessage('');
              })}
              disabled={isSaving || isFetching || !githubToken}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isFetching ? 'Fetching...' : 'Fetch Latest & Retry'}
            </button>
          )}
          {!githubToken && (
            <button
              onClick={() => {
                setShowSaveModal(false);
                setShowTokenInput(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Add Token
            </button>
          )}
          <button
            onClick={() => handleSave(commitMessage, () => {
              setShowSaveModal(false);
              setCommitMessage('');
            })}
            disabled={isSaving || isFetching || !commitMessage.trim() || !githubToken}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

