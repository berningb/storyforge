import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get repository data document ID from repo full name
 */
const getRepoDocId = (repoFullName) => {
  return repoFullName.replace(/\//g, '_');
};

/**
 * Save a specific entity collection
 */
export const saveRepoEntityCollection = async (userId, repoFullName, collectionName, items, config = null) => {
  try {
    const collections = await loadRepoEntityCollections(userId, repoFullName);
    collections[collectionName] = {
      items,
      config: config || collections[collectionName]?.config || {
        name: collectionName.charAt(0).toUpperCase() + collectionName.slice(1),
        color: { bg: 'bg-gray-200', text: 'text-gray-800', border: 'border-gray-300', bgDark: 'bg-gray-900/20', borderDark: 'border-gray-700/50' },
        icon: 'default',
      }
    };
    await saveRepoEntityCollections(userId, repoFullName, collections);
  } catch (error) {
    throw error;
  }
};

/**
 * Save characters for a repository
 * @deprecated Use saveRepoEntityCollection instead
 */
export const saveRepoCharacters = async (userId, repoFullName, characters) => {
  try {
    await saveRepoEntityCollection(userId, repoFullName, 'characters', characters);
    // Also save in old format for backward compatibility
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    await setDoc(repoRef, {
      repoFullName,
      characters,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
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
    return [];
  }
};

/**
 * Save locations for a repository
 * @deprecated Use saveRepoEntityCollection instead
 */
export const saveRepoLocations = async (userId, repoFullName, locations) => {
  try {
    await saveRepoEntityCollection(userId, repoFullName, 'locations', locations);
    // Also save in old format for backward compatibility
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    await setDoc(repoRef, {
      repoFullName,
      locations,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
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
    return [];
  }
};

/**
 * Save keywords for a repository
 * @deprecated Use saveRepoEntityCollection instead
 */
export const saveRepoKeywords = async (userId, repoFullName, keywords) => {
  try {
    await saveRepoEntityCollection(userId, repoFullName, 'keywords', keywords);
    // Also save in old format for backward compatibility
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    await setDoc(repoRef, {
      repoFullName,
      keywords,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    throw error;
  }
};

/**
 * Load keywords for a repository
 */
export const loadRepoKeywords = async (userId, repoFullName) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    const repoSnap = await getDoc(repoRef);
    
    if (repoSnap.exists()) {
      return repoSnap.data().keywords || [];
    }
    return [];
  } catch (error) {
    return [];
  }
};

/**
 * Save entity collections for a repository
 * Collections structure: { collectionName: { items: [...], config: { color, icon, etc } } }
 */
export const saveRepoEntityCollections = async (userId, repoFullName, collections) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    
    // Check if document exists
    const docSnap = await getDoc(repoRef);
    const updateData = {
      repoFullName,
      entityCollections: collections,
      updatedAt: new Date(),
    };
    
    if (docSnap.exists()) {
      // Document exists - use updateDoc to delete old fields
      await updateDoc(repoRef, {
        ...updateData,
        characters: deleteField(), // Remove old structure
        locations: deleteField(), // Remove old structure
        keywords: deleteField(), // Remove old structure
      });
    } else {
      // Document doesn't exist - use setDoc
      await setDoc(repoRef, updateData);
    }
  } catch (error) {
    console.error('Error saving entity collections:', error);
    throw error;
  }
};

/**
 * Load entity collections for a repository
 * Returns collections object and migrates old data structure if needed
 */
export const loadRepoEntityCollections = async (userId, repoFullName) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const repoRef = doc(db, 'users', userId, 'repos', repoDocId);
    const repoSnap = await getDoc(repoRef);
    
    if (repoSnap.exists()) {
      const data = repoSnap.data();
      
      // If new structure exists (even if empty), use it and don't migrate
      if (data.entityCollections !== undefined) {
        console.log('Loading collections from entityCollections:', Object.keys(data.entityCollections || {}));
        return data.entityCollections || {};
      }
      
      console.log('No entityCollections found, checking for old structure to migrate...');
      
      // Only migrate if new structure doesn't exist at all
      const collections = {};
      
      // Migrate characters
      if (data.characters && Array.isArray(data.characters)) {
        collections.characters = {
          items: data.characters,
          config: {
            name: 'Characters',
            color: { bg: 'bg-purple-200', text: 'text-purple-800', border: 'border-purple-300', bgDark: 'bg-purple-900/20', borderDark: 'border-purple-700/50' },
            icon: 'character',
          }
        };
      }
      
      // Migrate locations
      if (data.locations && Array.isArray(data.locations)) {
        collections.locations = {
          items: data.locations,
          config: {
            name: 'Locations',
            color: { bg: 'bg-blue-200', text: 'text-blue-800', border: 'border-blue-300', bgDark: 'bg-blue-900/20', borderDark: 'border-blue-700/50' },
            icon: 'location',
          }
        };
      }
      
      // Migrate keywords
      if (data.keywords && Array.isArray(data.keywords)) {
        collections.keywords = {
          items: data.keywords.map(k => typeof k === 'string' ? { word: k, color: { class: 'bg-purple-200', text: 'text-purple-800' } } : k),
          config: {
            name: 'Keywords',
            color: { bg: 'bg-slate-700', text: 'text-slate-200', border: 'border-slate-600', bgDark: 'bg-slate-900/50', borderDark: 'border-slate-600/50' },
            icon: 'keyword',
            supportsColors: true,
          }
        };
      }
      
      // Save migrated data (only if there's something to migrate)
      if (Object.keys(collections).length > 0) {
        await saveRepoEntityCollections(userId, repoFullName, collections);
      }
      
      return collections;
    }
    
    // No default collections - return empty object
    return {};
  } catch (error) {
    console.error('Error loading entity collections:', error);
    return {};
  }
};

/**
 * Load all repository data (characters, locations, and keywords)
 * @deprecated Use loadRepoEntityCollections instead
 */
export const loadRepoData = async (userId, repoFullName) => {
  try {
    const collections = await loadRepoEntityCollections(userId, repoFullName);
    
    // Return in old format for backward compatibility
    return {
      characters: collections.characters?.items || [],
      locations: collections.locations?.items || [],
      keywords: collections.keywords?.items || [],
    };
  } catch (error) {
    return {
      characters: [],
      locations: [],
      keywords: [],
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
    return null;
  }
};

/**
 * Save image annotations for a specific image file
 * Annotations structure: { markers: [{ x, y, collectionName, itemName, id }] }
 */
export const saveImageAnnotations = async (userId, repoFullName, imagePath, annotations) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const imageAnnotationsRef = doc(db, 'users', userId, 'repos', repoDocId, 'imageAnnotations', imagePath.replace(/\//g, '_'));
    
    await setDoc(imageAnnotationsRef, {
      imagePath,
      annotations,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    throw error;
  }
};

/**
 * Load image annotations for a specific image file
 */
export const loadImageAnnotations = async (userId, repoFullName, imagePath) => {
  try {
    const repoDocId = getRepoDocId(repoFullName);
    const imageAnnotationsRef = doc(db, 'users', userId, 'repos', repoDocId, 'imageAnnotations', imagePath.replace(/\//g, '_'));
    const imageAnnotationsSnap = await getDoc(imageAnnotationsRef);
    
    if (imageAnnotationsSnap.exists()) {
      const data = imageAnnotationsSnap.data();
      return data.annotations || { markers: [] };
    }
    return { markers: [] };
  } catch (error) {
    console.error('Error loading image annotations:', error);
    return { markers: [] };
  }
};

