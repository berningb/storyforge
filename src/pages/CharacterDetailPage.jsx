import React from 'react';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { useAuth } from '../contexts/AuthContext';

export const CharacterDetailPage = ({ character, onBack }) => {
  const { currentUser } = useAuth();

  // Group dialogue by file
  const dialogueByFile = {};
  character.dialogue?.forEach(d => {
    if (!dialogueByFile[d.file]) {
      dialogueByFile[d.file] = [];
    }
    dialogueByFile[d.file].push(d);
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold">{character.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Character Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Mentions</h3>
            <p className="text-3xl font-bold text-white">{character.count}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Dialogue Lines</h3>
            <p className="text-3xl font-bold text-white">{character.dialogue?.length || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Files Appeared In</h3>
            <p className="text-3xl font-bold text-white">{Object.keys(dialogueByFile).length}</p>
          </div>
        </div>

        {/* Context Examples */}
        {character.context && character.context.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Context Examples</h2>
            <div className="space-y-3">
              {character.context.slice(0, 5).map((ctx, idx) => (
                <div key={idx} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <p className="text-slate-300">{ctx}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dialogue */}
        {character.dialogue && character.dialogue.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Dialogue</h2>
            <div className="space-y-6">
              {Object.entries(dialogueByFile).map(([fileName, dialogues]) => (
                <div key={fileName} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">{fileName}</h3>
                  <div className="space-y-4">
                    {dialogues.map((d, idx) => (
                      <div key={idx} className="bg-slate-700 rounded-lg p-4 border-l-4 border-purple-500">
                        <p className="text-white italic mb-2">"{d.dialogue}"</p>
                        <p className="text-xs text-slate-400">— {character.name}</p>
                        {d.context && d.context !== d.dialogue && (
                          <p className="text-sm text-slate-400 mt-2">{d.context}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!character.dialogue || character.dialogue.length === 0) && (
          <div className="text-center py-12">
            <p className="text-slate-400">No dialogue found for this character.</p>
          </div>
        )}
      </main>
    </div>
  );
};

