import React from 'react';
import { PASTEL_COLORS } from '../../utils/editorUtils';

export const CharacterLegend = ({
  characters,
  keywords,
  setKeywords,
  handleAddCharacter,
  handleRemoveLocation,
}) => {
  if (characters.length === 0) {
    return (
      <div className="p-4 border-b border-slate-700 bg-slate-800 shrink-0">
        <h3 className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Characters ({characters.length})
        </h3>
        <div className="flex flex-wrap items-center gap-2 min-h-[60px] p-2 rounded-md bg-purple-900/20 border-2 border-dashed border-purple-700/50">
          <p className="text-xs text-slate-400 italic">Drag keywords or locations here to add as characters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-slate-700 bg-slate-800 shrink-0">
      <h3 className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Characters ({characters.length})
      </h3>
      <div 
        className="flex flex-wrap items-center gap-2 min-h-[60px] p-2 rounded-md bg-purple-900/20 border-2 border-dashed border-purple-700/50"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('border-purple-500', 'bg-purple-900/30');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('border-purple-500', 'bg-purple-900/30');
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-purple-500', 'bg-purple-900/30');
          const draggedText = e.dataTransfer.getData('text/plain');
          const entityType = e.dataTransfer.getData('entity-type');
          
          const trimmedName = draggedText.trim().toLowerCase();
          const alreadyExists = characters.some(c => c.toLowerCase() === trimmedName);
          
          if (draggedText && !alreadyExists) {
            await handleAddCharacter(draggedText);
            
            if (!entityType || entityType === 'keyword') {
              setKeywords(prev => prev.filter(k => k.word.toLowerCase() !== trimmedName));
            }
            
            if (entityType === 'location') {
              await handleRemoveLocation(draggedText);
            }
          }
        }}
      >
        {characters.map((char, idx) => (
          <div 
            key={idx}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/plain', char);
              e.dataTransfer.setData('entity-type', 'character');
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.stopPropagation();
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-200 text-purple-800 border border-purple-300 cursor-move hover:bg-purple-300 transition-colors"
          >
            <div className="w-3 h-3 rounded bg-purple-500 border border-purple-700"></div>
            <span className="text-xs font-medium">{char}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

