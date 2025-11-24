import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchMarkdownFiles, fetchFileContent } from '../lib/github';
import { extractDialogue, getCharactersInLocation } from '../lib/textParser';
import { loadRepoData, saveRepoCharacters, saveRepoLocations, loadRepoFilesCache, saveRepoFilesCache } from '../lib/repoData';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { CharacterDetailPage } from './CharacterDetailPage';
import { LocationDetailPage } from './LocationDetailPage';

export const RepoAnalysisPage = ({ repo, onFileSelect, onBack }) => {
  const { currentUser, githubToken } = useAuth();
  const [activeTab, setActiveTab] = useState('files');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cacheDate, setCacheDate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to fetch files from GitHub
  const fetchFilesFromGitHub = async (saveToCache = false) => {
    try {
      setIsRefreshing(true);
      setError('');
      
      const [owner, repoName] = repo.fullName.split('/');
      
      // Fetch all markdown files
      const markdownFiles = await fetchMarkdownFiles(owner, repoName, repo.defaultBranch, githubToken);
      
      // Fetch content for all files
      const filePromises = markdownFiles.map(async (file) => {
        try {
          const content = await fetchFileContent(owner, repoName, file.path, repo.defaultBranch, githubToken);
          return {
            ...file,
            content,
          };
        } catch (err) {
          console.error(`Error loading ${file.path}:`, err);
          return {
            ...file,
            content: '',
          };
        }
      });
      
      const loadedFiles = await Promise.all(filePromises);
      setFiles(loadedFiles);
      
      // Save to cache if requested
      if (saveToCache && currentUser) {
        try {
          await saveRepoFilesCache(currentUser.uid, repo.fullName, loadedFiles);
          setCacheDate(new Date());
        } catch (cacheError) {
          console.error('Error saving files cache:', cacheError);
        }
      }
      
      return loadedFiles;
    } catch (err) {
      setError(`Failed to load repository data: ${err.message}`);
      console.error(err);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const loadRepoDataAsync = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Try to load cached files first
        let loadedFiles = null;
        if (currentUser) {
          const cache = await loadRepoFilesCache(currentUser.uid, repo.fullName);
          if (cache && cache.files && cache.files.length > 0) {
            loadedFiles = cache.files;
            setCacheDate(cache.cacheDate);
            setFiles(loadedFiles);
            console.log('Loaded files from cache');
          }
          
          // Load saved characters and locations from Firestore
          const savedData = await loadRepoData(currentUser.uid, repo.fullName);
          setCharacters(savedData.characters);
          setLocations(savedData.locations);
        }
        
        // If no cache, fetch from GitHub
        if (!loadedFiles) {
          await fetchFilesFromGitHub(true); // Save to cache
        }
      } catch (err) {
        setError(`Failed to load repository data: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (repo) {
      loadRepoDataAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, currentUser]);

  // Add a new character
  const handleAddCharacter = async () => {
    const trimmedName = newCharacterName.trim();
    if (trimmedName && !characters.includes(trimmedName)) {
      const updatedCharacters = [...characters, trimmedName];
      setCharacters(updatedCharacters);
      setNewCharacterName('');
      
      // Save to Firestore
      if (currentUser) {
        try {
          await saveRepoCharacters(currentUser.uid, repo.fullName, updatedCharacters);
        } catch (error) {
          console.error('Error saving character:', error);
          // Revert on error
          setCharacters(characters);
        }
      }
    }
  };

  // Remove a character
  const handleRemoveCharacter = async (characterName) => {
    const updatedCharacters = characters.filter(c => c !== characterName);
    setCharacters(updatedCharacters);
    
    // Save to Firestore
    if (currentUser) {
      try {
        await saveRepoCharacters(currentUser.uid, repo.fullName, updatedCharacters);
      } catch (error) {
        console.error('Error removing character:', error);
        // Revert on error
        setCharacters(characters);
      }
    }
  };

  // Add a new location
  const handleAddLocation = async () => {
    const trimmedName = newLocationName.trim();
    if (trimmedName && !locations.includes(trimmedName)) {
      const updatedLocations = [...locations, trimmedName];
      setLocations(updatedLocations);
      setNewLocationName('');
      
      // Save to Firestore
      if (currentUser) {
        try {
          await saveRepoLocations(currentUser.uid, repo.fullName, updatedLocations);
        } catch (error) {
          console.error('Error saving location:', error);
          // Revert on error
          setLocations(locations);
        }
      }
    }
  };

  // Remove a location
  const handleRemoveLocation = async (locationName) => {
    const updatedLocations = locations.filter(l => l !== locationName);
    setLocations(updatedLocations);
    
    // Save to Firestore
    if (currentUser) {
      try {
        await saveRepoLocations(currentUser.uid, repo.fullName, updatedLocations);
      } catch (error) {
        console.error('Error removing location:', error);
        // Revert on error
        setLocations(locations);
      }
    }
  };

  // Search for character dialogue
  const searchCharacterDialogue = (characterName) => {
    const allDialogue = [];
    const characterNameLower = characterName.toLowerCase().trim();
    const characterNameEscaped = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    files.forEach(file => {
      // Extract dialogue from the file content (raw markdown)
      const dialogue = extractDialogue(file.content, file.path);
      
      // Match dialogue where speaker matches the character name (case-insensitive, flexible matching)
      const characterDialogue = dialogue.filter(d => {
        const speakerLower = d.speaker.toLowerCase().trim();
        // Exact match
        if (speakerLower === characterNameLower) {
          return true;
        }
        // Word boundary match (e.g., "Alex" matches "Alex" but not "Alexis")
        const speakerRegex = new RegExp(`\\b${characterNameEscaped}\\b`, 'i');
        if (speakerRegex.test(d.speaker)) {
          return true;
        }
        // Also check if speaker starts with character name (for compound names)
        if (speakerLower.startsWith(characterNameLower + ' ') || characterNameLower.startsWith(speakerLower + ' ')) {
          return true;
        }
        return false;
      });
      
      allDialogue.push(...characterDialogue);
    });
    
    // Debug logging - show more details
    if (allDialogue.length === 0 && files.length > 0) {
      const sampleDialogue = extractDialogue(files[0].content, files[0].path);
      console.log(`No dialogue found for "${characterName}".`);
      console.log(`File: ${files[0].path}`);
      console.log(`Total dialogue found in file: ${sampleDialogue.length}`);
      console.log(`Sample dialogue speakers:`, sampleDialogue.slice(0, 10).map(d => d.speaker));
      console.log(`Sample dialogue context:`, sampleDialogue.slice(0, 3).map(d => d.context));
      console.log(`File content sample (first 500 chars):`, files[0].content.substring(0, 500));
    }
    
    return allDialogue;
  };

  // Search for location mentions and context
  const searchLocationMentions = (locationName) => {
    // Escape location name for regex
    const escapedLocation = locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const locationRegex = new RegExp(`\\b${escapedLocation}\\b`, 'gi');
    const allMentions = [];
    
    files.forEach(file => {
      const cleanText = file.content.replace(/<[^>]*>/g, ' ');
      
      // Split into sentences for better context
      const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      sentences.forEach(sentence => {
        // Reset regex lastIndex for each sentence
        locationRegex.lastIndex = 0;
        if (locationRegex.test(sentence)) {
          // Check which characters are mentioned in this sentence (optional - for display)
          const charactersInContext = characters.filter(charName => {
            const charRegex = new RegExp(`\\b${charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            return charRegex.test(sentence);
          });
          
          // Add ALL mentions, even if no characters are present
          allMentions.push({
            context: sentence.trim(),
            file: file.path,
            characters: charactersInContext, // Empty array if no characters mentioned
          });
        }
      });
    });
    
    return allMentions;
  };

  // Handle character selection
  const handleCharacterSelect = (characterName) => {
    const dialogue = searchCharacterDialogue(characterName);
    setSelectedCharacter({
      name: characterName,
      dialogue: dialogue,
      count: dialogue.length,
    });
  };

  // Handle location selection
  const handleLocationSelect = (locationName) => {
    const mentions = searchLocationMentions(locationName);
    // Count total mentions across all files
    const locationRegex = new RegExp(`\\b${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let totalMentions = 0;
    files.forEach(file => {
      const matches = file.content.match(locationRegex);
      if (matches) {
        totalMentions += matches.length;
      }
    });
    
    // Get unique characters who have appeared in this location
    const characterSet = new Set();
    mentions.forEach(mention => {
      mention.characters.forEach(char => characterSet.add(char));
    });
    
    setSelectedLocation({
      name: locationName,
      mentions: mentions,
      characters: Array.from(characterSet),
      count: totalMentions,
    });
  };

  // If a character is selected, show character detail page
  if (selectedCharacter) {
    return (
      <CharacterDetailPage
        character={selectedCharacter}
        onBack={() => setSelectedCharacter(null)}
      />
    );
  }

  // If a location is selected, show location detail page
  if (selectedLocation) {
    return (
      <LocationDetailPage
        location={selectedLocation}
        onBack={() => setSelectedLocation(null)}
      />
    );
  }

  if (loading && files.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading repository...</p>
        </div>
      </div>
    );
  }

  const filteredFiles = files.filter(file =>
    file.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCharacters = characters.filter(char =>
    char.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLocations = locations.filter(loc =>
    loc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Repositories
            </button>
            <h1 className="text-xl font-bold">React Ink</h1>
            <span className="text-sm text-slate-400">{repo.fullName}</span>
          </div>
          <div className="flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            {cacheDate && (
              <p className="text-sm text-slate-400">
                Last fetched: {cacheDate.toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={async () => {
              try {
                await fetchFilesFromGitHub(true);
              } catch (err) {
                // Error already set in fetchFilesFromGitHub
              }
            }}
            disabled={isRefreshing || loading}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Fetch Latest</span>
              </>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-slate-700">
            {['files', 'characters', 'locations'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchTerm('');
                }}
                className={`px-6 py-3 font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab} {tab === 'characters' && `(${characters.length})`}
                {tab === 'locations' && `(${locations.length})`}
                {tab === 'files' && `(${files.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Tab Content */}
        {activeTab === 'files' && (
          <div className="space-y-2">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No files found.</p>
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file.sha}
                  onClick={() => onFileSelect(file)}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500 hover:bg-slate-750 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{file.path}</h3>
                      <p className="text-xs text-slate-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'characters' && (
          <div className="space-y-4">
            {/* Add Character Form */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Add Character</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Character name..."
                  value={newCharacterName}
                  onChange={(e) => setNewCharacterName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCharacter();
                    }
                  }}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleAddCharacter}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Characters List */}
            {filteredCharacters.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No characters added yet. Add a character above to start tracking their dialogue.</p>
              </div>
            ) : (
              filteredCharacters.map((characterName) => {
                const dialogue = searchCharacterDialogue(characterName);
                return (
                  <div
                    key={characterName}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleCharacterSelect(characterName)}
                      >
                        <h3 className="text-lg font-semibold text-white mb-1">{characterName}</h3>
                        <p className="text-xs text-slate-400">
                          {dialogue.length} dialogue line{dialogue.length !== 1 ? 's' : ''} found
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveCharacter(characterName)}
                        className="text-red-400 hover:text-red-300 transition-colors ml-4"
                        title="Remove character"
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
        )}

        {activeTab === 'locations' && (
          <div className="space-y-4">
            {/* Add Location Form */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Add Location</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Location name..."
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddLocation();
                    }
                  }}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleAddLocation}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Locations List */}
            {filteredLocations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No locations added yet. Add a location above to start tracking mentions.</p>
              </div>
            ) : (
              filteredLocations.map((locationName) => {
                const locationRegex = new RegExp(`\\b${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                let mentionCount = 0;
                files.forEach(file => {
                  const matches = file.content.match(locationRegex);
                  if (matches) {
                    mentionCount += matches.length;
                  }
                });
                
                return (
                  <div
                    key={locationName}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleLocationSelect(locationName)}
                      >
                        <h3 className="text-lg font-semibold text-white mb-1">{locationName}</h3>
                        <p className="text-xs text-slate-400">
                          {mentionCount} mention{mentionCount !== 1 ? 's' : ''} found
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveLocation(locationName)}
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
        )}
      </main>
    </div>
  );
};
