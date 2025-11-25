import React from 'react';

export const FilesTab = ({
  files,
  selectedBlog,
  editedFiles,
  fileStatuses,
  onFileSelect,
  characters,
  locations,
  keywords,
  onAddCharacter,
  onAddLocation,
  onRemoveCharacter,
  onRemoveLocation,
  onAddKeyword,
  onRemoveKeyword,
  fileToSync,
  setFileToSync,
  setShowSaveModal,
  handleFetchLatest,
  isFetching,
}) => {
  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No files found.</p>
      </div>
    );
  }

  const statusColors = {
    synced: 'bg-green-500',
    edited: 'bg-yellow-500',
    new: 'bg-blue-500',
    removed: 'bg-red-500',
  };

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const isCurrentlyOpen = selectedBlog && selectedBlog.path === file.path;
        const isEdited = editedFiles && editedFiles.has(file.path);
        const status = isEdited ? 'edited' : (fileStatuses.get(file.path) || 'synced');

        return (
          <div
            key={file.sha}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500 hover:bg-slate-750 transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => {
                  onFileSelect(file, characters, locations, keywords, onAddCharacter, onAddLocation, onRemoveCharacter, onRemoveLocation, onAddKeyword, onRemoveKeyword);
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${statusColors[status] || statusColors.synced}`} title={status}></div>
                  <h3 className="text-lg font-semibold text-white">{file.path}</h3>
                </div>
                <p className="text-xs text-slate-400">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              {isEdited && (
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setFileToSync(file);
                      setShowSaveModal(true);
                    }}
                    className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors text-sm"
                    title="Sync to GitHub (commit changes)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync
                  </button>
                </div>
              )}
              {isCurrentlyOpen && !isEdited && (
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={handleFetchLatest}
                    disabled={isFetching}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title="Fetch latest from GitHub"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isFetching ? 'Fetching...' : 'Fetch'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

