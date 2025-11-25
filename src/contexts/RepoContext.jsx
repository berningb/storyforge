import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { loadRepoData, saveRepoCharacters, saveRepoLocations, saveRepoKeywords } from '../lib/repoData';

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
  const [characters, setCharacters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [keywords, setKeywords] = useState([]);
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
        const data = await loadRepoData(currentUser.uid, repo.fullName);
        setCharacters(data.characters || []);
        setLocations(data.locations || []);
        setKeywords(data.keywords || []);
      } catch (err) {
        setError(`Failed to load repository data: ${err.message}`);
        console.error('Error loading repo data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repo?.fullName, currentUser?.uid]);

  // Add character
  const addCharacter = useCallback(async (characterName) => {
    if (!currentUser || !repo) return;
    
    const trimmedName = characterName.trim();
    if (!trimmedName || characters.includes(trimmedName)) return;

    const updatedCharacters = [...characters, trimmedName];
    setCharacters(updatedCharacters);
    
    try {
      await saveRepoCharacters(currentUser.uid, repo.fullName, updatedCharacters);
    } catch (error) {
      // Revert on error
      setCharacters(characters);
      throw error;
    }
  }, [currentUser, repo, characters]);

  // Remove character
  const removeCharacter = useCallback(async (characterName) => {
    if (!currentUser || !repo) return;

    const updatedCharacters = characters.filter(c => c !== characterName);
    setCharacters(updatedCharacters);
    
    try {
      await saveRepoCharacters(currentUser.uid, repo.fullName, updatedCharacters);
    } catch (error) {
      // Revert on error
      setCharacters(characters);
      throw error;
    }
  }, [currentUser, repo, characters]);

  // Add location
  const addLocation = useCallback(async (locationName) => {
    if (!currentUser || !repo) return;
    
    const trimmedName = locationName.trim();
    if (!trimmedName || locations.includes(trimmedName)) return;

    const updatedLocations = [...locations, trimmedName];
    setLocations(updatedLocations);
    
    try {
      await saveRepoLocations(currentUser.uid, repo.fullName, updatedLocations);
    } catch (error) {
      // Revert on error
      setLocations(locations);
      throw error;
    }
  }, [currentUser, repo, locations]);

  // Remove location
  const removeLocation = useCallback(async (locationName) => {
    if (!currentUser || !repo) return;

    const updatedLocations = locations.filter(l => l !== locationName);
    setLocations(updatedLocations);
    
    try {
      await saveRepoLocations(currentUser.uid, repo.fullName, updatedLocations);
    } catch (error) {
      // Revert on error
      setLocations(locations);
      throw error;
    }
  }, [currentUser, repo, locations]);

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
    } catch (error) {
      console.error('Error saving keywords:', error);
    } finally {
      isSavingKeywordsRef.current = false;
      
      if (pendingKeywordsSaveRef.current || hadPendingSave) {
        setTimeout(() => saveKeywordsWithQueue(), 100);
      }
    }
  }, [currentUser, repo]);

  // Add keyword
  const addKeyword = useCallback(async (keywordName, color = null) => {
    if (!currentUser || !repo) return;
    
    const trimmedName = (keywordName || '').trim().toLowerCase();
    if (!trimmedName) return;
    
    const keywordColor = color || { class: 'bg-purple-200', text: 'text-purple-800' };
    
    setKeywords(prev => {
      const existingIndex = prev.findIndex(k => k.word.toLowerCase() === trimmedName);
      
      if (existingIndex >= 0) {
        // Already exists - update color if provided
        const updated = prev.map((k, idx) => 
          idx === existingIndex ? { word: k.word, color: keywordColor || k.color } : k
        );
        keywordsRef.current = updated;
        return updated;
      }
      
      // New keyword
      const updated = [...prev, { word: trimmedName, color: keywordColor }];
      keywordsRef.current = updated;
      return updated;
    });
    
    // Save after state update
    setTimeout(() => {
      saveKeywordsWithQueue();
    }, 0);
  }, [currentUser, repo, saveKeywordsWithQueue]);

  // Remove keyword
  const removeKeyword = useCallback(async (keywordName) => {
    if (!currentUser || !repo) return;
    
    const normalizedName = keywordName.toLowerCase();
    
    setKeywords(prev => {
      const filtered = prev.filter(k => k.word.toLowerCase() !== normalizedName);
      keywordsRef.current = filtered;
      return filtered;
    });
    
    // Save after state update
    setTimeout(() => {
      saveKeywordsWithQueue();
    }, 0);
  }, [currentUser, repo, saveKeywordsWithQueue]);

  const value = {
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

