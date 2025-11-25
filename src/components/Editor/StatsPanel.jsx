import React from 'react';

export const StatsPanel = ({ stats }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-800 to-slate-900 min-h-0">
      <div className="grid grid-cols-2 gap-3">
        {/* Word Count Stats */}
        <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-100">
          <h4 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-blue-500 rounded"></span>
            Word Count
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Words</span>
              <span className="text-lg font-bold text-blue-600">{stats.totalWords}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Chars</span>
              <span className="text-lg font-bold text-blue-600">{stats.totalChars}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">No Spaces</span>
              <span className="text-lg font-bold text-blue-600">{stats.totalCharsNoSpaces}</span>
            </div>
          </div>
        </div>

        {/* Highlighting Stats */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 shadow-lg border border-purple-100">
          <h4 className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-purple-500 rounded"></span>
            Highlighting
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-purple-700 font-medium">Total</span>
              <span className="text-lg font-bold text-purple-600">{stats.totalHighlighted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-purple-700 font-medium">Unique</span>
              <span className="text-lg font-bold text-purple-600">{stats.uniqueHighlighted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-purple-700 font-medium">Density</span>
              <span className="text-lg font-bold text-purple-600">
                {stats.totalWords > 0 
                  ? ((stats.totalHighlighted / stats.totalWords) * 100).toFixed(1)
                  : '0'
                }%
              </span>
            </div>
          </div>
        </div>

        {/* Top Highlighted Words */}
        {stats.highlightedCounts.some(item => item.count > 0) && (
          <div className="col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-3 shadow-lg border border-indigo-100">
            <h4 className="text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-0.5 h-3 bg-indigo-500 rounded"></span>
              Top Keywords
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {stats.highlightedCounts
                .filter(item => item.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)
                .map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-1 px-2 rounded bg-white/60 hover:bg-white transition-colors">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${item.color.class} border border-white`}></div>
                      <span className="text-xs font-medium text-gray-700">{item.word}</span>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

