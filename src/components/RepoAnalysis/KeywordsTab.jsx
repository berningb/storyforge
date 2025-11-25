import React from 'react';

export const KeywordsTab = ({
  keywords,
  newKeywordName,
  setNewKeywordName,
  files,
  onAddKeyword,
  onRemoveKeyword,
}) => {
  return (
    <div className="space-y-4">
      {/* Add Keyword Form */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Add Keyword</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Keyword..."
            value={newKeywordName}
            onChange={(e) => setNewKeywordName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onAddKeyword();
              }
            }}
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={onAddKeyword}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Keywords List */}
      {keywords.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No keywords added yet. Add a keyword above to highlight it in your files.</p>
        </div>
      ) : (
        keywords.map((keyword) => {
          // Count mentions across all files
          const keywordRegex = new RegExp(`\\b${keyword.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          let mentionCount = 0;
          files.forEach(file => {
            const matches = file.content.match(keywordRegex);
            if (matches) {
              mentionCount += matches.length;
            }
          });
          
          return (
            <div
              key={keyword.word}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full ${keyword.color?.class || 'bg-purple-200'}`}></div>
                    <h3 className="text-lg font-semibold text-white">{keyword.word}</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    {mentionCount} mention{mentionCount !== 1 ? 's' : ''} found
                  </p>
                </div>
                <button
                  onClick={() => onRemoveKeyword(keyword.word)}
                  className="text-red-400 hover:text-red-300 transition-colors ml-4"
                  title="Remove keyword"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

