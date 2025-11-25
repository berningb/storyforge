import { useState, useEffect, useMemo, useCallback } from 'react';
import { htmlToMarkdown, markdownToHtml } from '@react-quill/lib';

export const useEditorState = ({ initialContent, blogInfo, onFileEdited }) => {
  const [editorText, setEditorText] = useState('');
  const [editorHtml, setEditorHtml] = useState(initialContent || '');
  const [editorMarkdown, setEditorMarkdown] = useState('');
  const [editorInitialContent, setEditorInitialContent] = useState(initialContent || '');
  const [contentVersion, setContentVersion] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalContent, setOriginalContent] = useState(null);

  useEffect(() => {
    if (typeof document !== 'undefined' && !editorText) {
      const temp = document.createElement('div');
      temp.innerHTML = initialContent || '';
      setEditorText(temp.textContent || temp.innerText || '');
    }

    if (initialContent && !originalContent) {
      setOriginalContent(initialContent);
      setHasChanges(false);
    }
  }, [initialContent, editorText, originalContent]);

  const handleChange = useCallback((text, html, markdown) => {
    setEditorText(text);
    setEditorHtml(html);
    setEditorMarkdown(markdown);
    
    const hasChanged = html !== originalContent && html !== initialContent;
    setHasChanges(hasChanged);
    
    if (hasChanged && onFileEdited && blogInfo?.path) {
      onFileEdited(blogInfo.path, true, {
        html: html,
        markdown: markdown || htmlToMarkdown(html)
      });
    }
  }, [originalContent, initialContent, onFileEdited, blogInfo?.path]);

  const handleUndo = useCallback(() => {
    if (originalContent) {
      setEditorHtml(originalContent);
      setEditorMarkdown('');
      setEditorInitialContent(originalContent);
      setHasChanges(false);
      if (onFileEdited && blogInfo?.path) {
        onFileEdited(blogInfo.path, false, null);
      }
      setContentVersion(prev => prev + 1);
    }
  }, [originalContent, onFileEdited, blogInfo?.path]);

  const handleSaveLocal = useCallback(() => {
    if (hasChanges) {
      setOriginalContent(editorHtml);
      setEditorInitialContent(editorHtml);
      setHasChanges(false);
      if (onFileEdited && blogInfo?.path) {
        onFileEdited(blogInfo.path, true, {
          html: editorHtml,
          markdown: editorMarkdown || htmlToMarkdown(editorHtml)
        });
      }
      setContentVersion(prev => prev + 1);
    }
  }, [hasChanges, editorHtml, editorMarkdown, onFileEdited, blogInfo?.path]);

  const updateContent = useCallback((htmlContent, markdownContent) => {
    if (typeof document !== 'undefined') {
      const temp = document.createElement('div');
      temp.innerHTML = htmlContent;
      const textContent = temp.textContent || temp.innerText || '';
      setEditorText(textContent);
    }
    
    setEditorHtml(htmlContent);
    setEditorMarkdown(markdownContent);
    setEditorInitialContent(htmlContent);
    setOriginalContent(htmlContent);
    setHasChanges(false);
    setContentVersion(prev => prev + 1);
    
    if (onFileEdited && blogInfo?.path) {
      onFileEdited(blogInfo.path, false, null);
    }
  }, [onFileEdited, blogInfo?.path]);

  return {
    editorText,
    editorHtml,
    editorMarkdown,
    editorInitialContent,
    contentVersion,
    hasChanges,
    originalContent,
    handleChange,
    handleUndo,
    handleSaveLocal,
    updateContent,
    setContentVersion,
  };
};

