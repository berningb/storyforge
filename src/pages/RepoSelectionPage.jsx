import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserRepos, getGitHubUsername } from '../lib/github';
import { AvatarDropdown } from '../components/AvatarDropdown';

export const RepoSelectionPage = ({ onRepoSelect }) => {
  const { currentUser, githubToken } = useAuth();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const loadReposForUsername = async (username) => {
    try {
      setLoading(true);
      setError('');
      
      // Create a mock user object with the username
      const mockUser = {
        ...currentUser,
        displayName: username,
        providerData: [{ providerId: 'github.com', uid: username }],
      };
      
      const fetchedRepos = await fetchUserRepos(mockUser);
      setRepos(fetchedRepos);
      setShowManualInput(false);
      setLoading(false);
    } catch (err) {
      setError(`Failed to load repositories: ${err.message || err.toString()}`);
      console.error('Error details:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadRepos = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Debug: Log user info
        console.log('Current user:', currentUser);
        console.log('Provider data:', currentUser?.providerData);
        
        // Check if we have a numeric ID (which means we need to fetch username)
        const githubProvider = currentUser?.providerData?.find(p => p.providerId === 'github.com');
        const uid = githubProvider?.uid;
        
        if (uid && /^\d+$/.test(uid)) {
          console.log('Detected numeric GitHub ID, attempting to fetch username...');
          // Try to fetch username, but show manual input immediately as fallback
          setShowManualInput(true);
          
          const username = await getGitHubUsername(currentUser);
          console.log('Extracted username:', username);
          
          if (username) {
            // Successfully got username, load repos
            await loadReposForUsername(username);
            return;
          } else {
            // Failed to get username, keep manual input visible
            setError('Could not automatically determine your GitHub username. Please enter it manually below.');
            setLoading(false);
            return;
          }
        }
        
        // Not a numeric ID, try normal extraction
        const username = await getGitHubUsername(currentUser);
        console.log('Extracted username:', username);
        
        if (!username) {
          setError('Could not determine GitHub username. Please enter your GitHub username manually.');
          setShowManualInput(true);
          setLoading(false);
          return;
        }
        
        await loadReposForUsername(username);
      } catch (err) {
        setError(`Failed to load repositories: ${err.message || err.toString()}`);
        console.error('Error details:', err);
        setShowManualInput(true);
        setLoading(false);
      }
    };

    if (currentUser && !showManualInput) {
      loadRepos();
    }
  }, [currentUser]);

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading repositories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">React Ink</h1>
          <div className="flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Select a Repository</h2>
          <p className="text-slate-400">Choose a repository to browse markdown blog files</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Username Input */}
        {showManualInput && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Enter GitHub Username</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="GitHub username"
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && manualUsername.trim()) {
                    loadReposForUsername(manualUsername.trim());
                  }
                }}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => {
                  if (manualUsername.trim()) {
                    loadReposForUsername(manualUsername.trim());
                  }
                }}
                disabled={!manualUsername.trim() || loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Load Repos
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Enter your GitHub username to load your repositories
            </p>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Repositories List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRepos.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-400">
                {searchTerm ? 'No repositories found matching your search.' : 'No repositories found.'}
              </p>
            </div>
          ) : (
            filteredRepos.map((repo) => (
              <div
                key={repo.id}
                onClick={() => onRepoSelect(repo)}
                className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-purple-500 hover:bg-slate-750 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{repo.name}</h3>
                  {repo.private && (
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                      Private
                    </span>
                  )}
                </div>
                {repo.description && (
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">{repo.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{repo.fullName}</span>
                  <span>{new Date(repo.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

