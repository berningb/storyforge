/**
 * GitHub API utilities
 * Uses Firebase Auth token to authenticate with GitHub API
 */

/**
 * Get GitHub access token from Firebase Auth
 */
export const getGitHubToken = async (user) => {
  if (!user) return null;
  
  // Get the GitHub provider credential
  const credential = user.providerData.find(provider => provider.providerId === 'github.com');
  if (!credential) return null;
  
  // Firebase Auth doesn't directly provide GitHub token, so we need to get it from the OAuth flow
  // For now, we'll use a workaround: get the token from the user's access token
  // Note: This requires the user to have granted repo access during OAuth
  
  // Alternative: Use GitHub's API with the Firebase ID token
  // We'll need to implement a backend function or use GitHub's API differently
  // For now, let's use GitHub's API with the user's email/username
  
  return null; // Will need to be implemented with proper token retrieval
};

/**
 * Get current authenticated user's GitHub info
 * This requires an access token, which we don't have directly from Firebase
 * For now, we'll use the username extraction method
 */
export const getCurrentGitHubUser = async () => {
  // This would require an access token
  // For now, return null and use username extraction
  return null;
};

/**
 * Fetch user's repositories from GitHub
 */
export const fetchUserRepos = async (user) => {
  try {
    // Get GitHub username from user's provider data
    const githubProvider = user.providerData.find(p => p.providerId === 'github.com');
    let username = null;
    
    if (githubProvider?.uid) {
      username = githubProvider.uid;
    } else if (user.displayName) {
      username = user.displayName;
    } else if (user.email) {
      // Try to extract from GitHub noreply email
      if (user.email.includes('@users.noreply.github.com')) {
        const match = user.email.match(/^(\d+)\+(\w+)@users\.noreply\.github\.com$/);
        if (match && match[2]) {
          username = match[2];
        }
      } else {
        username = user.email.split('@')[0];
      }
    }
    
    if (!username) {
      throw new Error('Could not determine GitHub username. Please ensure you signed in with GitHub and your profile is set up correctly.');
    }
    
    // Fetch repos using GitHub API
    // Note: This is a public API call, so it only works for public repos
    // For private repos, we'd need an access token
    let response;
    try {
      response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      });
    } catch (fetchError) {
      throw new Error(`Network error: ${fetchError.message}. Please check your internet connection.`);
    }
    
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        // Ignore error reading response
      }
      
      if (response.status === 404) {
        throw new Error(`GitHub user "${username}" not found. Please verify your GitHub username is correct.`);
      } else if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again in a few minutes.');
      } else if (response.status === 0) {
        throw new Error('CORS error: Unable to fetch from GitHub API. This might be a browser security restriction.');
      } else {
        throw new Error(`GitHub API error (${response.status}): ${response.statusText || errorText || 'Unknown error'}`);
      }
    }
    
    let repos;
    try {
      repos = await response.json();
    } catch (parseError) {
      throw new Error('Invalid response from GitHub API. Please try again.');
    }
    
    if (!Array.isArray(repos)) {
      throw new Error('Unexpected response format from GitHub API');
    }
    
    return repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      defaultBranch: repo.default_branch || 'main',
      updatedAt: repo.updated_at,
      url: repo.html_url,
    }));
  } catch (error) {
    // Re-throw with more context if it's not already a user-friendly error
    if (error.message && !error.message.includes('GitHub')) {
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Fetch markdown files and image files from a repository
 */
export const fetchMarkdownFiles = async (owner, repo, branch = 'main', githubToken = null) => {
  try {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    // Fetch repository tree recursively
    // First, get the SHA of the branch
    const branchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
      headers,
    });
    
    if (!branchResponse.ok) {
      // Try 'master' if 'main' fails
      const masterResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/master`, {
        headers,
      });
      if (!masterResponse.ok) {
        throw new Error(`Failed to fetch branch: ${branchResponse.statusText}`);
      }
      const masterData = await masterResponse.json();
      branch = 'master';
      var sha = masterData.object.sha;
    } else {
      const branchData = await branchResponse.json();
      var sha = branchData.object.sha;
    }
    
    // Get the tree recursively
    const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, {
      headers,
    });
    
    if (!treeResponse.ok) {
      throw new Error(`Failed to fetch tree: ${treeResponse.statusText}`);
    }
    
    const treeData = await treeResponse.json();
    
    // Filter for markdown files and image files
    const files = treeData.tree.filter(file => {
      if (file.type !== 'blob') return false;
      const pathLower = file.path.toLowerCase();
      return pathLower.endsWith('.md') || 
             pathLower.endsWith('.markdown') ||
             pathLower.endsWith('.png') ||
             pathLower.endsWith('.jpg') ||
             pathLower.endsWith('.jpeg');
    });
    
    return files.map(file => ({
      path: file.path,
      sha: file.sha,
      size: file.size,
      url: file.url,
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Decode base64 to UTF-8 string properly
 */
const decodeBase64UTF8 = (base64) => {
  try {
    // Decode base64
    const binaryString = atob(base64);
    // Convert binary string to UTF-8
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // Decode UTF-8 bytes to string
    return new TextDecoder('utf-8').decode(bytes);
  } catch (error) {
    // Fallback to simple atob if TextDecoder fails
    return atob(base64);
  }
};

/**
 * Fetch content of a specific file from GitHub
 */
export const fetchFileContent = async (owner, repo, path, branch = 'main', githubToken = null) => {
  try {
    const headers = {};
    const requestedRaw = !!githubToken;
    
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
      // Use raw endpoint for authenticated requests
      headers['Accept'] = 'application/vnd.github.v3.raw';
    } else {
      // For unauthenticated, we need to get JSON and decode base64
      headers['Accept'] = 'application/vnd.github.v3+json';
    }
    
    // Fetch file content using GitHub API
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
      headers,
    });
    
    if (!response.ok) {
      // Try 'master' if 'main' fails
      if (branch === 'main') {
        const masterResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=master`, {
          headers,
        });
        if (!masterResponse.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        // If we requested raw content, get as text
        if (requestedRaw) {
          return await masterResponse.text();
        } else {
          // Requested JSON, parse as JSON
          const masterData = await masterResponse.json();
          return decodeBase64UTF8(masterData.content);
        }
      }
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    // If we requested raw content, get as text (don't try to parse as JSON)
    if (requestedRaw) {
      return await response.text();
    } else {
      // Requested JSON, parse as JSON
      const data = await response.json();
      // Decode base64 content with proper UTF-8 handling
      return decodeBase64UTF8(data.content);
    }
  } catch (error) {
    // If it's a JSON parse error, provide a more helpful message
    if (error.message && (error.message.includes('JSON') || error.message.includes('Unexpected token'))) {
      throw new Error(`Failed to parse GitHub API response. The file might be too large or in an unexpected format. Original error: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Get GitHub username from user ID using GitHub API
 * Note: This endpoint may require authentication for some cases
 */
export const getUsernameFromId = async (userId) => {
  try {
    // Try the user endpoint by ID
    const response = await fetch(`https://api.github.com/user/${userId}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (response.ok) {
      const userData = await response.json();
      if (userData.login) {
        return userData.login;
      }
    } else if (response.status === 404) {
      // The /user/{id} endpoint might not be available without auth
      // Try using the GitHub API's search or other methods
    }
  } catch (error) {
    // Error fetching username from ID
  }
  
  // Fallback: Try to extract from photoURL if it's a GitHub avatar
  // GitHub avatar URLs sometimes contain username info, but not reliably
  
  return null;
};

/**
 * Get current file SHA from GitHub
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @param {string} branch - Branch name
 * @param {string} githubToken - GitHub access token
 */
export const getFileSha = async (owner, repo, path, branch, githubToken) => {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }
  
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file SHA: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.sha;
  } catch (error) {
    throw error;
  }
};

