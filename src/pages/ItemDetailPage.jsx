import React, { useMemo } from 'react';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { useAuth } from '../contexts/AuthContext';

export const ItemDetailPage = ({ item, onBack, repoOwner = null, activeTab = 'collections', onNavigateToRepo = null, onNavigateToTab = null, onNavigateToCollection = null }) => {
  const { currentUser } = useAuth();
  
  // Build breadcrumbs for nav
  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    if (repoOwner && (onNavigateToRepo || onBack)) {
      crumbs.push({
        label: repoOwner,
        onClick: onNavigateToRepo || onBack,
        isCurrent: false,
      });
    }
    if (activeTab && (onNavigateToTab || onBack)) {
      crumbs.push({
        label: activeTab,
        onClick: onNavigateToTab || onBack,
        isCurrent: false,
      });
    }
    if (item.collectionName && (onNavigateToCollection || onBack)) {
      crumbs.push({
        label: item.collectionName,
        onClick: onNavigateToCollection || onBack,
        isCurrent: false,
      });
    }
    crumbs.push({
      label: item.name,
      onClick: undefined,
      isCurrent: true,
    });
    return crumbs;
  }, [repoOwner, activeTab, item.collectionName, item.name, onNavigateToRepo, onNavigateToTab, onNavigateToCollection, onBack]);

  // Group dialogue by file
  const dialogueByFile = {};
  item.dialogue?.forEach(d => {
    if (!dialogueByFile[d.file]) {
      dialogueByFile[d.file] = [];
    }
    dialogueByFile[d.file].push(d);
  });

  // Group mentions by file
  const mentionsByFile = {};
  item.mentions?.forEach(m => {
    if (!mentionsByFile[m.file]) {
      mentionsByFile[m.file] = [];
    }
    mentionsByFile[m.file].push(m);
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="max-w-7xl mx-auto relative flex items-center">
          {/* Left - Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1">
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
                    <span className="text-white text-sm font-semibold">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          
          {/* Center - StoryForge */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-xl font-bold text-white">StoryForge</h1>
          </div>
          
          {/* Right - Avatar */}
          <div className="ml-auto flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Item Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Mentions</h3>
            <p className="text-3xl font-bold text-white">{item.mentionCount || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Dialogue Lines</h3>
            <p className="text-3xl font-bold text-white">{item.dialogue?.length || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Files Appeared In</h3>
            <p className="text-3xl font-bold text-white">
              {new Set([
                ...(item.dialogue?.map(d => d.file) || []),
                ...(item.mentions?.map(m => m.file) || [])
              ]).size}
            </p>
          </div>
        </div>

        {/* Dialogue and Mentions - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Dialogue */}
          <div>
            <h2 className="text-xl font-bold mb-4">Dialogue</h2>
            {item.dialogue && item.dialogue.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(dialogueByFile).map(([fileName, dialogues]) => (
                  <div key={fileName} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-lg font-semibold text-purple-400 mb-4">{fileName}</h3>
                    <div className="space-y-4">
                      {dialogues.map((d, idx) => (
                        <div key={idx} className="bg-slate-700 rounded-lg p-4 border-l-4 border-purple-500">
                          <p className="text-white italic mb-2">"{d.dialogue}"</p>
                          <p className="text-xs text-slate-400">— {d.speaker || item.name}</p>
                          {d.context && d.context !== d.dialogue && (
                            <p className="text-sm text-slate-400 mt-2">{d.context}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-slate-400">No dialogue found for this item.</p>
              </div>
            )}
          </div>

          {/* Right Column - Mentions */}
          <div>
            <h2 className="text-xl font-bold mb-4">Mentions</h2>
            {item.mentions && item.mentions.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(mentionsByFile).map(([fileName, mentions]) => (
                  <div key={fileName} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-lg font-semibold text-blue-400 mb-4">{fileName}</h3>
                    <div className="space-y-3">
                      {mentions.map((mention, idx) => (
                        <div key={idx} className="bg-slate-700 rounded-lg p-4 border-l-4 border-blue-500">
                          <p className="text-slate-300">{mention.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-slate-400">No mentions found for this item.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

