import React from 'react';
import { PASTEL_COLORS } from '../../utils/editorUtils';

export const KeywordLegend = ({
  keywords,
  onAddKeyword,
  onRemoveKeyword,
  stats,
  handleWordClick,
  handleRemoveCharacter,
  handleRemoveLocation,
}) => {
  return (
    <div className="p-4 border-b border-slate-700 bg-slate-800 shrink-0">
      <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Keywords</h3>
      <div 
        className="flex flex-wrap items-center gap-2 min-h-[60px] p-2 rounded-md bg-slate-900/50 border-2 border-dashed border-slate-600/50"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('border-slate-500', 'bg-slate-800');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('border-slate-500', 'bg-slate-800');
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-slate-500', 'bg-slate-800');
          const draggedText = e.dataTransfer.getData('text/plain');
          const entityType = e.dataTransfer.getData('entity-type');
          
          if (draggedText) {
            const isAlreadyKeyword = keywords.some(k => k.word.toLowerCase() === draggedText.toLowerCase());
            const trimmedName = draggedText.trim().toLowerCase();
            
            if (!isAlreadyKeyword && onAddKeyword) {
              const usedColors = keywords.map(k => k.color.class);
              const availableColor = PASTEL_COLORS.find(c => !usedColors.includes(c.class)) || PASTEL_COLORS[keywords.length % PASTEL_COLORS.length];
              
              onAddKeyword(trimmedName, availableColor);
              
              if (entityType === 'character') {
                await handleRemoveCharacter(draggedText);
              }
              
              if (entityType === 'location') {
                await handleRemoveLocation(draggedText);
              }
            }
          }
        }}
      >
        {keywords.length > 0 ? (
          keywords.map((keyword, index) => (
            <div 
              key={index}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', keyword.word);
                e.dataTransfer.setData('entity-type', 'keyword');
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 transition-all border border-slate-600 cursor-move group"
              onClick={() => handleWordClick(keyword.word)}
            >
              <div className={`w-3 h-3 rounded ${keyword.color.class} border border-slate-700`}></div>
              <span className="text-xs font-medium text-slate-200">{keyword.word}</span>
              {stats.highlightedCounts[index]?.count > 0 && (
                <span className="text-xs font-bold text-purple-300 bg-purple-900/50 px-1.5 py-0.5 rounded">
                  {stats.highlightedCounts[index].count}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRemoveKeyword) {
                    onRemoveKeyword(keyword.word);
                  }
                }}
                className="ml-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                title="Remove keyword"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 italic">Click words in the editor to highlight them, or drag characters/locations here</p>
        )}
      </div>
    </div>
  );
};

