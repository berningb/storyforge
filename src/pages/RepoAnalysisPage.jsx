import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRepo } from '../contexts/RepoContext';
import { fetchFileContent, updateFileContent, getFileSha } from '../lib/github';
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
import { FolderTree } from '../components/RepoAnalysis/FolderTree';
import { buildFolderTree, getFilesInPath } from '../utils/folderTree';
import { PageHeader } from '../components/Shared/PageHeader';
import { CollectionCards } from '../components/RepoAnalysis/CollectionCards';
import { CollectionView } from '../components/RepoAnalysis/CollectionView';
import { getColorHex, getTextColor } from '../utils/colorUtils';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';

export const RepoAnalysisPage = ({ repo, onFileSelect, onImageSelect, onBack, selectedBlog, editedFiles, editedFileContent, onFileEdited }) => {
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
  const [selectedFolderPath, setSelectedFolderPath] = useState('');
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

  // Build folder tree from files
  const folderTree = useMemo(() => {
    if (!files || files.length === 0) {
      return { folders: {}, files: [] };
    }
    return buildFolderTree(files);
  }, [files]);

  // Memoize filtered results - filter by folder path first, then by search term
  const filteredFiles = useMemo(() => {
    let filtered = files;
    
    // Filter by selected folder path
    if (selectedFolderPath) {
      // Filter files that are directly in the selected folder (not in subfolders)
      filtered = files.filter(file => {
        if (!file.path) return false;
        const filePathParts = file.path.split('/');
        filePathParts.pop(); // Remove filename
        const fileFolderPath = filePathParts.join('/');
        
        // File must be directly in the selected folder
        // So the folder path must match exactly
        return fileFolderPath === selectedFolderPath;
      });
    }
    // When no folder is selected (selectedFolderPath is empty/falsy), show all files
    
    // Remove duplicates based on file path
    const seenPaths = new Set();
    filtered = filtered.filter(file => {
      if (seenPaths.has(file.path)) {
        return false;
      }
      seenPaths.add(file.path);
      return true;
    });
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(file =>
        file.path.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [files, selectedFolderPath, searchTerm]);

  const breadcrumbs = useBreadcrumbs({ repo, onBack });

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

  const handleNavigateToCollection = useCallback((collectionName) => {
    setSelectedCollection(collectionName);
    setSelectedItem(null);
  }, []);

  // Handle collection card click
  const handleCollectionCardClick = useCallback((collectionName, e) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target;
    
    // Check if click originated from a button, input, or label
    const clickedButton = target.closest('button');
    const clickedInput = target.closest('input');
    const clickedLabel = target.closest('label');
    
    if (clickedButton || clickedInput || clickedLabel) {
      return;
    }
    
    // Navigate to collection detail page
    setSelectedCollection(collectionName);
  }, []);

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
      <PageHeader breadcrumbs={breadcrumbs} currentUser={currentUser} />

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
                  setSelectedFolderPath(''); // Clear folder selection when switching tabs
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

        {/* Folder Tree - only show for files tab */}
        {activeTab === 'files' && (
          <FolderTree
            tree={folderTree}
            selectedPath={selectedFolderPath}
            onPathSelect={(path) => {
              setSelectedFolderPath(path);
              setSearchTerm(''); // Clear search when changing folders
            }}
          />
        )}

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
            onImageSelect={onImageSelect}
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
              <CollectionView
                collectionName={selectedCollectionForView}
                collection={collections[selectedCollectionForView]}
                searchItemDialogue={searchItemDialogue}
                searchItemMentions={searchItemMentions}
                isCharacterCollection={selectedCollectionForView === 'characters'}
                isLocationCollection={selectedCollectionForView === 'locations'}
                onBack={() => setSelectedCollectionForView(null)}
                onItemClick={() => {}}
                onRemoveItem={removeFromCollection}
                onCharacterSelect={handleCharacterSelect}
                onLocationSelect={handleLocationSelect}
                onItemSelect={handleItemSelect}
              />
            ) : (
              <CollectionCards
                collections={collections}
                searchTerm={searchTerm}
                characterDialogueCounts={characterDialogueCounts}
                characterMentionCounts={characterMentionCounts}
                locationMentionCounts={locationMentionCounts}
                searchItemDialogue={searchItemDialogue}
                searchItemMentions={searchItemMentions}
                editingCollectionName={editingCollectionName}
                editingCollectionDisplayName={editingCollectionDisplayName}
                setEditingCollectionDisplayName={setEditingCollectionDisplayName}
                editingInputRef={editingInputRef}
                onCollectionClick={handleCollectionCardClick}
                onColorChange={handleColorChange}
                onStartRename={handleStartRename}
                onSaveRename={handleSaveRename}
                onCancelRename={handleCancelRename}
                onDeleteCollection={handleDeleteCollection}
                onCharacterSelect={handleCharacterSelect}
                onLocationSelect={handleLocationSelect}
                onItemSelect={handleItemSelect}
              />
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
