import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRepo } from '../contexts/RepoContext';
import { fetchFileContent, updateFileContent, getFileSha } from '../lib/github';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { CharacterDetailPage } from './CharacterDetailPage';
import { LocationDetailPage } from './LocationDetailPage';
import { CollectionDetailPage } from './CollectionDetailPage';
import { ItemDetailPage } from './ItemDetailPage';
import { htmlToMarkdown } from '@react-quill/lib';
import { useRepoData } from '../hooks/useRepoData';
import { useEntitySearch } from '../hooks/useEntitySearch';
import { FilesTab } from '../components/RepoAnalysis/FilesTab';
import { CharactersTab } from '../components/RepoAnalysis/CharactersTab';
import { LocationsTab } from '../components/RepoAnalysis/LocationsTab';
import { KeywordsTab } from '../components/RepoAnalysis/KeywordsTab';
import { AutoDetectModal } from '../components/RepoAnalysis/AutoDetectModal';
import { SaveModal } from '../components/RepoAnalysis/SaveModal';

// Helper to convert Tailwind class to hex (for backward compatibility)
const tailwindToHex = (tailwindClass) => {
  const colorMap = {
    'bg-purple-200': '#e9d5ff',
    'bg-green-200': '#bbf7d0',
    'bg-orange-200': '#fed7aa',
    'bg-blue-200': '#bfdbfe',
    'bg-pink-200': '#fce7f3',
    'bg-yellow-200': '#fef08a',
    'bg-cyan-200': '#a5f3fc',
    'bg-indigo-200': '#c7d2fe',
    'bg-gray-200': '#e5e7eb',
  };
  return colorMap[tailwindClass] || '#e5e7eb';
};

// Helper to get hex from color config (supports both hex and Tailwind)
const getColorHex = (colorConfig) => {
  if (!colorConfig) return '#e5e7eb';
  if (colorConfig.hex) return colorConfig.hex;
  if (colorConfig.bg && colorConfig.bg.startsWith('#')) return colorConfig.bg;
  if (colorConfig.bg) return tailwindToHex(colorConfig.bg);
  return '#e5e7eb';
};

