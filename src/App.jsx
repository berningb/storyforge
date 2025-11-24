import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { IndexPage } from './pages/IndexPage';
import { FanFictionDashboard } from './pages/FanFictionDashboard';
import { LoginPage } from './pages/LoginPage';
import { RepoSelectionPage } from './pages/RepoSelectionPage';
import { RepoAnalysisPage } from './pages/RepoAnalysisPage';
import { markdownToHtml } from '@react-quill/lib';

function App() {
  const { currentUser } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedBlog, setSelectedBlog] = useState(null);

  // Show login page if not authenticated
  if (!currentUser) {
    return <LoginPage />;
  }

  // Simple routing based on hash
  const hash = window.location.hash || '#repos';
  
  if (hash === '#fanfiction') {
    return <FanFictionDashboard />;
  }

  // If a blog is selected, show the editor
  if (selectedBlog) {
    return (
      <IndexPage 
        initialContent={selectedBlog.content} 
        blogInfo={selectedBlog}
        onBack={() => {
          setSelectedBlog(null);
        }}
      />
    );
  }

  // If a repo is selected, show analysis page with tabs
  if (selectedRepo) {
    return (
      <RepoAnalysisPage
        repo={selectedRepo}
        onFileSelect={async (file) => {
          // Convert markdown to HTML and load in editor
          const htmlContent = markdownToHtml(file.content);
          setSelectedBlog({
            ...file,
            content: htmlContent,
            markdown: file.content,
            repo: selectedRepo.fullName,
            path: file.path,
            sha: file.sha,
            branch: selectedRepo.defaultBranch,
          });
        }}
        onBack={() => {
          setSelectedRepo(null);
          setSelectedBlog(null);
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

