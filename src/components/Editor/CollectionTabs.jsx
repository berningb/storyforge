import React from 'react';

export const CollectionTabs = ({ collections, highlightedCollections, onToggleCollection, onNewCollection }) => {
  return (
    <div className="px-6 py-3 shrink-0 flex items-center gap-2 border-b border-slate-700 overflow-x-auto">
      {Object.entries(collections).map(([collectionName, collection]) => {
        const isHighlighted = highlightedCollections.has(collectionName);
        const config = collection.config || {};
        
        // Get the collection's color - support both hex and Tailwind classes
        const collectionColor = config.color || { bg: 'bg-gray-200', text: 'text-gray-800' };
        const bgColor = collectionColor.hex || collectionColor.bg || 'bg-gray-200';
        const textColor = collectionColor.text || 'text-gray-800';
        
        // Check if it's a hex color (starts with #)
        const isHexColor = typeof bgColor === 'string' && bgColor.startsWith('#');
        const buttonStyle = isHighlighted && isHexColor 
          ? { backgroundColor: bgColor, color: textColor }
          : {};
        const buttonClassName = isHighlighted && !isHexColor
          ? `${bgColor} ${textColor}`
          : isHighlighted
          ? ''
          : 'bg-slate-700 text-slate-300';
        
        return (
          <button
            key={collectionName}
            onClick={() => onToggleCollection(collectionName)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${buttonClassName} ${!isHighlighted ? 'hover:bg-slate-600' : ''}`}
            style={buttonStyle}
            title={`Toggle ${config.name || collectionName} highlighting`}
          >
            {config.name || collectionName}
          </button>
        );
      })}
      <button
        onClick={onNewCollection}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
        title="Manage collections"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Collection
      </button>
    </div>
  );
};


