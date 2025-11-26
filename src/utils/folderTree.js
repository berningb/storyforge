/**
 * Builds a folder tree structure from file paths
 * @param {Array} files - Array of file objects with path property
 * @returns {Object} - Tree structure with folders and files
 */
export function buildFolderTree(files) {
  const tree = {
    folders: {},
    files: [],
  };

  files.forEach((file) => {
    const pathParts = file.path.split('/');
    const fileName = pathParts.pop(); // Remove the file name
    
    // Navigate/create folder structure
    let current = tree;
    const accumulatedPath = [];
    pathParts.forEach((folderName) => {
      accumulatedPath.push(folderName);
      if (!current.folders[folderName]) {
        current.folders[folderName] = {
          folders: {},
          files: [],
          name: folderName,
          path: accumulatedPath.join('/'),
        };
      }
      current = current.folders[folderName];
    });
    
    // Add file to current folder
    current.files.push(file);
  });

  return tree;
}

/**
 * Gets files directly in a folder tree at a given path (not including subfolders)
 * @param {Object} tree - The folder tree structure
 * @param {string} path - The folder path (e.g., 'Ideas/Chapters')
 * @returns {Array} - Array of files directly in that folder (not including subfolders)
 */
export function getFilesInPath(tree, path) {
  if (!path || path === '') {
    // Root level - return only files directly in root, not in subfolders
    return [...tree.files];
  }

  const pathParts = path.split('/').filter(p => p !== '');
  let current = tree;
  
  for (const part of pathParts) {
    if (!current.folders[part]) {
      return [];
    }
    current = current.folders[part];
  }
  
  // Return only files directly in this folder, not in subfolders
  return [...current.files];
}

/**
 * Gets all folder paths in the tree
 * @param {Object} tree - The folder tree structure
 * @param {string} prefix - Current path prefix (for recursion)
 * @returns {Array} - Array of folder paths
 */
export function getAllFolderPaths(tree, prefix = '') {
  const paths = [];
  
  Object.keys(tree.folders).forEach((folderName) => {
    const folderPath = prefix ? `${prefix}/${folderName}` : folderName;
    paths.push(folderPath);
    const folder = tree.folders[folderName];
    paths.push(...getAllFolderPaths(folder, folderPath));
  });
  
  return paths;
}

