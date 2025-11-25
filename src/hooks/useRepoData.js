import { useState, useEffect, useCallback } from 'react';
import { loadRepoData, loadRepoFilesCache, saveRepoFilesCache } from '../lib/repoData';
import { fetchMarkdownFiles, fetchFileContent } from '../lib/github';
import { extractDialogue } from '../lib/textParser';

export const useRepoData = (repo, currentUser, githubToken) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [cacheDate, setCacheDate] = useState(null);
  const [characterDialogueCounts, setCharacterDialogueCounts] = useState(new Map());
  const [characterMentionCounts, setCharacterMentionCounts] = useState(new Map());
  const [locationMentionCounts, setLocationMentionCounts] = useState(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to fetch files from GitHub
  const fetchFilesFromGitHub = useCallback(async (saveToCache = false) => {
    try {
      setIsRefreshing(true);
      
      const [owner, repoName] = repo.fullName.split('/');
      
      const markdownFiles = await fetchMarkdownFiles(owner, repoName, repo.defaultBranch, githubToken);
      
      const filePromises = markdownFiles.map(async (file) => {
        try {
          const content = await fetchFileContent(owner, repoName, file.path, repo.defaultBranch, githubToken);
          return {
            ...file,
            content,
          };
        } catch (err) {
          return {
            ...file,
            content: '',
          };
        }
      });
      
      const loadedFiles = await Promise.all(filePromises);
      setFiles(loadedFiles);
      
      if (saveToCache && currentUser) {
        try {
          await saveRepoFilesCache(currentUser.uid, repo.fullName, loadedFiles);
          setCacheDate(new Date());
        } catch (cacheError) {
        }
      }
      
      return loadedFiles;
    } catch (err) {
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  }, [repo, githubToken, currentUser]);

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
          }
          
          // Load saved characters, locations, and keywords from Firestore
          const savedData = await loadRepoData(currentUser.uid, repo.fullName);
          setCharacters(savedData.characters);
          setLocations(savedData.locations);
          setKeywords(savedData.keywords);
        }
        
        // If no cache, fetch from GitHub
        if (!loadedFiles) {
          const fetchedFiles = await fetchFilesFromGitHub(true); // Save to cache
          loadedFiles = fetchedFiles;
        }
        
        // Calculate dialogue counts for all characters and mention counts for locations after files are loaded
        const finalFiles = loadedFiles || files;
        if (finalFiles && finalFiles.length > 0) {
          const savedData = currentUser ? await loadRepoData(currentUser.uid, repo.fullName) : { characters: [], locations: [], keywords: [] };
          
          // Calculate character dialogue counts and mention counts
          if (savedData.characters && savedData.characters.length > 0) {
            const dialogueCounts = new Map();
            const mentionCounts = new Map();
            
            savedData.characters.forEach(characterName => {
              // Calculate dialogue count
              const allDialogue = [];
              const characterNameLower = characterName.toLowerCase().trim();
              const characterNameEscaped = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              
              finalFiles.forEach(file => {
                const dialogue = extractDialogue(file.content, file.path);
                const characterDialogue = dialogue.filter(d => {
                  const speakerLower = d.speaker.toLowerCase().trim();
                  if (speakerLower === characterNameLower) return true;
                  const speakerRegex = new RegExp(`\\b${characterNameEscaped}\\b`, 'i');
                  if (speakerRegex.test(d.speaker)) return true;
                  if (speakerLower.startsWith(characterNameLower + ' ') || characterNameLower.startsWith(speakerLower + ' ')) return true;
                  return false;
                });
                allDialogue.push(...characterDialogue);
              });
              
              dialogueCounts.set(characterName, allDialogue.length);
              
              // Calculate mention count (non-dialogue mentions)
              const escapedCharacter = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const characterRegex = new RegExp(`\\b${escapedCharacter}\\b`, 'gi');
              let mentionCount = 0;
              
              finalFiles.forEach(file => {
                const cleanText = file.content.replace(/<[^>]*>/g, ' ');
                const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
                
                sentences.forEach(sentence => {
                  characterRegex.lastIndex = 0;
                  if (characterRegex.test(sentence)) {
                    // Check if this is already dialogue
                    const isDialogue = allDialogue.some(d => sentence.includes(d.dialogue));
                    if (!isDialogue) {
                      mentionCount++;
                    }
                  }
                });
              });
              
              mentionCounts.set(characterName, mentionCount);
            });
            
            setCharacterDialogueCounts(dialogueCounts);
            setCharacterMentionCounts(mentionCounts);
          }
          
          // Calculate location mention counts
          if (savedData.locations && savedData.locations.length > 0) {
            const mentionCounts = new Map();
            savedData.locations.forEach(locationName => {
              const locationRegex = new RegExp(`\\b${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
              let mentionCount = 0;
              finalFiles.forEach(file => {
                const matches = file.content.match(locationRegex);
                if (matches) {
                  mentionCount += matches.length;
                }
              });
              mentionCounts.set(locationName, mentionCount);
            });
            setLocationMentionCounts(mentionCounts);
          }
        }
      } catch (err) {
        setError(`Failed to load repository data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (repo) {
      loadRepoDataAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, currentUser]);

  return {
    loading,
    error,
    files,
    setFiles,
    characters,
    setCharacters,
    locations,
    setLocations,
    keywords,
    setKeywords,
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
  };
};

