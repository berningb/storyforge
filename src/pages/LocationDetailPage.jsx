import React, { useMemo } from 'react';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { useAuth } from '../contexts/AuthContext';

export const LocationDetailPage = ({ location, onBack, repoOwner = null, onNavigateToRepo = null, onNavigateToTab = null }) => {
  const { currentUser } = useAuth();

  // Build breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    if (repoOwner && (onNavigateToRepo || onBack)) {
      crumbs.push({
        label: repoOwner,
        onClick: onNavigateToRepo || onBack,
        isCurrent: false,
      });
    }
    if (onNavigateToTab || onBack) {
      crumbs.push({
        label: 'collections',
        onClick: onNavigateToTab || onBack,
        isCurrent: false,
      });
    }
    crumbs.push({
      label: 'Locations',
      onClick: onNavigateToTab || onBack,
      isCurrent: false,
    });
    crumbs.push({
      label: location.name,
      onClick: undefined,
      isCurrent: true,
    });
    return crumbs;
  }, [repoOwner, onNavigateToRepo, onNavigateToTab, onBack, location.name]);

  // Group mentions by file
  const mentionsByFile = useMemo(() => {
    const fileMap = new Map();
    location.mentions?.forEach(mention => {
      if (!fileMap.has(mention.file)) {
        fileMap.set(mention.file, []);
      }
      fileMap.get(mention.file).push(mention);
    });
    return Array.from(fileMap.entries()).map(([fileName, mentions]) => ({
      fileName,
      mentions,
    }));
  }, [location.mentions]);

  // Get characters who have appeared in this location with their contexts
  const charactersInLocation = useMemo(() => {
    const charMap = new Map();
    location.mentions?.forEach(mention => {
      mention.characters?.forEach(charName => {
        if (!charMap.has(charName)) {
          charMap.set(charName, []);
        }
        charMap.get(charName).push(mention);
      });
    });
    return Array.from(charMap.entries()).map(([char, mentions]) => ({
      name: char,
      mentions,
      count: mentions.length,
    }));
  }, [location.mentions]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="max-w-7xl mx-auto relative flex items-center">
          {/* Left - StoryForge */}
          <h1 className="text-xl font-bold text-white">StoryForge</h1>
          
          {/* Center - Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <span className={`text-slate-500 ${crumb.isCurrent ? 'text-base' : 'text-sm'}`}>/</span>
                  )}
                  {crumb.onClick ? (
                    <button
                      onClick={crumb.onClick}
                      className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                    >
                      {index === 0 && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      )}
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-white text-xl font-semibold">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          
          {/* Right - Avatar */}
          <div className="ml-auto flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Location Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Total Mentions</h3>
            <p className="text-3xl font-bold text-white">{location.count}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Characters Present</h3>
            <p className="text-3xl font-bold text-white">{charactersInLocation.length}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Files Mentioned In</h3>
            <p className="text-3xl font-bold text-white">{mentionsByFile.length}</p>
          </div>
        </div>

        {/* Location Mentions by File */}
        {mentionsByFile.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Mentions of {location.name}</h2>
            <div className="space-y-6">
              {mentionsByFile.map((fileData) => (
                <div key={fileData.fileName} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4">{fileData.fileName}</h3>
                  <div className="space-y-3">
                    {fileData.mentions.map((mention, idx) => (
                      <div key={idx} className="bg-slate-700 rounded-lg p-4 border-l-4 border-purple-500">
                        <p className="text-sm text-slate-300 mb-2">{mention.context}</p>
                        {mention.characters && mention.characters.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {mention.characters.map((char, charIdx) => (
                              <span key={charIdx} className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded">
                                {char}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Characters in Location */}
        {charactersInLocation.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold mb-4">Characters in {location.name}</h2>
            <div className="space-y-4">
              {charactersInLocation.map((char) => (
                <div key={char.name} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{char.name}</h3>
                    <span className="text-sm text-slate-400">{char.count} mention{char.count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {char.mentions.slice(0, 3).map((mention, idx) => (
                      <div key={idx} className="bg-slate-700 rounded p-3">
                        <p className="text-sm text-slate-300">{mention.context}</p>
                        <p className="text-xs text-slate-500 mt-1">From: {mention.file}</p>
                      </div>
                    ))}
                    {char.mentions.length > 3 && (
                      <p className="text-xs text-slate-400 italic">
                        + {char.mentions.length - 3} more mention{char.mentions.length - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">No characters found in this location.</p>
          </div>
        )}
      </main>
    </div>
  );
};

