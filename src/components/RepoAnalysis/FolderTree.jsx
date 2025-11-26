import React, { useState } from 'react';

export const FolderTree = ({ tree, selectedPath, onPathSelect, rootPath = '' }) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const renderFolder = (folderName, folder, currentPath) => {
    const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    const isExpanded = expandedFolders.has(folderPath);
    const isSelected = selectedPath === folderPath;
    const hasSubfolders = Object.keys(folder.folders).length > 0;
    // Only count files directly in this folder, not in subfolders
    const fileCount = folder.files.length;

    return (
      <div key={folderPath} className="select-none">
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-700 cursor-pointer transition-colors ${
            isSelected ? 'bg-slate-700 border-l-2 border-purple-500' : ''
          }`}
          onClick={() => {
            onPathSelect(folderPath);
            if (hasSubfolders) {
              toggleFolder(folderPath);
            }
          }}
        >
          {hasSubfolders ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folderPath);
              }}
              className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <span className={`text-sm flex-1 ${isSelected ? 'text-purple-400 font-medium' : 'text-slate-300'}`}>
            {folderName}
          </span>
          <span className="text-xs text-slate-500">
            {fileCount}
          </span>
        </div>
        {hasSubfolders && isExpanded && (
          <div className="ml-4 mt-1">
            {Object.entries(folder.folders)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([subFolderName, subFolder]) =>
                renderFolder(subFolderName, subFolder, folderPath)
              )}
          </div>
        )}
      </div>
    );
  };

  const rootFiles = tree.files || [];
  const rootFolders = Object.entries(tree.folders || {}).sort(([a], [b]) => a.localeCompare(b));
  // Only count files directly in root, not in subfolders
  const rootFileCount = rootFiles.length;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300">Folders</h3>
        {selectedPath && (
          <button
            onClick={() => onPathSelect('')}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto">
        {rootFolders.length === 0 && rootFiles.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">No folders found</p>
        ) : (
          <>
            {/* Show "All Files" option if there are root files or if nothing is selected */}
            {(rootFiles.length > 0 || !selectedPath) && (
              <div
                className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-700 cursor-pointer transition-colors ${
                  selectedPath === '' ? 'bg-slate-700 border-l-2 border-purple-500' : ''
                }`}
                onClick={() => onPathSelect('')}
              >
                <div className="w-4 h-4" />
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className={`text-sm flex-1 ${selectedPath === '' ? 'text-purple-400 font-medium' : 'text-slate-300'}`}>
                  All Files
                </span>
                <span className="text-xs text-slate-500">
                  {rootFileCount}
                </span>
              </div>
            )}
            {rootFolders.map(([folderName, folder]) =>
              renderFolder(folderName, folder, rootPath)
            )}
          </>
        )}
      </div>
    </div>
  );
};

