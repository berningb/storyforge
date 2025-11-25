import { useState, useCallback, useRef, useEffect } from 'react';
import { saveRepoCharacters, saveRepoLocations, saveRepoKeywords } from '../lib/repoData';
import { extractDialogue, autoDetectEntities } from '../lib/textParser';

export const useEntityHandlers = ({
  currentUser,
  repo,
  files,
  characters,
  setCharacters,
  locations,
  setLocations,
  keywords,
  setKeywords,
  setCharacterDialogueCounts,
  setCharacterMentionCounts,
  setLocationMentionCounts,
  setError,
  searchCharacterDialogue,
}) => {
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newKeywordName, setNewKeywordName] = useState('');
  const [showAutoDetect, setShowAutoDetect] = useState(false);
  const [suggestedCharacters, setSuggestedCharacters] = useState([]);
  const [suggestedLocations, setSuggestedLocations] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedCharacterNames, setSelectedCharacterNames] = useState(new Set());
  const [selectedLocationNames, setSelectedLocationNames] = useState(new Set());
  
  // Use ref to track latest keywords for saving
  // We update the ref manually in setKeywords callbacks to ensure we have the latest
  // Don't auto-sync from props to avoid overwriting local changes
  const keywordsRef = useRef([...keywords]);
  
  // Only sync ref on initial mount or when keywords prop is significantly different (reload scenario)
  useEffect(() => {
    // Check if this looks like an initial load or external update
    // If ref is empty or prop has keywords not in ref, sync it
    if (!keywordsRef.current || keywordsRef.current.length === 0) {
      keywordsRef.current = [...keywords];
    } else {
      const refWords = new Set(keywordsRef.current.map(k => k.word.toLowerCase()));
      const propWords = new Set(keywords.map(k => k.word.toLowerCase()));
      const propHasNewWords = Array.from(propWords).some(word => !refWords.has(word));
      
      // Only sync if prop has keywords we don't have (external update/reload)
      if (propHasNewWords && keywords.length >= keywordsRef.current.length) {
        keywordsRef.current = [...keywords];
      }
    }
  }, [keywords]);
  
  // Track if a save is in progress
  const isSavingKeywordsRef = useRef(false);
  const pendingKeywordsSaveRef = useRef(null);

  // Add a new character
  const handleAddCharacter = async (characterName = null) => {
    const trimmedName = (characterName || newCharacterName).trim();
    if (!trimmedName) return;
    
    if (!characters.includes(trimmedName)) {
      const updatedCharacters = [...characters, trimmedName];
      setCharacters(updatedCharacters);
      if (!characterName) {
        setNewCharacterName('');
      }
      
      // Calculate dialogue count immediately when character is added
      const dialogue = searchCharacterDialogue(trimmedName);
      setCharacterDialogueCounts(prev => {
        const newMap = new Map(prev);
        newMap.set(trimmedName, dialogue.length);
        return newMap;
      });
      
      // Calculate mention count
      const escapedCharacter = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const characterRegex = new RegExp(`\\b${escapedCharacter}\\b`, 'gi');
      let mentionCount = 0;

      files.forEach(file => {
        const cleanText = file.content.replace(/<[^>]*>/g, ' ');
        const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);

        sentences.forEach(sentence => {
          characterRegex.lastIndex = 0;
          if (characterRegex.test(sentence)) {
            const isDialogue = dialogue.some(d => sentence.includes(d.dialogue));
            if (!isDialogue) {
              mentionCount++;
            }
          }
        });
      });

      setCharacterMentionCounts(prev => {
        const newMap = new Map(prev);
        newMap.set(trimmedName, mentionCount);
        return newMap;
      });
      
      // Save to Firestore
      if (currentUser) {
        try {
          await saveRepoCharacters(currentUser.uid, repo.fullName, updatedCharacters);
        } catch (error) {
          // Revert on error
          setCharacters(characters);
          setCharacterDialogueCounts(prev => {
            const newMap = new Map(prev);
            newMap.delete(trimmedName);
            return newMap;
          });
          setCharacterMentionCounts(prev => {
            const newMap = new Map(prev);
            newMap.delete(trimmedName);
            return newMap;
          });
          throw error;
        }
      }
    }
  };

  // Remove a character
  const handleRemoveCharacter = async (characterName) => {
    const updatedCharacters = characters.filter(c => c !== characterName);
    setCharacters(updatedCharacters);
    
    if (currentUser) {
      try {
        await saveRepoCharacters(currentUser.uid, repo.fullName, updatedCharacters);
      } catch (error) {
        setCharacters(characters);
      }
    }
  };

  // Add a new location
  const handleAddLocation = async (locationName = null) => {
    const trimmedName = (locationName || newLocationName).trim();
    if (trimmedName && !locations.includes(trimmedName)) {
      const updatedLocations = [...locations, trimmedName];
      setLocations(updatedLocations);
      if (!locationName) {
        setNewLocationName('');
      }
      
      // Calculate mention count immediately when location is added
      const locationRegex = new RegExp(`\\b${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let mentionCount = 0;
      files.forEach(file => {
        const matches = file.content.match(locationRegex);
        if (matches) {
          mentionCount += matches.length;
        }
      });
      setLocationMentionCounts(prev => {
        const newMap = new Map(prev);
        newMap.set(trimmedName, mentionCount);
        return newMap;
      });
      
      // Save to Firestore
      if (currentUser) {
        try {
          await saveRepoLocations(currentUser.uid, repo.fullName, updatedLocations);
        } catch (error) {
          setLocations(locations);
          setLocationMentionCounts(prev => {
            const newMap = new Map(prev);
            newMap.delete(trimmedName);
            return newMap;
          });
        }
      }
    }
  };

  // Remove a location
  const handleRemoveLocation = async (locationName) => {
    const updatedLocations = locations.filter(l => l !== locationName);
    setLocations(updatedLocations);
    
    if (currentUser) {
      try {
        await saveRepoLocations(currentUser.uid, repo.fullName, updatedLocations);
      } catch (error) {
        setLocations(locations);
      }
    }
  };

  // Helper function to save keywords with queue support
  const saveKeywordsWithQueue = async () => {
    if (!currentUser) {
      return;
    }
    
    if (isSavingKeywordsRef.current) {
      // Save is in progress, mark that we need to save again after
      pendingKeywordsSaveRef.current = true;
      return;
    }
    
    isSavingKeywordsRef.current = true;
    const hadPendingSave = pendingKeywordsSaveRef.current;
    pendingKeywordsSaveRef.current = false;
    
    const keywordsToSave = keywordsRef.current;
    
    try {
      // Always save the latest state from ref
      await saveRepoKeywords(currentUser.uid, repo.fullName, keywordsToSave);
    } catch (error) {
      // Error saving keywords
    } finally {
      isSavingKeywordsRef.current = false;
      
      // If there was a pending save or a new one was queued, do it now
      if (pendingKeywordsSaveRef.current || hadPendingSave) {
        setTimeout(() => saveKeywordsWithQueue(), 100);
      }
    }
  };

  // Add a new keyword
  const handleAddKeyword = async (keywordName = null, color = null) => {
    const trimmedName = (keywordName || newKeywordName).trim().toLowerCase();
    if (!trimmedName) return;
    
    const keywordColor = color || { class: 'bg-purple-200', text: 'text-purple-800' };
    
    // Use functional update so rapid clicks see previous updates
    let wasNewKeyword = false;
    let finalKeywords = null;
    
    setKeywords(prev => {
      const prevWords = prev.map(k => k.word.toLowerCase());
      const existingIndex = prev.findIndex(k => k.word.toLowerCase() === trimmedName);
      
      if (existingIndex >= 0) {
        // Already exists in state - ensure it stays with updated color
        finalKeywords = prev.map((k, idx) => 
          idx === existingIndex 
            ? { word: k.word, color: keywordColor || k.color } // Update color if new one provided
            : k
        );
        // CRITICAL: Update ref synchronously BEFORE returning
        keywordsRef.current = [...finalKeywords]; // Make a copy to ensure it's not mutated
        return finalKeywords;
      }
      // New keyword - add it
      wasNewKeyword = true;
      finalKeywords = [...prev, { word: trimmedName, color: keywordColor }];
      // CRITICAL: Update ref synchronously BEFORE returning
      keywordsRef.current = [...finalKeywords]; // Make a copy to ensure it's not mutated
      return finalKeywords;
    });
    
    if (!keywordName) {
      setNewKeywordName('');
    }
    
    // Save to Firestore - use ref which is updated synchronously in the callback above
    // Use a small delay to ensure state has updated, then verify ref has latest
    setTimeout(() => {
      // The ref is updated synchronously in setKeywords callback, so it should have the latest
      const refKeywords = keywordsRef.current;
      const refHasKeyword = refKeywords && refKeywords.some(k => k.word.toLowerCase() === trimmedName);
      
      if (currentUser && refKeywords && refKeywords.length > 0) {
        // Double-check: if the keyword we're adding isn't in the ref, add it now
        if (!refHasKeyword) {
          const updatedRef = [...refKeywords, { word: trimmedName, color: keywordColor }];
          keywordsRef.current = updatedRef;
        }
        
        // Ensure we're saving the latest from ref
        saveKeywordsWithQueue();
      }
    }, 0);
  };

  // Remove a keyword
  const handleRemoveKeyword = async (keywordName) => {
    const normalizedName = keywordName.toLowerCase();
    let updatedKeywords = null;
    let removedKeyword = null;
    
    // Use functional update to ensure we're working with latest state
    setKeywords(prev => {
      removedKeyword = prev.find(k => k.word.toLowerCase() === normalizedName);
      updatedKeywords = prev.filter(k => k.word.toLowerCase() !== normalizedName);
      keywordsRef.current = updatedKeywords; // Update ref immediately
      return updatedKeywords;
    });
    
    // Save to Firestore - queue if another save is in progress
    if (currentUser && updatedKeywords !== null) {
      try {
        await saveKeywordsWithQueue();
      } catch (error) {
        // Revert on error - restore the removed keyword
        if (removedKeyword) {
          setKeywords(prev => {
            // Check if it's already there (might have been added back)
            if (!prev.some(k => k.word.toLowerCase() === normalizedName)) {
              const restored = [...prev, removedKeyword];
              keywordsRef.current = restored;
              return restored;
            }
            return prev;
          });
        }
      }
    }
  };

  // Auto-detect characters and locations
  const handleAutoDetect = async () => {
    if (files.length === 0) {
      setError('No files loaded. Please fetch files first.');
      return;
    }

    setIsDetecting(true);
    try {
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
  };

  // Toggle character selection
  const toggleCharacterSelection = (characterName) => {
    setSelectedCharacterNames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(characterName)) {
        newSet.delete(characterName);
      } else {
        newSet.add(characterName);
      }
      return newSet;
    });
  };

  // Toggle location selection
  const toggleLocationSelection = (locationName) => {
    setSelectedLocationNames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationName)) {
        newSet.delete(locationName);
      } else {
        newSet.add(locationName);
      }
      return newSet;
    });
  };

  // Add multiple characters at once
  const handleAddMultipleCharacters = async (characterNames) => {
    const newCharacters = characterNames.filter(name => !characters.includes(name));
    if (newCharacters.length === 0) return;

    const updatedCharacters = [...characters, ...newCharacters];
    setCharacters(updatedCharacters);

    // Calculate dialogue counts for new characters
    const newDialogueCounts = new Map();
    const newMentionCounts = new Map();

    newCharacters.forEach(characterName => {
      const dialogue = searchCharacterDialogue(characterName);
      newDialogueCounts.set(characterName, dialogue.length);

      const escapedCharacter = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const characterRegex = new RegExp(`\\b${escapedCharacter}\\b`, 'gi');
      let mentionCount = 0;

      files.forEach(file => {
        const cleanText = file.content.replace(/<[^>]*>/g, ' ');
        const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);

        sentences.forEach(sentence => {
          characterRegex.lastIndex = 0;
          if (characterRegex.test(sentence)) {
            const isDialogue = dialogue.some(d => sentence.includes(d.dialogue));
            if (!isDialogue) {
              mentionCount++;
            }
          }
        });
      });

      newMentionCounts.set(characterName, mentionCount);
    });

    setCharacterDialogueCounts(prev => {
      const newMap = new Map(prev);
      newDialogueCounts.forEach((count, name) => newMap.set(name, count));
      return newMap;
    });

    setCharacterMentionCounts(prev => {
      const newMap = new Map(prev);
      newMentionCounts.forEach((count, name) => newMap.set(name, count));
      return newMap;
    });

    // Save to Firestore
    if (currentUser) {
      try {
        await saveRepoCharacters(currentUser.uid, repo.fullName, updatedCharacters);
      } catch (error) {
        setCharacters(characters);
        setCharacterDialogueCounts(prev => {
          const newMap = new Map(prev);
          newCharacters.forEach(name => newMap.delete(name));
          return newMap;
        });
        setCharacterMentionCounts(prev => {
          const newMap = new Map(prev);
          newCharacters.forEach(name => newMap.delete(name));
          return newMap;
        });
      }
    }
  };

  // Add multiple locations at once
  const handleAddMultipleLocations = async (locationNames) => {
    const newLocations = locationNames.filter(name => !locations.includes(name));
    if (newLocations.length === 0) return;

    const updatedLocations = [...locations, ...newLocations];
    setLocations(updatedLocations);

    // Calculate mention counts for new locations
    const newMentionCounts = new Map();
    newLocations.forEach(locationName => {
      const locationRegex = new RegExp(`\\b${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let mentionCount = 0;
      files.forEach(file => {
        const matches = file.content.match(locationRegex);
        if (matches) {
          mentionCount += matches.length;
        }
      });
      newMentionCounts.set(locationName, mentionCount);
    });

    setLocationMentionCounts(prev => {
      const newMap = new Map(prev);
      newMentionCounts.forEach((count, name) => newMap.set(name, count));
      return newMap;
    });

    // Save to Firestore
    if (currentUser) {
      try {
        await saveRepoLocations(currentUser.uid, repo.fullName, updatedLocations);
      } catch (error) {
        setLocations(locations);
        setLocationMentionCounts(prev => {
          const newMap = new Map(prev);
          newLocations.forEach(name => newMap.delete(name));
          return newMap;
        });
      }
    }
  };

  return {
    newCharacterName,
    setNewCharacterName,
    newLocationName,
    setNewLocationName,
    newKeywordName,
    setNewKeywordName,
    showAutoDetect,
    setShowAutoDetect,
    suggestedCharacters,
    suggestedLocations,
    isDetecting,
    selectedCharacterNames,
    selectedLocationNames,
    handleAddCharacter,
    handleRemoveCharacter,
    handleAddLocation,
    handleRemoveLocation,
    handleAddKeyword,
    handleRemoveKeyword,
    handleAutoDetect,
    toggleCharacterSelection,
    toggleLocationSelection,
    handleAddMultipleCharacters,
    handleAddMultipleLocations,
  };
};

