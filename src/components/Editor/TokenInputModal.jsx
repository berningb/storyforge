import React from 'react';

export const TokenInputModal = ({
  showTokenInput,
  setShowTokenInput,
  tokenInput,
  setTokenInput,
  setGitHubToken,
}) => {
  if (!showTokenInput) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">GitHub Access Token</h2>
        
        <p className="text-sm text-slate-400 mb-4">
          To save files to GitHub, you need a Personal Access Token with <code className="bg-slate-700 px-1 rounded">repo</code> scope.
          <br /><br />
          <a 
            href="https://github.com/settings/tokens/new?scopes=repo&description=StoryForge%20Editor" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline"
          >
            Create a token here →
          </a>
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Personal Access Token
          </label>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="ghp_..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              setShowTokenInput(false);
              setTokenInput('');
            }}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (tokenInput.trim()) {
                setGitHubToken(tokenInput.trim());
                setShowTokenInput(false);
                setTokenInput('');
              }
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Save Token
          </button>
        </div>
      </div>
    </div>
  );
};

