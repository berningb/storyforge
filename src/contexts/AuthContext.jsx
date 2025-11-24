import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  GithubAuthProvider
} from 'firebase/auth';
import { auth, githubProvider } from '../lib/firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [githubToken, setGithubToken] = useState(null);

  // Sign in with GitHub
  const signInWithGitHub = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      
      // Get GitHub access token from credential
      const credential = GithubAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        // Store the token in localStorage for persistence
        localStorage.setItem('github_token', credential.accessToken);
        setGithubToken(credential.accessToken);
      }
    } catch (error) {
      throw error;
    }
  };
  
  // Set GitHub token manually (for Personal Access Token)
  const setGitHubToken = (token) => {
    if (token) {
      localStorage.setItem('github_token', token);
      setGithubToken(token);
    } else {
      localStorage.removeItem('github_token');
      setGithubToken(null);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    // Load token from localStorage on mount
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      setGithubToken(savedToken);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      // Clear token if user logs out
      if (!user) {
        localStorage.removeItem('github_token');
        setGithubToken(null);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signInWithGitHub,
    logout,
    loading,
    githubToken,
    setGitHubToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

