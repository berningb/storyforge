import { useState, useCallback } from 'react';
import { updateFileContent, getFileSha, fetchFileContent } from '../lib/github';
import { htmlToMarkdown, markdownToHtml } from '@react-quill/lib';

export const useSaveHandlers = ({
  blogInfo,
  githubToken,
  editorHtml,
  editorMarkdown,
  contentToUse,
  onFileEdited,
  updateContent,
  setFileSha,
  fileSha,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [isShaMismatchError, setIsShaMismatchError] = useState(false);

  const handleSave = useCallback(async (commitMessage, onSuccess) => {
    if (!blogInfo || !fileSha) {
      setSaveError('File information missing. Cannot save.');
      return;
    }

    if (!githubToken) {
      setSaveError('GitHub access token required. Please sign out and sign back in with GitHub to get a token, or click "Add Token" to add a Personal Access Token.');
      return;
    }

    if (!commitMessage.trim()) {
      setSaveError('Please enter a commit message.');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const [owner, repo] = blogInfo.repo.split('/');
      const path = blogInfo.path;
      const branch = blogInfo.branch || 'main';
      
      let currentSha = fileSha;
      try {
        currentSha = await getFileSha(owner, repo, path, branch, githubToken);
        if (currentSha !== fileSha) {
          setFileSha(currentSha);
        }
      } catch (shaError) {
        // Continue with cached SHA
      }
      
      const markdownContent = editorMarkdown || htmlToMarkdown(editorHtml || contentToUse);
      
      const result = await updateFileContent(
        owner,
        repo,
        path,
        markdownContent,
        currentSha,
        branch,
        commitMessage.trim(),
        githubToken
      );

      if (result?.content?.sha) {
        setFileSha(result.content.sha);
      }

      if (onSuccess) {
        onSuccess();
      }
      
      if (onFileEdited && blogInfo?.path) {
        onFileEdited(blogInfo.path, false, null);
      }
      
      alert('File saved successfully to GitHub!');
    } catch (error) {
      let errorMessage = error.message || 'Failed to save file. Please try again.';
      
      const isShaMismatch = errorMessage.includes('does not match') || errorMessage.includes('sha') || errorMessage.toLowerCase().includes('modified');
      setIsShaMismatchError(isShaMismatch);
      
      if (isShaMismatch) {
        errorMessage = 'File has been modified on GitHub. Click "Fetch Latest & Retry" to get the latest version and save your changes.';
      }
      
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [blogInfo, fileSha, githubToken, editorMarkdown, editorHtml, contentToUse, onFileEdited, setFileSha]);

  const handleFetchLatest = useCallback(async (retrySave = false) => {
    if (!blogInfo) {
      setFetchError('File information missing. Cannot fetch.');
      return;
    }

    if (!githubToken) {
      setFetchError('GitHub access token required. Please sign out and sign back in with GitHub to get a token, or click "Add Token" to add a Personal Access Token.');
      return;
    }

    setIsFetching(true);
    setFetchError('');

    try {
      const [owner, repo] = blogInfo.repo.split('/');
      const path = blogInfo.path;
      const branch = blogInfo.branch || 'main';
      
      const markdownContent = await fetchFileContent(owner, repo, path, branch, githubToken);
      const htmlContent = markdownToHtml(markdownContent);
      
      updateContent(htmlContent, markdownContent);
      
      try {
        const latestSha = await getFileSha(owner, repo, path, branch, githubToken);
        setFileSha(latestSha);
      } catch (shaError) {
        // Could not fetch latest SHA
      }
      
      if (retrySave) {
        setSaveError('');
        setIsShaMismatchError(false);
      } else {
        alert('File fetched successfully from GitHub!');
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch file. Please try again.';
      setFetchError(errorMessage);
    } finally {
      setIsFetching(false);
    }
  }, [blogInfo, githubToken, updateContent, setFileSha]);

  const handleFetchLatestAndRetry = useCallback(async (commitMessage, onSuccess) => {
    if (!blogInfo || !githubToken || !commitMessage.trim()) {
      return;
    }

    setIsFetching(true);
    setSaveError('');
    setIsShaMismatchError(false);

    try {
      const [owner, repo] = blogInfo.repo.split('/');
      const path = blogInfo.path;
      const branch = blogInfo.branch || 'main';
      
      const latestSha = await getFileSha(owner, repo, path, branch, githubToken);
      setFileSha(latestSha);
      
      setIsSaving(true);
      
      try {
        const markdownContent = editorMarkdown || htmlToMarkdown(editorHtml || contentToUse);
        
        const result = await updateFileContent(
          owner,
          repo,
          path,
          markdownContent,
          latestSha,
          branch,
          commitMessage.trim(),
          githubToken
        );

        if (result?.content?.sha) {
          setFileSha(result.content.sha);
        }

        if (onSuccess) {
          onSuccess();
        }
        
        alert('File saved successfully to GitHub!');
      } catch (saveError) {
        let errorMessage = saveError.message || 'Failed to save file. Please try again.';
        const isShaMismatch = errorMessage.includes('does not match') || errorMessage.includes('sha') || errorMessage.toLowerCase().includes('modified');
        setIsShaMismatchError(isShaMismatch);
        
        if (isShaMismatch) {
          errorMessage = 'File has been modified on GitHub. Click "Fetch Latest & Retry" to get the latest version and save your changes.';
        }
        
        setSaveError(errorMessage);
      } finally {
        setIsSaving(false);
        setIsFetching(false);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch latest version. Please try again.';
      setSaveError(errorMessage);
      setIsFetching(false);
    }
  }, [blogInfo, githubToken, editorMarkdown, editorHtml, contentToUse, setFileSha]);

  return {
    isSaving,
    isFetching,
    saveError,
    fetchError,
    isShaMismatchError,
    handleSave,
    handleFetchLatest,
    handleFetchLatestAndRetry,
    setSaveError,
    setFetchError,
  };
};

