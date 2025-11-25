import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { loadRepoData, saveRepoCharacters, saveRepoLocations, saveRepoKeywords, loadRepoEntityCollections, saveRepoEntityCollections, saveRepoEntityCollection } from '../lib/repoData';

const RepoContext = createContext(null);

export const useRepo = () => {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error('useRepo must be used within a RepoProvider');
  }
  return context;
};

export const RepoProvider = ({ repo, children }) => {
  const { currentUser } = useAuth();
  const [collections, setCollections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load repository data from database
  useEffect(() => {
    const loadData = async () => {
      if (!repo || !currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const loadedCollections = await loadRepoEntityCollections(currentUser.uid, repo.fullName);
        setCollections(loadedCollections);
      } catch (err) {
        setError(`Failed to load repository data: ${err.message}`);
        console.error('Error loading repo data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repo?.fullName, currentUser?.uid]);

  // Backward compatibility: expose characters, locations, keywords as separate arrays
  const characters = collections.characters?.items || [];
  const locations = collections.locations?.items || [];
  const keywords = collections.keywords?.items || [];

  // Generic collection operations
  const addToCollection = useCallback(async (collectionName, item) => {
    if (!currentUser || !repo) return;
    
    return new Promise((resolve, reject) => {
      setCollections(prevCollections => {
        const collection = prevCollections[collectionName];
        if (!collection) {
          reject(new Error(`Collection "${collectionName}" does not exist`));
          return prevCollections;
        }

        // Normalize the item to add
        let normalizedItem;
        let itemToAdd;
        if (typeof item === 'string') {
          normalizedItem = item.trim().toLowerCase();
          itemToAdd = item.trim();
        } else if (item && typeof item === 'object' && item.word) {
          normalizedItem = item.word.trim().toLowerCase();
          itemToAdd = item; // Keep the object as-is
        } else {
          normalizedItem = String(item).trim().toLowerCase();
          itemToAdd = String(item).trim();
        }
        
        if (!normalizedItem) {
          resolve();
          return prevCollections;
        }

        // Check if item already exists
        const exists = collection.items.some(i => {
          if (typeof i === 'string') return i.toLowerCase().trim() === normalizedItem;
          if (typeof i === 'object' && i.word) return i.word.toLowerCase().trim() === normalizedItem;
          return false;
        });
        if (exists) {
          resolve();
          return prevCollections;
        }

        const updatedItems = [...collection.items, itemToAdd];
        const updatedCollections = {
          ...prevCollections,
          [collectionName]: {
            ...collection,
            items: updatedItems,
          }
        };

        // Save asynchronously
        saveRepoEntityCollection(currentUser.uid, repo.fullName, collectionName, updatedItems, collection.config)
          .then(() => resolve())
          .catch(error => {
            // Revert on error
            setCollections(prevCollections);
            reject(error);
          });

        return updatedCollections;
      });
    });
  }, [currentUser, repo]);

  const removeFromCollection = useCallback(async (collectionName, item) => {
    if (!currentUser || !repo) return;

    return new Promise((resolve, reject) => {
      setCollections(prevCollections => {
        const collection = prevCollections[collectionName];
        if (!collection) {
          resolve();
          return prevCollections;
        }

        // Normalize the item to match against
        let normalizedItem;
        if (typeof item === 'string') {
          normalizedItem = item.toLowerCase().trim();
        } else if (item && typeof item === 'object' && item.word) {
          normalizedItem = item.word.toLowerCase().trim();
        } else {
          // Fallback: try to convert to string
          normalizedItem = String(item).toLowerCase().trim();
        }

        // Filter out the matching item
        const updatedItems = collection.items.filter(i => {
          if (typeof i === 'string') {
            return i.toLowerCase().trim() !== normalizedItem;
          }
          if (typeof i === 'object' && i.word) {
            return i.word.toLowerCase().trim() !== normalizedItem;
          }
          return true; // Keep items that don't match the pattern
        });

        // Only update if something actually changed
        if (updatedItems.length === collection.items.length) {
          resolve(); // No change
          return prevCollections;
        }

        const updatedCollections = {
          ...prevCollections,
          [collectionName]: {
            ...collection,
            items: updatedItems,
          }
        };

        // Save asynchronously
        saveRepoEntityCollection(currentUser.uid, repo.fullName, collectionName, updatedItems, collection.config)
          .then(() => resolve())
          .catch(error => {
            // Revert on error
            setCollections(prevCollections);
            reject(error);
          });

        return updatedCollections;
      });
    });
  }, [currentUser, repo]);

  // Create a new collection
  const createCollection = useCallback(async (collectionName, config) => {
    if (!currentUser || !repo) return;
    
    if (collections[collectionName]) {
      throw new Error(`Collection "${collectionName}" already exists`);
    }

    const defaultConfig = {
      name: collectionName.charAt(0).toUpperCase() + collectionName.slice(1),
      color: { bg: 'bg-gray-200', text: 'text-gray-800', border: 'border-gray-300', bgDark: 'bg-gray-900/20', borderDark: 'border-gray-700/50' },
      icon: 'default',
      ...config,
    };

    const updatedCollections = {
      ...collections,
      [collectionName]: {
        items: [],
        config: defaultConfig,
      }
    };
    
    setCollections(updatedCollections);
    
    try {
      await saveRepoEntityCollections(currentUser.uid, repo.fullName, updatedCollections);
    } catch (error) {
      // Revert on error
      setCollections(collections);
      throw error;
    }
  }, [currentUser, repo, collections]);

  // Delete a collection
  const deleteCollection = useCallback(async (collectionName) => {
    if (!currentUser || !repo) return;
    
    // Don't allow deleting default collections
    if (['characters', 'locations', 'keywords'].includes(collectionName)) {
      throw new Error('Cannot delete default collections');
    }

    const updatedCollections = { ...collections };
    delete updatedCollections[collectionName];
    
    setCollections(updatedCollections);
    
    try {
      await saveRepoEntityCollections(currentUser.uid, repo.fullName, updatedCollections);
    } catch (error) {
      // Revert on error
      setCollections(collections);
      throw error;
    }
  }, [currentUser, repo, collections]);

  // Update collection config
  const updateCollectionConfig = useCallback(async (collectionName, config) => {
    if (!currentUser || !repo) return;
    
    const collection = collections[collectionName];
    if (!collection) return;

    const updatedCollections = {
      ...collections,
      [collectionName]: {
        ...collection,
        config: { ...collection.config, ...config },
      }
    };
    
    setCollections(updatedCollections);
    
    try {
      await saveRepoEntityCollections(currentUser.uid, repo.fullName, updatedCollections);
    } catch (error) {
      // Revert on error
      setCollections(collections);
      throw error;
    }
  }, [currentUser, repo, collections]);

  // Backward compatibility: Add character
  const addCharacter = useCallback(async (characterName) => {
    await addToCollection('characters', characterName);
    // Also save in old format for backward compatibility
    if (currentUser && repo) {
      const updatedCharacters = [...characters, characterName.trim()];
      await saveRepoCharacters(currentUser.uid, repo.fullName, updatedCharacters);
    }
  }, [addToCollection, currentUser, repo, characters]);

  // Backward compatibility: Remove character
  const removeCharacter = useCallback(async (characterName) => {
    await removeFromCollection('characters', characterName);
    // Also save in old format for backward compatibility
    if (currentUser && repo) {
      const updatedCharacters = characters.filter(c => c !== characterName);
      await saveRepoCharacters(currentUser.uid, repo.fullName, updatedCharacters);
    }
  }, [removeFromCollection, currentUser, repo, characters]);

  // Backward compatibility: Add location
  const addLocation = useCallback(async (locationName) => {
    await addToCollection('locations', locationName);
    // Also save in old format for backward compatibility
    if (currentUser && repo) {
      const updatedLocations = [...locations, locationName.trim()];
      await saveRepoLocations(currentUser.uid, repo.fullName, updatedLocations);
    }
  }, [addToCollection, currentUser, repo, locations]);

  // Backward compatibility: Remove location
  const removeLocation = useCallback(async (locationName) => {
    await removeFromCollection('locations', locationName);
    // Also save in old format for backward compatibility
    if (currentUser && repo) {
      const updatedLocations = locations.filter(l => l !== locationName);
      await saveRepoLocations(currentUser.uid, repo.fullName, updatedLocations);
    }
  }, [removeFromCollection, currentUser, repo, locations]);

  // Track if a save is in progress for keywords
  const isSavingKeywordsRef = useRef(false);
  const pendingKeywordsSaveRef = useRef(null);
  const keywordsRef = useRef([...keywords]);

  // Sync keywords ref when keywords change
  useEffect(() => {
    keywordsRef.current = [...keywords];
  }, [keywords]);

  // Helper function to save keywords with queue support
  const saveKeywordsWithQueue = useCallback(async () => {
    if (!currentUser || !repo) return;
    
    if (isSavingKeywordsRef.current) {
      pendingKeywordsSaveRef.current = true;
      return;
    }
    
    isSavingKeywordsRef.current = true;
    const hadPendingSave = pendingKeywordsSaveRef.current;
    pendingKeywordsSaveRef.current = false;
    
    const keywordsToSave = keywordsRef.current;
    
    try {
      await saveRepoKeywords(currentUser.uid, repo.fullName, keywordsToSave);
      // Also save in new format
      await saveRepoEntityCollection(currentUser.uid, repo.fullName, 'keywords', keywordsToSave, collections.keywords?.config);
    } catch (error) {
      console.error('Error saving keywords:', error);
    } finally {
      isSavingKeywordsRef.current = false;
      
      if (pendingKeywordsSaveRef.current || hadPendingSave) {
        setTimeout(() => saveKeywordsWithQueue(), 100);
      }
    }
  }, [currentUser, repo, collections.keywords?.config]);

  // Backward compatibility: Add keyword
  const addKeyword = useCallback(async (keywordName, color = null) => {
    if (!currentUser || !repo) return;
    
    const trimmedName = (keywordName || '').trim().toLowerCase();
    if (!trimmedName) return;
    
    const keywordColor = color || { class: 'bg-purple-200', text: 'text-purple-800' };
    
    const keywordCollection = collections.keywords || { items: [], config: { name: 'Keywords', color: { bg: 'bg-slate-700', text: 'text-slate-200', border: 'border-slate-600', bgDark: 'bg-slate-900/50', borderDark: 'border-slate-600/50' }, icon: 'keyword', supportsColors: true } };
    
    setCollections(prev => {
      const keywords = prev.keywords?.items || [];
      const existingIndex = keywords.findIndex(k => k.word.toLowerCase() === trimmedName);
      
      if (existingIndex >= 0) {
        // Already exists - update color if provided
        const updated = keywords.map((k, idx) => 
          idx === existingIndex ? { word: k.word, color: keywordColor || k.color } : k
        );
        keywordsRef.current = updated;
        return {
          ...prev,
          keywords: {
            ...keywordCollection,
            items: updated,
          }
        };
      }
      
      // New keyword
      const updated = [...keywords, { word: trimmedName, color: keywordColor }];
      keywordsRef.current = updated;
      return {
        ...prev,
        keywords: {
          ...keywordCollection,
          items: updated,
        }
      };
    });
    
    // Save after state update
    setTimeout(() => {
      saveKeywordsWithQueue();
    }, 0);
  }, [currentUser, repo, saveKeywordsWithQueue, collections.keywords]);

  // Backward compatibility: Remove keyword
  const removeKeyword = useCallback(async (keywordName) => {
    if (!currentUser || !repo) return;
    
    const normalizedName = keywordName.toLowerCase();
    
    setCollections(prev => {
      const keywords = prev.keywords?.items || [];
      const filtered = keywords.filter(k => k.word.toLowerCase() !== normalizedName);
      keywordsRef.current = filtered;
      return {
        ...prev,
        keywords: {
          ...prev.keywords,
          items: filtered,
        }
      };
    });
    
    // Save after state update
    setTimeout(() => {
      saveKeywordsWithQueue();
    }, 0);
  }, [currentUser, repo, saveKeywordsWithQueue]);

  const value = {
    // New dynamic collections API
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
    loading,
    error,
    addCharacter,
    removeCharacter,
    addLocation,
    removeLocation,
    addKeyword,
    removeKeyword,
  };

  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
};

