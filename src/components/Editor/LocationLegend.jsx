import React from 'react';

export const LocationLegend = ({
  locations,
  keywords,
  setKeywords,
  handleAddLocation,
  handleRemoveCharacter,
}) => {
  if (locations.length === 0) {
    return (
      <div className="p-4 border-b border-slate-700 bg-slate-800 shrink-0">
        <h3 className="text-xs font-semibold text-blue-300 mb-2 uppercase tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Locations ({locations.length})
        </h3>
        <div className="flex flex-wrap items-center gap-2 min-h-[60px] p-2 rounded-md bg-blue-900/20 border-2 border-dashed border-blue-700/50">
          <p className="text-xs text-slate-400 italic">Drag keywords or characters here to add as locations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-slate-700 bg-slate-800 shrink-0">
      <h3 className="text-xs font-semibold text-blue-300 mb-2 uppercase tracking-wide flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Locations ({locations.length})
      </h3>
      <div 
        className="flex flex-wrap items-center gap-2 min-h-[60px] p-2 rounded-md bg-blue-900/20 border-2 border-dashed border-blue-700/50"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('border-blue-500', 'bg-blue-900/30');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('border-blue-500', 'bg-blue-900/30');
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-blue-500', 'bg-blue-900/30');
          const draggedText = e.dataTransfer.getData('text/plain');
          const entityType = e.dataTransfer.getData('entity-type');
          
          const trimmedName = draggedText.trim().toLowerCase();
          const alreadyExists = locations.some(l => l.toLowerCase() === trimmedName);
          
          if (draggedText && !alreadyExists) {
            await handleAddLocation(draggedText);
            
            if (!entityType || entityType === 'keyword') {
              setKeywords(prev => prev.filter(k => k.word.toLowerCase() !== trimmedName));
            }
            
            if (entityType === 'character') {
              await handleRemoveCharacter(draggedText);
            }
          }
        }}
      >
        {locations.map((loc, idx) => (
          <div 
            key={idx}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/plain', loc);
              e.dataTransfer.setData('entity-type', 'location');
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.stopPropagation();
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-200 text-blue-800 border border-blue-300 cursor-move hover:bg-blue-300 transition-colors"
          >
            <div className="w-3 h-3 rounded bg-blue-500 border border-blue-700"></div>
            <span className="text-xs font-medium">{loc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

