import React from 'react';

export const CharactersTab = ({
  characters,
  newCharacterName,
  setNewCharacterName,
  characterDialogueCounts,
  characterMentionCounts,
  onAddCharacter,
  onRemoveCharacter,
  onCharacterSelect,
  onAutoDetect,
  isDetecting,
  filesLength,
}) => {
  return (
    <div className="space-y-4">
      {/* Add Character Form */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Character</h3>
          <button
            onClick={onAutoDetect}
            disabled={isDetecting || filesLength === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            {isDetecting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Detecting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Auto-Detect
              </>
            )}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Character name..."
            value={newCharacterName}
            onChange={(e) => setNewCharacterName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onAddCharacter();
              }
            }}
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={onAddCharacter}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Characters List */}
      {characters.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No characters added yet. Add a character above to start tracking their dialogue.</p>
        </div>
      ) : (
        characters.map((characterName) => {
          return (
            <div
              key={characterName}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500 transition-all"
            >
              <div className="flex items-center justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onCharacterSelect(characterName)}
                >
                  <h3 className="text-lg font-semibold text-white mb-1">{characterName}</h3>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>
                      {characterDialogueCounts.get(characterName) ?? 0} dialogue line{(characterDialogueCounts.get(characterName) ?? 0) !== 1 ? 's' : ''} found
                    </p>
                    <p>
                      {characterMentionCounts.get(characterName) ?? 0} mention{(characterMentionCounts.get(characterName) ?? 0) !== 1 ? 's' : ''} found
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveCharacter(characterName)}
                  className="text-red-400 hover:text-red-300 transition-colors ml-4"
                  title="Remove character"
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