/**
 * Update file content on GitHub
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @param {string} content - New file content
 * @param {string} sha - Current file SHA (required for update, will be fetched if not provided)
 * @param {string} branch - Branch name
 * @param {string} commitMessage - Commit message
 * @param {string} githubToken - GitHub access token
 */
export const updateFileContent = async (owner, repo, path, content, sha, branch, commitMessage, githubToken) => {
  if (!githubToken) {
    throw new Error('GitHub access token required to update files. Please sign in with GitHub.');
  }

  try {
    // If SHA is not provided or might be outdated, fetch the latest SHA
    let currentSha = sha;
    if (!currentSha) {
      currentSha = await getFileSha(owner, repo, path, branch, githubToken);
    }
    
    // Encode content to base64
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    const base64Content = btoa(String.fromCharCode(...bytes));

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: base64Content,
        sha: currentSha,
        branch: branch,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Failed to update file: ${response.statusText}`;
      
      // Check if it's a SHA mismatch error
      if (errorMessage.includes('does not match') || errorMessage.includes('sha')) {
        // Try to fetch the latest SHA and retry once
        try {
          const latestSha = await getFileSha(owner, repo, path, branch, githubToken);
          if (latestSha !== currentSha) {
            // Retry with the latest SHA
            const retryResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
              method: 'PUT',
              headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: commitMessage,
                content: base64Content,
                sha: latestSha,
                branch: branch,
              }),
            });
            
            if (!retryResponse.ok) {
              const retryErrorData = await retryResponse.json().catch(() => ({}));
              throw new Error(retryErrorData.message || `Failed to update file: ${retryResponse.statusText}`);
            }
            
            return await retryResponse.json();
          }
        } catch (retryError) {
          throw new Error(`File has been modified on GitHub. Please refresh and try again. Original error: ${errorMessage}`);
        }
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Get GitHub username from Firebase user
 */
export const getGitHubUsername = async (user) => {
  // Try to get username from provider data
  const githubProvider = user.providerData.find(p => p.providerId === 'github.com');
  
  if (githubProvider?.uid) {
    const uid = githubProvider.uid;
    
    // If it's numeric, it's a user ID - try to fetch the username
    if (/^\d+$/.test(uid)) {
      const username = await getUsernameFromId(uid);
      if (username) {
        return username;
      }
    } else {
      // It's already a username
      return uid;
    }
  }
  
  // Try to extract from email if it's a GitHub email
  if (user.email && user.email.includes('@users.noreply.github.com')) {
    const match = user.email.match(/^(\d+)\+(\w+)@users\.noreply\.github\.com$/);
    if (match && match[2]) {
      return match[2]; // Return the username part
    }
    // If we have the ID from email, try to fetch username
    if (match && match[1]) {
      const username = await getUsernameFromId(match[1]);
      if (username) {
        return username;
      }
    }
  }
  
  // Fallback to display name (sometimes Firebase sets this to the username)
  if (user.displayName) {
    // Check if displayName looks like a GitHub username (no spaces, alphanumeric/hyphens)
    if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(user.displayName)) {
      return user.displayName;
    }
  }
  
  // Last resort: try to extract from email
  if (user.email && !user.email.includes('@users.noreply.github.com')) {
    const emailUsername = user.email.split('@')[0];
    return emailUsername;
  }
  
  return null;
};

