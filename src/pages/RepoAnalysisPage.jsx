import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRepo } from '../contexts/RepoContext';
import { fetchFileContent, updateFileContent, getFileSha } from '../lib/github';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { CharacterDetailPage } from './CharacterDetailPage';
import { LocationDetailPage } from './LocationDetailPage';
import { htmlToMarkdown } from '@react-quill/lib';
import { useRepoData } from '../hooks/useRepoData';
import { useEntitySearch } from '../hooks/useEntitySearch';
import { FilesTab } from '../components/RepoAnalysis/FilesTab';
import { CharactersTab } from '../components/RepoAnalysis/CharactersTab';
import { LocationsTab } from '../components/RepoAnalysis/LocationsTab';
import { KeywordsTab } from '../components/RepoAnalysis/KeywordsTab';
import { AutoDetectModal } from '../components/RepoAnalysis/AutoDetectModal';
import { SaveModal } from '../components/RepoAnalysis/SaveModal';

export const RepoAnalysisPage = ({ repo, onFileSelect, onBack, selectedBlog, editedFiles, editedFileContent, onFileEdited }) => {
  const { currentUser, githubToken } = useAuth();
  const { characters, locations, keywords, addCharacter, removeCharacter, addLocation, removeLocation, addKeyword, removeKeyword } = useRepo();
  const [activeTab, setActiveTab] = useState('files');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [fileStatuses, setFileStatuses] = useState(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [fileToSync, setFileToSync] = useState(null);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newKeywordName, setNewKeywordName] = useState('');
  const [showAutoDetect, setShowAutoDetect] = useState(false);
  const [suggestedCharacters, setSuggestedCharacters] = useState([]);
  const [suggestedLocations, setSuggestedLocations] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedCharacterNames, setSelectedCharacterNames] = useState(new Set());
  const [selectedLocationNames, setSelectedLocationNames] = useState(new Set());

  // Use custom hooks
  const {
    loading,
    files,
    setFiles,
    cacheDate,
    setCacheDate,
    characterDialogueCounts,
    setCharacterDialogueCounts,
    characterMentionCounts,
    setCharacterMentionCounts,
    locationMentionCounts,
    setLocationMentionCounts,
    isRefreshing,
    fetchFilesFromGitHub,
  } = useRepoData(repo, currentUser, githubToken);

  const { searchCharacterDialogue, searchCharacterMentions, searchLocationMentions } = useEntitySearch(files, characters);

  // Wrapper handlers that use context methods
  const handleAddCharacter = useCallback(async (name) => {
    await addCharacter(name);
  }, [addCharacter]);

  const handleRemoveCharacter = useCallback(async (name) => {
    await removeCharacter(name);
  }, [removeCharacter]);

  const handleAddLocation = useCallback(async (name) => {
    await addLocation(name);
  }, [addLocation]);

  const handleRemoveLocation = useCallback(async (name) => {
    await removeLocation(name);
  }, [removeLocation]);

  const handleAddKeyword = useCallback(async (name, color) => {
    await addKeyword(name, color);
  }, [addKeyword]);

  const handleRemoveKeyword = useCallback(async (name) => {
    await removeKeyword(name);
  }, [removeKeyword]);

  // Auto-detect functionality
  const handleAutoDetect = useCallback(async () => {
    if (files.length === 0) {
      setError('No files loaded. Please fetch files first.');
      return;
    }

    setIsDetecting(true);
    try {
      const { autoDetectEntities } = await import('../lib/textParser');
      const suggestions = autoDetectEntities(files, characters, locations);
      setSuggestedCharacters(suggestions.characters);
      setSuggestedLocations(suggestions.locations);
      setSelectedCharacterNames(new Set());
      setSelectedLocationNames(new Set());
      setShowAutoDetect(true);
    } catch (err) {
      setError(`Failed to auto-detect: ${err.message}`);
    } finally {
      setIsDetecting(false);
    }
  }, [files, characters, locations]);

  // Toggle character selection
  const toggleCharacterSelection = useCallback((characterName) => {
    setSelectedCharacterNames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(characterName)) {
        newSet.delete(characterName);
      } else {
        newSet.add(characterName);
      }
      return newSet;
    });
  }, []);

  // Toggle location selection
  const toggleLocationSelection = useCallback((locationName) => {
    setSelectedLocationNames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationName)) {
        newSet.delete(locationName);
      } else {
        newSet.add(locationName);
      }
      return newSet;
    });
  }, []);

  // Add multiple characters at once
  const handleAddMultipleCharacters = useCallback(async (characterNames) => {
    const newCharacters = characterNames.filter(name => !characters.includes(name));
    if (newCharacters.length === 0) return;

    for (const name of newCharacters) {
      await addCharacter(name);
    }
  }, [characters, addCharacter]);

  // Add multiple locations at once
  const handleAddMultipleLocations = useCallback(async (locationNames) => {
    const newLocations = locationNames.filter(name => !locations.includes(name));
    if (newLocations.length === 0) return;

    for (const name of newLocations) {
      await addLocation(name);
    }
  }, [locations, addLocation]);

  // Handle character selection
  const handleCharacterSelect = useCallback((characterName) => {
    const dialogue = searchCharacterDialogue(characterName);
    const mentions = searchCharacterMentions(characterName);
    setSelectedCharacter({
      name: characterName,
      dialogue: dialogue,
      mentions: mentions,
      dialogueCount: dialogue.length,
      mentionCount: mentions.length,
      count: dialogue.length + mentions.length,
    });
  }, [searchCharacterDialogue, searchCharacterMentions]);

  // Handle location selection
  const handleLocationSelect = useCallback((locationName) => {
    const mentions = searchLocationMentions(locationName);
    const locationRegex = new RegExp(`\\b${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let totalMentions = 0;
    files.forEach(file => {
      const matches = file.content.match(locationRegex);
      if (matches) {
        totalMentions += matches.length;
      }
    });
    
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
  }, [searchLocationMentions, files]);

  // Handle sync (commit to GitHub) for any file
  const handleSync = useCallback(async (file) => {
    if (!file || !file.sha) {
      setSaveError('File information missing.');
      return;
    }

    if (!githubToken) {
      setSaveError('GitHub access token required.');
      return;
    }

    if (!commitMessage.trim()) {
      setSaveError('Please enter a commit message.');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const [owner, repoName] = repo.fullName.split('/');
      const path = file.path;
      const branch = repo.defaultBranch || 'main';
      
      let currentSha = file.sha;
      try {
        currentSha = await getFileSha(owner, repoName, path, branch, githubToken);
      } catch (shaError) {
        // Continue with existing SHA
      }
      
      let markdownContent;
      const editedContent = editedFileContent?.get(path);
      if (editedContent) {
        markdownContent = editedContent.markdown || htmlToMarkdown(editedContent.html);
      } else {
        markdownContent = file.content;
      }
      
      await updateFileContent(
        owner,
        repoName,
        path,
        markdownContent,
        currentSha,
        branch,
        commitMessage.trim(),
        githubToken
      );

      setFileStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(path, 'synced');
        return newMap;
      });

      if (onFileEdited) {
        onFileEdited(path, false, null);
      }

      try {
        await fetchFilesFromGitHub(true);
      } catch (fetchError) {
        // Failed to refresh files after sync
      }

      setShowSaveModal(false);
      setCommitMessage('');
      setFileToSync(null);
      alert('File synced successfully to GitHub!');
    } catch (error) {
      const errorMessage = error.message || 'Failed to sync file. Please try again.';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [repo, githubToken, commitMessage, editedFileContent, onFileEdited, fetchFilesFromGitHub]);

  // Handle fetch latest from GitHub for currently open file
  const handleFetchLatest = useCallback(async () => {
    if (!selectedBlog) {
      setFetchError('No file selected to fetch.');
      return;
    }

    if (!githubToken) {
      setFetchError('GitHub access token required.');
      return;
    }

    setIsFetching(true);
    setFetchError('');

    try {
      const [owner, repoName] = selectedBlog.repo.split('/');
      const path = selectedBlog.path;
      const branch = selectedBlog.branch || 'main';
      
      await fetchFileContent(owner, repoName, path, branch, githubToken);
      
      setFileStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(path, 'synced');
        return newMap;
      });

      alert('File fetched successfully from GitHub!');
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch file. Please try again.';
      setFetchError(errorMessage);
    } finally {
      setIsFetching(false);
    }
  }, [selectedBlog, githubToken]);

  // Memoize filtered results
  const filteredFiles = useMemo(() => 
    files.filter(file =>
      file.path.toLowerCase().includes(searchTerm.toLowerCase())
    ), [files, searchTerm]
  );

  const filteredCharacters = useMemo(() =>
    characters.filter(char =>
      char.toLowerCase().includes(searchTerm.toLowerCase())
    ), [characters, searchTerm]
  );

  const filteredLocations = useMemo(() =>
    locations.filter(loc =>
      loc.toLowerCase().includes(searchTerm.toLowerCase())
    ), [locations, searchTerm]
  );

  const filteredKeywords = useMemo(() =>
    keywords.filter(k =>
      k.word.toLowerCase().includes(searchTerm.toLowerCase())
    ), [keywords, searchTerm]
  );

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

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">StoryForge</h1>
          <div className="flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Back Button */}
      <div className="bg-slate-800 border-b border-slate-700 px-8 py-3">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>{repo.fullName.split('/')[0]}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Repo Title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white">{repo.name}</h2>
        </div>

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
                setError(`Failed to load repository data: ${err.message}`);
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
            {['files', 'characters', 'locations', 'keywords'].map((tab) => (
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
                {tab === 'keywords' && `(${keywords.length})`}
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
          <FilesTab
            files={filteredFiles}
            selectedBlog={selectedBlog}
            editedFiles={editedFiles}
            fileStatuses={fileStatuses}
            onFileSelect={(file) => {
              onFileSelect(file, characters, locations, keywords, handleAddCharacter, handleAddLocation, handleRemoveCharacter, handleRemoveLocation, handleAddKeyword, handleRemoveKeyword);
            }}
            characters={characters}
            locations={locations}
            keywords={keywords}
            onAddCharacter={handleAddCharacter}
            onAddLocation={handleAddLocation}
            onRemoveCharacter={handleRemoveCharacter}
            onRemoveLocation={handleRemoveLocation}
            onAddKeyword={handleAddKeyword}
            onRemoveKeyword={handleRemoveKeyword}
            fileToSync={fileToSync}
            setFileToSync={setFileToSync}
            setShowSaveModal={setShowSaveModal}
            handleFetchLatest={handleFetchLatest}
            isFetching={isFetching}
          />
        )}

        {activeTab === 'characters' && (
          <CharactersTab
            characters={filteredCharacters}
            newCharacterName={newCharacterName}
            setNewCharacterName={setNewCharacterName}
            characterDialogueCounts={characterDialogueCounts}
            characterMentionCounts={characterMentionCounts}
            onAddCharacter={handleAddCharacter}
            onRemoveCharacter={handleRemoveCharacter}
            onCharacterSelect={handleCharacterSelect}
            onAutoDetect={handleAutoDetect}
            isDetecting={isDetecting}
            filesLength={files.length}
          />
        )}

        {activeTab === 'locations' && (
          <LocationsTab
            locations={filteredLocations}
            newLocationName={newLocationName}
            setNewLocationName={setNewLocationName}
            locationMentionCounts={locationMentionCounts}
            onAddLocation={handleAddLocation}
            onRemoveLocation={handleRemoveLocation}
            onLocationSelect={handleLocationSelect}
            onAutoDetect={handleAutoDetect}
            isDetecting={isDetecting}
            filesLength={files.length}
          />
        )}

        {activeTab === 'keywords' && (
          <KeywordsTab
            keywords={filteredKeywords}
            newKeywordName={newKeywordName}
            setNewKeywordName={setNewKeywordName}
            files={files}
            onAddKeyword={handleAddKeyword}
            onRemoveKeyword={handleRemoveKeyword}
          />
        )}
      </main>

      {/* Auto-Detect Modal */}
      <AutoDetectModal
        showAutoDetect={showAutoDetect}
        setShowAutoDetect={setShowAutoDetect}
        suggestedCharacters={suggestedCharacters}
        suggestedLocations={suggestedLocations}
        selectedCharacterNames={selectedCharacterNames}
        selectedLocationNames={selectedLocationNames}
        toggleCharacterSelection={toggleCharacterSelection}
        toggleLocationSelection={toggleLocationSelection}
        onAddMultipleCharacters={handleAddMultipleCharacters}
        onAddMultipleLocations={handleAddMultipleLocations}
      />

      {/* Save Modal */}
      <SaveModal
        showSaveModal={showSaveModal}
        setShowSaveModal={setShowSaveModal}
        fileToSync={fileToSync}
        commitMessage={commitMessage}
        setCommitMessage={setCommitMessage}
        saveError={saveError}
        isSaving={isSaving}
        onSync={handleSync}
      />
    </div>
  );
};