// Helper function to convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Helper function to calculate luminance and determine if text should be dark or light
const getTextColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  
  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export const RepoAnalysisPage = ({ repo, onFileSelect, onBack, selectedBlog, editedFiles, editedFileContent, onFileEdited }) => {
  const { currentUser, githubToken } = useAuth();
  const { 
    collections,
    addToCollection,
    removeFromCollection,
    createCollection,
    deleteCollection,
    updateCollectionConfig,
    // Backward compatibility
    characters, 
    locations, 
    keywords, 
    addCharacter, 
    removeCharacter, 
    addLocation, 
    removeLocation, 
    addKeyword, 
    removeKeyword 
  } = useRepo();
  const [activeTab, setActiveTab] = useState('files');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
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
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollectionForView, setSelectedCollectionForView] = useState(null);
  const [editingCollectionName, setEditingCollectionName] = useState(null);
  const [editingCollectionDisplayName, setEditingCollectionDisplayName] = useState('');
  const editingInputRef = useRef(null);

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

  const { searchCharacterDialogue, searchCharacterMentions, searchLocationMentions, searchItemDialogue, searchItemMentions } = useEntitySearch(files, characters);

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

  // Create a new collection
  const handleCreateCollection = useCallback(async () => {
    if (!newCollectionName.trim()) return;
    
    const collectionName = newCollectionName.trim().toLowerCase().replace(/\s+/g, '-');
    
    if (collections[collectionName]) {
      alert(`Collection "${collectionName}" already exists`);
      return;
    }

    try {
      await createCollection(collectionName, {
        name: newCollectionName.trim(),
        color: { 
          bg: 'bg-gray-200', 
          text: 'text-gray-800', 
          border: 'border-gray-300', 
          bgDark: 'bg-gray-900/20', 
          borderDark: 'border-gray-700/50' 
        },
        icon: 'default',
      });
      setNewCollectionName('');
      setShowCollectionManager(false);
    } catch (error) {
      alert(`Failed to create collection: ${error.message}`);
    }
  }, [newCollectionName, collections, createCollection]);

  // Handle collection rename
  const handleStartRename = useCallback((collectionName, currentName) => {
    setEditingCollectionName(collectionName);
    setEditingCollectionDisplayName(currentName);
    setTimeout(() => {
      editingInputRef.current?.focus();
    }, 0);
  }, []);

  const handleSaveRename = useCallback(async (collectionName) => {
    if (!editingCollectionDisplayName.trim()) {
      setEditingCollectionName(null);
      return;
    }
    try {
      await updateCollectionConfig(collectionName, { name: editingCollectionDisplayName.trim() });
      setEditingCollectionName(null);
      setEditingCollectionDisplayName('');
    } catch (error) {
      alert(`Failed to rename collection: ${error.message}`);
    }
  }, [editingCollectionDisplayName, updateCollectionConfig]);

  const handleCancelRename = useCallback(() => {
    setEditingCollectionName(null);
    setEditingCollectionDisplayName('');
  }, []);

  // Handle collection color change
  const handleColorChange = useCallback(async (collectionName, hex) => {
    const textColorHex = getTextColor(hex);
    try {
      await updateCollectionConfig(collectionName, { 
        color: { 
          hex: hex,
          bg: hex,
          text: textColorHex,
        } 
      });
    } catch (error) {
      alert(`Failed to update color: ${error.message}`);
    }
  }, [updateCollectionConfig]);

  // Handle collection deletion
  const handleDeleteCollection = useCallback(async (collectionName) => {
    const collection = collections[collectionName];
    const config = collection?.config || {};
    const displayName = config.name || collectionName;
    
    if (!confirm(`Are you sure you want to delete the "${displayName}" collection?`)) {
      return;
    }

    try {
      await deleteCollection(collectionName);
    } catch (error) {
      alert(`Failed to delete collection: ${error.message}`);
    }
  }, [collections, deleteCollection]);

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

  // Handle item selection (for any collection item)
  const handleItemSelect = useCallback((itemName, collectionName) => {
    const dialogue = searchItemDialogue(itemName);
    const mentions = searchItemMentions(itemName);
    setSelectedItem({
      name: itemName,
      dialogue: dialogue,
      mentions: mentions,
      dialogueCount: dialogue.length,
      mentionCount: mentions.length,
      collectionName: collectionName,
    });
  }, [searchItemDialogue, searchItemMentions]);

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

  // Build breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (!repo || !onBack) return [];
    
    const crumbs = [];
    
    // First crumb: Repos (clickable, goes back to repo selection)
    crumbs.push({
      label: repo.fullName.split('/')[0],
      onClick: onBack,
      isCurrent: false,
    });
    
    // Second crumb: Repo name (current, bigger)
    crumbs.push({
      label: repo.fullName.split('/')[1] || repo.fullName,
      onClick: undefined,
      isCurrent: true,
    });
    
    return crumbs;
  }, [repo, onBack]);

  // If a character is selected, show character detail page
  if (selectedCharacter) {
    return (
      <CharacterDetailPage
        character={selectedCharacter}
        onBack={() => setSelectedCharacter(null)}
        repoOwner={repoOwner}
        onNavigateToRepo={handleNavigateToRepo}
        onNavigateToTab={handleNavigateToTab}
      />
    );
  }

  // If a location is selected, show location detail page
  if (selectedLocation) {
    return (
      <LocationDetailPage
        location={selectedLocation}
        onBack={() => setSelectedLocation(null)}
        repoOwner={repoOwner}
        onNavigateToRepo={handleNavigateToRepo}
        onNavigateToTab={handleNavigateToTab}
      />
    );
  }

  // Get repo owner for breadcrumbs
  const repoOwner = repo?.fullName ? repo.fullName.split('/')[0] : null;

  // Navigation handlers for breadcrumbs
  const handleNavigateToRepo = () => {
    onBack();
  };

  const handleNavigateToTab = () => {
    setActiveTab('collections');
    setSelectedCollection(null);
    setSelectedItem(null);
  };

  const handleNavigateToCollection = (collectionName) => {
    setSelectedCollection(collectionName);
    setSelectedItem(null);
  };

  // If an item is selected, show item detail page (check before collection so item page takes precedence)
  if (selectedItem) {
    return (
      <ItemDetailPage
        item={selectedItem}
        repoOwner={repoOwner}
        activeTab={activeTab}
        onBack={() => {
          setSelectedItem(null);
          // If there's a collection, we'll return to it on next render
        }}
        onNavigateToRepo={handleNavigateToRepo}
        onNavigateToTab={handleNavigateToTab}
        onNavigateToCollection={selectedItem.collectionName ? () => handleNavigateToCollection(selectedItem.collectionName) : null}
      />
    );
  }

  // If a collection is selected, show collection detail page
  if (selectedCollection) {
    return (
      <CollectionDetailPage
        collectionName={selectedCollection}
        repoOwner={repoOwner}
        activeTab={activeTab}
        onBack={() => setSelectedCollection(null)}
        searchItemDialogue={searchItemDialogue}
        searchItemMentions={searchItemMentions}
        onNavigateToRepo={handleNavigateToRepo}
        onNavigateToTab={handleNavigateToTab}
        onItemClick={(itemData) => {
          // Handle both object (from CollectionDetailPage with search functions) and string (fallback)
          if (typeof itemData === 'object' && itemData.name) {
            setSelectedItem(itemData);
          } else {
            // Fallback: treat as string and build item object
            const itemName = typeof itemData === 'string' ? itemData : itemData.name || itemData;
            const dialogue = searchItemDialogue(itemName);
            const mentions = searchItemMentions(itemName);
            setSelectedItem({
              name: itemName,
              dialogue: dialogue,
              mentions: mentions,
              dialogueCount: dialogue.length,
              mentionCount: mentions.length,
              collectionName: selectedCollection,
            });
          }
        }}
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
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
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
          <div className="flex gap-2 border-b border-slate-700 overflow-x-auto">
            {['files', 'collections'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchTerm('');
                  if (tab === 'collections') {
                    setSelectedCollectionForView(null);
                    setSelectedCollection(null);
                  }
                }}
                className={`px-6 py-3 font-medium transition-colors capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab} {tab === 'files' && `(${files.length})`}
                {tab === 'collections' && `(${Object.keys(collections).length})`}
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

        {activeTab === 'collections' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Collections</h2>
              <button
                onClick={() => setShowCollectionManager(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Collection
              </button>
            </div>

            {selectedCollectionForView ? (
              <div>
                <button
                  onClick={() => setSelectedCollectionForView(null)}
                  className="mb-4 text-slate-400 hover:text-white flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Collections
                </button>
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold mb-4">
                    {collections[selectedCollectionForView]?.config?.name || selectedCollectionForView}
                  </h3>
                  <div className="space-y-2">
                    {collections[selectedCollectionForView]?.items.length > 0 ? (
                      collections[selectedCollectionForView].items.map((item, idx) => {
                        const displayText = typeof item === 'string' ? item : (item.word || String(item));
                        const isCharacterCollection = selectedCollectionForView === 'characters';
                        const isLocationCollection = selectedCollectionForView === 'locations';
                        
                        // Get stats for this item using searchItemDialogue and searchItemMentions for all items
                        const dialogue = searchItemDialogue(displayText);
                        const mentions = searchItemMentions(displayText);
                        const dialogueCount = dialogue.length;
                        const mentionCount = mentions.length;
                        
                        const handleItemClick = () => {
                          if (isCharacterCollection) {
                            handleCharacterSelect(displayText);
                          } else if (isLocationCollection) {
                            handleLocationSelect(displayText);
                          } else {
                            // Use handleItemSelect for other collection types
                            handleItemSelect(displayText, selectedCollectionForView);
                          }
                        };
                        
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-slate-700 p-3 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors"
                            onClick={handleItemClick}
                          >
                            <div className="flex-1">
                              <span className="text-white font-medium">{displayText}</span>
                              {(dialogueCount > 0 || mentionCount > 0) && (
                                <div className="flex gap-4 mt-1">
                                  {dialogueCount > 0 && (
                                    <span className="text-xs text-purple-400">
                                      {dialogueCount} dialogue
                                    </span>
                                  )}
                                  {mentionCount > 0 && (
                                    <span className="text-xs text-blue-400">
                                      {mentionCount} mentions
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await removeFromCollection(selectedCollectionForView, displayText);
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors ml-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-slate-400">No items in this collection</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(collections)
                  .filter(([collectionName]) => {
                    if (!searchTerm) return true;
                    const collection = collections[collectionName];
                    const config = collection.config || {};
                    const name = (config.name || collectionName).toLowerCase();
                    return name.includes(searchTerm.toLowerCase());
                  })
                  .map(([collectionName, collection]) => {
                    const config = collection.config || {};
                    const isCharacterCollection = collectionName === 'characters';
                    const isLocationCollection = collectionName === 'locations';
                    const isKeywordCollection = collectionName === 'keywords';
                    
                    // Get stats for characters
                    let dialogueCount = 0;
                    let mentionCount = 0;
                    if (isCharacterCollection) {
                      collection.items.forEach((charName) => {
                        dialogueCount += characterDialogueCounts.get(charName) || 0;
                        mentionCount += characterMentionCounts.get(charName) || 0;
                      });
                    }
                    
                    // Get stats for locations
                    let locationMentionCount = 0;
                    if (isLocationCollection) {
                      collection.items.forEach((locName) => {
                        locationMentionCount += locationMentionCounts.get(locName) || 0;
                      });
                    }
                    
                    const handleCardClick = () => {
                      // Navigate to collection detail page
                      setSelectedCollection(collectionName);
                    };
                    
                    const displayName = config.name || collectionName;
                    const isEditing = editingCollectionName === collectionName;
                    const currentColorHex = getColorHex(config.color);
                    
                    return (
                      <div
                        key={collectionName}
                        className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-purple-500 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1" onClick={handleCardClick}>
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  ref={editingCollectionName === collectionName ? editingInputRef : null}
                                  type="text"
                                  value={editingCollectionDisplayName}
                                  onChange={(e) => setEditingCollectionDisplayName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveRename(collectionName);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      handleCancelRename();
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveRename(collectionName);
                                  }}
                                  className="text-green-400 hover:text-green-300 transition-colors"
                                  title="Save"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelRename();
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Cancel"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <h3 className="text-lg font-semibold text-white hover:text-purple-400 transition-colors cursor-pointer">
                                {displayName}
                              </h3>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
                            {/* Color Picker */}
                            <div className="relative">
                              <input
                                type="color"
                                value={currentColorHex}
                                onChange={(e) => handleColorChange(collectionName, e.target.value)}
                                className="absolute opacity-0 w-0 h-0"
                                id={`color-picker-${collectionName}`}
                              />
                              <label
                                htmlFor={`color-picker-${collectionName}`}
                                className="h-8 w-8 rounded border-2 border-slate-600 cursor-pointer block hover:border-purple-400 transition-colors"
                                style={{ backgroundColor: currentColorHex }}
                                title="Change color"
                              />
                            </div>
                            {/* Rename Button */}
                            {!isEditing && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename(collectionName, displayName);
                                }}
                                className="text-slate-400 hover:text-white transition-colors"
                                title="Rename collection"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {/* Delete Button */}
                            {!isEditing && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCollection(collectionName);
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Delete collection"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div onClick={handleCardClick} className="cursor-pointer">
                          <p className="text-slate-400 text-sm">
                            {collection.items.length} {collection.items.length === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
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

      {/* Collection Manager Modal */}
      {showCollectionManager && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCollectionManager(false);
            setNewCollectionName('');
          }}
        >
          <div 
            className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Create New Collection</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Collection Name</label>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., items, houses, phrases"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newCollectionName.trim()) {
                    handleCreateCollection();
                  }
                }}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCollectionManager(false);
                  setNewCollectionName('');
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
