import React from 'react';

export const LocationsTab = ({
  locations,
  newLocationName,
  setNewLocationName,
  locationMentionCounts,
  onAddLocation,
  onRemoveLocation,
  onLocationSelect,
  onAutoDetect,
  isDetecting,
  filesLength,
}) => {
  return (
    <div className="space-y-4">
      {/* Add Location Form */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Location</h3>
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
            placeholder="Location name..."
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onAddLocation();
              }
            }}
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={onAddLocation}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Locations List */}
      {locations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No locations added yet. Add a location above to start tracking mentions.</p>
        </div>
      ) : (
        locations.map((locationName) => {
          const mentionCount = locationMentionCounts.get(locationName) ?? 0;
          
          return (
            <div
              key={locationName}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500 transition-all"
            >
              <div className="flex items-center justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onLocationSelect(locationName)}
                >
                  <h3 className="text-lg font-semibold text-white mb-1">{locationName}</h3>
                  <p className="text-xs text-slate-400">
                    {mentionCount} mention{mentionCount !== 1 ? 's' : ''} found
                  </p>
                </div>
                <button
                  onClick={() => onRemoveLocation(locationName)}
                  className="text-red-400 hover:text-red-300 transition-colors ml-4"
                  title="Remove location"
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

