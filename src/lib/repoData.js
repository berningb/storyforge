import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  arrayUnion,
  arrayRemove 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get repository data document ID from repo full name
 */
const getRepoDocId = (repoFullName) => {
  return repoFullName.replace(/\//g, '_');
};

/**
 * Save characters for a repository
 */
export const saveRepoCharacters = async (userId, repoFullName, characters) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    
    await setDoc(repoRef, {
      repoFullName,
      characters,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving characters:', error);
    throw error;
  }
};

/**
 * Load characters for a repository
 */
export const loadRepoCharacters = async (userId, repoFullName) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    const repoSnap = await getDoc(repoRef);
    
    if (repoSnap.exists()) {
      return repoSnap.data().characters || [];
    }
    return [];
  } catch (error) {
    console.error('Error loading characters:', error);
    return [];
  }
};

/**
 * Save locations for a repository
 */
export const saveRepoLocations = async (userId, repoFullName, locations) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    
    await setDoc(repoRef, {
      repoFullName,
      locations,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving locations:', error);
    throw error;
  }
};

/**
 * Load locations for a repository
 */
export const loadRepoLocations = async (userId, repoFullName) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    const repoSnap = await getDoc(repoRef);
    
    if (repoSnap.exists()) {
      return repoSnap.data().locations || [];
    }
    return [];
  } catch (error) {
    console.error('Error loading locations:', error);
    return [];
  }
};

/**
 * Load all repository data (characters and locations)
 */
export const loadRepoData = async (userId, repoFullName) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    const repoSnap = await getDoc(repoRef);
    
    if (repoSnap.exists()) {
      const data = repoSnap.data();
      return {
        characters: data.characters || [],
        locations: data.locations || [],
      };
    }
    return {
      characters: [],
      locations: [],
    };
  } catch (error) {
    console.error('Error loading repo data:', error);
    return {
      characters: [],
      locations: [],
    };
  }
};

/**
 * Save repository files cache
 */
export const saveRepoFilesCache = async (userId, repoFullName, files) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    
    // Store files with metadata
    const filesToSave = files.map(file => ({
      path: file.path,
      sha: file.sha,
      size: file.size,
      content: file.content,
      url: file.url,
    }));
    
    await setDoc(repoRef, {
      repoFullName,
      filesCache: filesToSave,
      filesCacheUpdated: new Date(),
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving files cache:', error);
    throw error;
  }
};

/**
 * Load repository files cache
 */
export const loadRepoFilesCache = async (userId, repoFullName) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    const repoSnap = await getDoc(repoRef);
    
    if (repoSnap.exists()) {
      const data = repoSnap.data();
      if (data.filesCache && Array.isArray(data.filesCache)) {
        return {
          files: data.filesCache,
          cacheDate: data.filesCacheUpdated?.toDate() || null,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading files cache:', error);
    return null;
  }
};

