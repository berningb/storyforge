import React from 'react';

export const AutoDetectModal = ({
  showAutoDetect,
  setShowAutoDetect,
  suggestedCharacters,
  suggestedLocations,
  selectedCharacterNames,
  selectedLocationNames,
  toggleCharacterSelection,
  toggleLocationSelection,
  onAddMultipleCharacters,
  onAddMultipleLocations,
}) => {
  if (!showAutoDetect) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowAutoDetect(false)}
    >
      <div 
        className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Auto-Detected Entities</h2>
          <button
            onClick={() => setShowAutoDetect(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Characters */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Characters ({suggestedCharacters.length})
            </h3>
            {suggestedCharacters.length === 0 ? (
              <p className="text-slate-400 text-sm">No new characters detected.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {suggestedCharacters.map((char, idx) => (
                  <div
                    key={idx}
                    className={`bg-slate-700 rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                      selectedCharacterNames.has(char.name) ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => toggleCharacterSelection(char.name)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCharacterNames.has(char.name)}
                      onChange={() => toggleCharacterSelection(char.name)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-purple-600 bg-slate-800 border-slate-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{char.name}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          char.confidence === 'high' ? 'bg-green-900/50 text-green-300' :
                          char.confidence === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-slate-600 text-slate-300'
                        }`}>
                          {char.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{char.count} mention{char.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
                {suggestedCharacters.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        const selectedChars = Array.from(selectedCharacterNames);
                        if (selectedChars.length > 0) {
                          onAddMultipleCharacters(selectedChars);
                          setShowAutoDetect(false);
                        }
                      }}
                      disabled={selectedCharacterNames.size === 0}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Add Selected ({selectedCharacterNames.size})
                    </button>
                    <button
                      onClick={() => {
                        const selectedChars = suggestedCharacters
                          .filter(c => c.confidence === 'high' || c.confidence === 'medium')
                          .map(c => c.name);
                        onAddMultipleCharacters(selectedChars);
                        setShowAutoDetect(false);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Add All High/Medium
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Locations */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Locations ({suggestedLocations.length})
            </h3>
            {suggestedLocations.length === 0 ? (
              <p className="text-slate-400 text-sm">No new locations detected.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {suggestedLocations.map((loc, idx) => (
                  <div
                    key={idx}
                    className={`bg-slate-700 rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                      selectedLocationNames.has(loc.name) ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => toggleLocationSelection(loc.name)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLocationNames.has(loc.name)}
                      onChange={() => toggleLocationSelection(loc.name)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-purple-600 bg-slate-800 border-slate-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{loc.name}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          loc.confidence === 'high' ? 'bg-green-900/50 text-green-300' :
                          loc.confidence === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-slate-600 text-slate-300'
                        }`}>
                          {loc.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{loc.count} mention{loc.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
                {suggestedLocations.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        const selectedLocs = Array.from(selectedLocationNames);
                        if (selectedLocs.length > 0) {
                          onAddMultipleLocations(selectedLocs);
                          setShowAutoDetect(false);
                        }
                      }}
                      disabled={selectedLocationNames.size === 0}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Add Selected ({selectedLocationNames.size})
                    </button>
                    <button
                      onClick={() => {
                        const selectedLocs = suggestedLocations
                          .filter(l => l.confidence === 'high' || l.confidence === 'medium')
                          .map(l => l.name);
                        onAddMultipleLocations(selectedLocs);
                        setShowAutoDetect(false);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Add All High/Medium
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={() => setShowAutoDetect(false)}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

