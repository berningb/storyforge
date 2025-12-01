import React, { useMemo } from 'react';

export const ItemOverview = ({ selectedItem, onBack, onHoverText, onLeaveHover }) => {
  // Group dialogue by file
  const dialogueByFile = useMemo(() => {
    const grouped = {};
    selectedItem.dialogue?.forEach(d => {
      if (!grouped[d.file]) {
        grouped[d.file] = [];
      }
      grouped[d.file].push(d);
    });
    return grouped;
  }, [selectedItem.dialogue]);

  // Group mentions by file
  const mentionsByFile = useMemo(() => {
    const grouped = {};
    selectedItem.mentions?.forEach(m => {
      if (!grouped[m.file]) {
        grouped[m.file] = [];
      }
      grouped[m.file].push(m);
    });
    return grouped;
  }, [selectedItem.mentions]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors"
            title="Back to collections"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-white">{selectedItem.name}</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-purple-400">
            {selectedItem.dialogueCount || 0} dialogue
          </div>
          <div className="text-blue-400">
            {selectedItem.mentionCount || 0} mentions
          </div>
        </div>
      </div>

      {/* Side by Side Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Column - Dialogue */}
        <div className="w-1/2 flex flex-col overflow-hidden border-r border-slate-700">
          <div className="px-6 py-4 border-b border-slate-700 shrink-0">
            <h3 className="text-lg font-semibold text-purple-400">Dialogue</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {selectedItem.dialogue && selectedItem.dialogue.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(dialogueByFile).map(([fileName, dialogues]) => (
                  <div key={fileName} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                    <h4 className="text-sm font-semibold text-purple-300 mb-3">{fileName}</h4>
                    <div className="space-y-3">
                      {dialogues.map((d, idx) => (
                        <div 
                          key={idx} 
                          className="bg-slate-800 rounded-lg p-3 border-l-4 border-purple-500 cursor-pointer hover:bg-slate-700 transition-colors"
                          onMouseEnter={() => {
                            let textToHighlight = '';
                            if (d.context && d.context !== d.dialogue) {
                              textToHighlight = d.context;
                            } else if (d.dialogue) {
                              textToHighlight = d.dialogue;
                            }
                            
                            if (textToHighlight) {
                              const cleanText = textToHighlight
                                .replace(/^["']+|["']+$/g, '')
                                .replace(/\s+/g, ' ')
                                .trim();
                              onHoverText(cleanText);
                            }
                          }}
                          onMouseLeave={onLeaveHover}
                        >
                          <p className="text-white italic mb-1 text-sm">"{d.dialogue}"</p>
                          <p className="text-xs text-slate-400">— {d.speaker || selectedItem.name}</p>
                          {d.context && d.context !== d.dialogue && (
                            <p className="text-xs text-slate-400 mt-2">{d.context}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-700 rounded-lg border border-slate-600">
                <p className="text-slate-400 text-sm">No dialogue found for this item.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Mentions */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 shrink-0">
            <h3 className="text-lg font-semibold text-blue-400">Mentions</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {selectedItem.mentions && selectedItem.mentions.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(mentionsByFile).map(([fileName, mentions]) => (
                  <div key={fileName} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                    <h4 className="text-sm font-semibold text-blue-300 mb-3">{fileName}</h4>
                    <div className="space-y-2">
                      {mentions.map((mention, idx) => (
                        <div 
                          key={idx} 
                          className="bg-slate-800 rounded-lg p-3 border-l-4 border-blue-500 cursor-pointer hover:bg-slate-700 transition-colors"
                          onMouseEnter={() => {
                            const textToHighlight = mention.context || '';
                            if (textToHighlight) {
                              const cleanText = textToHighlight
                                .replace(/\s+/g, ' ')
                                .trim();
                              onHoverText(cleanText);
                            }
                          }}
                          onMouseLeave={onLeaveHover}
                        >
                          <p className="text-slate-300 text-sm">{mention.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-700 rounded-lg border border-slate-600">
                <p className="text-slate-400 text-sm">No mentions found for this item.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


