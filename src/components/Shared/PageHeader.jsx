import React from 'react';
import { AvatarDropdown } from '../AvatarDropdown';

export const PageHeader = ({ breadcrumbs, currentUser }) => {
  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
      <div className="max-w-7xl mx-auto relative flex items-center">
        {/* Left - Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
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
  );
};


