import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { IndexPage } from './pages/IndexPage';
import { FanFictionDashboard } from './pages/FanFictionDashboard';
import { LoginPage } from './pages/LoginPage';
import { RepoSelectionPage } from './pages/RepoSelectionPage';
import { RepoAnalysisPage } from './pages/RepoAnalysisPage';
import { markdownToHtml, htmlToMarkdown } from '@react-quill/lib';

function App() {
  const { currentUser } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [repoHandlers, setRepoHandlers] = useState({ 
    addCharacter: null, 
    addLocation: null,
    removeCharacter: null,
    removeLocation: null,
    addKeyword: null,
    removeKeyword: null
  });
  const [editedFiles, setEditedFiles] = useState(new Set());
  const [editedFileContent, setEditedFileContent] = useState(new Map()); // Map of filePath -> { html, markdown }

  // Show login page if not authenticated
  if (!currentUser) {
    return <LoginPage />;
  }

  // Simple routing based on hash
  const hash = window.location.hash || '#repos';
  
  if (hash === '#fanfiction') {
    return <FanFictionDashboard />;
  }

  // Handle file edited status and content
  const handleFileEdited = (filePath, isEdited, content = null) => {
    setEditedFiles(prev => {
      const newSet = new Set(prev);
      if (isEdited) {
        newSet.add(filePath);
      } else {
        newSet.delete(filePath);
      }
      return newSet;
    });
    
    // Store edited content when saving locally
    if (content && isEdited) {
      setEditedFileContent(prev => {
        const newMap = new Map(prev);
        newMap.set(filePath, content);
        return newMap;
      });
    } else if (!isEdited) {
      // Clear edited content when file is synced/undone
      setEditedFileContent(prev => {
        const newMap = new Map(prev);
        newMap.delete(filePath);
        return newMap;
      });
    }
  };

  // If a blog is selected, show the editor
  if (selectedBlog) {
    return (
      <IndexPage 
        initialContent={selectedBlog.content} 
        blogInfo={selectedBlog}
        onBack={() => {
          setSelectedBlog(null);
        }}
        onAddCharacter={repoHandlers.addCharacter}
        onAddLocation={repoHandlers.addLocation}
        onRemoveCharacter={repoHandlers.removeCharacter}
        onRemoveLocation={repoHandlers.removeLocation}
        onAddKeyword={repoHandlers.addKeyword}
        onRemoveKeyword={repoHandlers.removeKeyword}
        onFileEdited={handleFileEdited}
      />
    );
  }

  // If a repo is selected, show analysis page with tabs
  if (selectedRepo) {
    return (
      <RepoAnalysisPage
        repo={selectedRepo}
        selectedBlog={selectedBlog}
        editedFiles={editedFiles}
        editedFileContent={editedFileContent}
        onFileEdited={handleFileEdited}
        onFileSelect={async (file, characters, locations, keywords, addCharacterHandler, addLocationHandler, removeCharacterHandler, removeLocationHandler, addKeywordHandler, removeKeywordHandler) => {
          // Check if there's edited content for this file
          const editedContent = editedFileContent.get(file.path);
          let htmlContent, markdownContent;
          
          if (editedContent) {
            // Use edited content if available
            htmlContent = editedContent.html;
            markdownContent = editedContent.markdown || htmlToMarkdown(editedContent.html);
          } else {
            // Otherwise use content from GitHub
            htmlContent = markdownToHtml(file.content);
            markdownContent = file.content;
          }
          
          setSelectedBlog({
            ...file,
            content: htmlContent,
            markdown: markdownContent,
            repo: selectedRepo.fullName,
            path: file.path,
            sha: file.sha,
            branch: selectedRepo.defaultBranch,
            characters: characters || [],
            locations: locations || [],
            keywords: keywords || [],
          });
          // Store handlers for adding/removing entities
          setRepoHandlers({
            addCharacter: addCharacterHandler,
            addLocation: addLocationHandler,
            removeCharacter: removeCharacterHandler,
            removeLocation: removeLocationHandler,
            addKeyword: addKeywordHandler,
            removeKeyword: removeKeywordHandler,
          });
        }}
        onBack={() => {
          setSelectedRepo(null);
          setSelectedBlog(null);
          setRepoHandlers({ addCharacter: null, addLocation: null, removeCharacter: null, removeLocation: null, addKeyword: null, removeKeyword: null });
        }}
      />
    );
  }

  // Default: show repo selection
  return (
    <RepoSelectionPage
      onRepoSelect={(repo) => {
        setSelectedRepo(repo);
      }}
    />
  );
}

export default App;

