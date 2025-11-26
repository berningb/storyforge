import React from 'react';

export const EditorToolbar = ({ hasChanges, onUndo, onSaveLocal }) => {
  return (
    <div className="px-6 py-3 shrink-0 flex items-center justify-between border-b border-slate-700">
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!hasChanges}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo changes"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Undo
        </button>
        {hasChanges && (
          <span className="text-xs text-yellow-400 flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            Unsaved changes
          </span>
        )}
      </div>
      <button
        onClick={onSaveLocal}
        disabled={!hasChanges}
        className="flex items-center gap-2 px-4 py-1.5 rounded-lg transition-colors text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        title="Save changes locally (does not commit to GitHub)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Save
      </button>
    </div>
  );
};

