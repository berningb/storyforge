import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RichTextEditor } from '@react-quill/lib';
import { htmlToMarkdown } from '@react-quill/lib';
import { useAuth } from '../contexts/AuthContext';
import { useRepo } from '../contexts/RepoContext';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { getFileSha } from '../lib/github';
import { MOCK_TEXT, PASTEL_COLORS, highlightWordsMultiColor } from '../utils/editorUtils';
import { useEditorState } from '../hooks/useEditorState';
import { useSaveHandlers } from '../hooks/useSaveHandlers';
import { SynonymFinder } from '../components/Editor/SynonymFinder';
import { CharacterLegend } from '../components/Editor/CharacterLegend';
import { LocationLegend } from '../components/Editor/LocationLegend';
import { KeywordLegend } from '../components/Editor/KeywordLegend';
import { StatsPanel } from '../components/Editor/StatsPanel';
import { SaveModal } from '../components/Editor/SaveModal';
import { AddEntityModal } from '../components/Editor/AddEntityModal';
import { TokenInputModal } from '../components/Editor/TokenInputModal';

export const IndexPage = ({ initialContent, blogInfo, onBack, onFileEdited }) => {
  const { currentUser, githubToken, setGitHubToken } = useAuth();
  const { characters, locations, keywords, addCharacter, removeCharacter, addLocation, removeLocation, addKeyword, removeKeyword } = useRepo();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [fileSha, setFileSha] = useState(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [highlightCharacters, setHighlightCharacters] = useState(false);
  const [highlightLocations, setHighlightLocations] = useState(false);
  const [highlightKeywords, setHighlightKeywords] = useState(true);
  const [showAddEntityModal, setShowAddEntityModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [entityType, setEntityType] = useState('character');
  const [forcePreview, setForcePreview] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [userManuallyToggled, setUserManuallyToggled] = useState(false);
  const [synonymSearchWord, setSynonymSearchWord] = useState('');

  const contentToUse = useMemo(() => initialContent || MOCK_TEXT, [initialContent]);

  const {
    editorText,
    editorHtml,
    editorMarkdown,
    editorInitialContent,
    contentVersion,
    hasChanges,
    handleChange,
    handleUndo,
    handleSaveLocal,
    updateContent,
    setContentVersion,
  } = useEditorState({
    initialContent: contentToUse,
    blogInfo,
    onFileEdited,
  });

  const {
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
  } = useSaveHandlers({
    blogInfo,
    githubToken,
    editorHtml,
    editorMarkdown,
    contentToUse,
    onFileEdited,
    updateContent,
    setFileSha,
    fileSha,
  });

  useEffect(() => {
    if (blogInfo?.sha && !fileSha) {
      setFileSha(blogInfo.sha);
    }
  }, [blogInfo?.sha, fileSha]);


  const getWordAtCursor = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const text = range.toString();
    
    if (text.trim()) {
      return text.trim().split(/\s+/)[0];
    }
    
    const container = range.commonAncestorContainer;
    let textNode = container;
    
    if (textNode.nodeType !== Node.TEXT_NODE) {
      textNode = textNode.childNodes[range.startOffset] || textNode.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
        return null;
      }
    }
    
    const textContent = textNode.textContent || '';
    const getTextOffset = (node) => {
      let offset = 0;
      let sibling = node.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.TEXT_NODE) {
          offset += sibling.textContent.length;
        } else if (sibling.nodeType === Node.ELEMENT_NODE) {
          offset += sibling.textContent.length;
        }
        sibling = sibling.previousSibling;
      }
      return offset;
    };
    
    const offset = range.startOffset - (textNode === container ? 0 : getTextOffset(textNode));
    const beforeCursor = textContent.substring(0, offset);
    const afterCursor = textContent.substring(offset);
    const beforeMatch = beforeCursor.match(/(\w+)$/);
    const afterMatch = afterCursor.match(/^(\w+)/);
    const wordBefore = beforeMatch ? beforeMatch[1] : '';
    const wordAfter = afterMatch ? afterMatch[1] : '';
    const word = wordBefore + wordAfter;
    return word || null;
  }, []);

  useEffect(() => {
    const handleEditorClick = (e) => {
      if (isPreviewMode) return;
      const editorArea = e.target.closest('.ql-editor, [contenteditable="true"]');
      if (!editorArea) return;
      
      setTimeout(() => {
        const word = getWordAtCursor();
        if (word && word.length > 1) {
          setSynonymSearchWord(word);
        }
      }, 100);
    };
    
    document.addEventListener('click', handleEditorClick);
    return () => {
      document.removeEventListener('click', handleEditorClick);
    };
  }, [getWordAtCursor, isPreviewMode]);

  useEffect(() => {
    if (!userManuallyToggled) {
      if (highlightKeywords || highlightCharacters || highlightLocations) {
        setForcePreview(true);
      } else {
        setForcePreview(null);
      }
    }
  }, [highlightKeywords, highlightCharacters, highlightLocations, userManuallyToggled]);

  const handlePreviewChange = useCallback((preview) => {
    setIsPreviewMode(preview);
    setUserManuallyToggled(true);
    setForcePreview(null);
  }, []);

  const handleAddCharacter = useCallback(async (name) => {
    await addCharacter(name);
  }, [addCharacter]);

  const handleAddLocation = useCallback(async (name) => {
    await addLocation(name);
  }, [addLocation]);

  const handleRemoveCharacter = useCallback(async (name) => {
    await removeCharacter(name);
  }, [removeCharacter]);

  const handleRemoveLocation = useCallback(async (name) => {
    await removeLocation(name);
  }, [removeLocation]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          const selectedText = selection.toString().trim();
          if (selectedText.length > 0 && selectedText.length < 100) {
            setSelectedText(selectedText);
            setShowAddEntityModal(true);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleWordClick = useCallback(async (word) => {
    if (!word || word.length < 2) return;
    
    const normalizedWord = word.toLowerCase().trim();
    const existingIndex = keywords.findIndex(k => k.word.toLowerCase() === normalizedWord);
    
    if (existingIndex >= 0) {
      // Remove keyword - call handler which will update DB and RepoAnalysisPage state
        console.log('🔴 REMOVING KEYWORD:', {
          word: normalizedWord,
          keywordToRemove: keywords[existingIndex],
          allKeywords: keywords
        });
      
      const keywordToPass = keywords[existingIndex].word;
      console.log('🔴 Removing keyword:', {
        keywordToPass,
        keywordObject: keywords[existingIndex]
      });
      await removeKeyword(keywordToPass);
    } else {
      // Add keyword - call handler which will update DB and RepoAnalysisPage state
      const usedColors = keywords.map(k => k.color.class);
      const availableColor = PASTEL_COLORS.find(c => !usedColors.includes(c.class)) || PASTEL_COLORS[keywords.length % PASTEL_COLORS.length];
      
      console.log('🔵 ADDING KEYWORD:', {
        word: normalizedWord,
        color: availableColor
      });
      await addKeyword(normalizedWord, availableColor);
    }
  }, [keywords, addKeyword, removeKeyword]);

  const highlightWords = useMemo(() => {
    const words = [];
    if (highlightKeywords) {
      words.push(...keywords.map(k => k.word));
    }
    if (highlightCharacters) {
      words.push(...characters);
    }
    if (highlightLocations) {
      words.push(...locations);
    }
    return words;
  }, [keywords, highlightKeywords, highlightCharacters, highlightLocations, characters, locations]);
  
  const highlightWordColors = useMemo(() => {
    const colors = [];
    if (highlightKeywords) {
      colors.push(...keywords);
    }
    if (highlightCharacters) {
      characters.forEach(char => {
        if (!colors.find(c => c.word.toLowerCase() === char.toLowerCase())) {
          colors.push({ word: char, color: { class: 'bg-purple-200', text: 'text-purple-800' } });
        }
      });
    }
    if (highlightLocations) {
      locations.forEach(loc => {
        if (!colors.find(c => c.word.toLowerCase() === loc.toLowerCase())) {
          colors.push({ word: loc, color: { class: 'bg-blue-200', text: 'text-blue-800' } });
        }
      });
    }
    return colors;
  }, [keywords, highlightKeywords, highlightCharacters, highlightLocations, characters, locations]);

  const stats = useMemo(() => {
    const text = editorText || '';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;
    const totalChars = text.length;
    const totalCharsNoSpaces = text.replace(/\s/g, '').length;
    
    const highlightedCounts = keywords.map(keyword => {
      const regex = new RegExp(`\\b${keyword.word}\\b`, 'gi');
      const matches = text.match(regex);
      return {
        word: keyword.word,
        count: matches ? matches.length : 0,
        color: keyword.color,
      };
    });

    const totalHighlighted = highlightedCounts.reduce((sum, item) => sum + item.count, 0);
    const uniqueHighlighted = highlightedCounts.filter(item => item.count > 0).length;

    return {
      totalWords,
      totalChars,
      totalCharsNoSpaces,
      totalHighlighted,
      uniqueHighlighted,
      highlightedCounts,
    };
  }, [editorText, keywords]);

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4 shadow-lg shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">StoryForge</h1>
          <div className="flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Back Button */}
      {onBack && (
        <div className="bg-slate-800 border-b border-slate-700 px-8 py-3 shrink-0">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2"
              title="Back to file list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {blogInfo?.repo ? (
                <span>{blogInfo.repo.replace('/', ' / ')}</span>
              ) : (
                <span>Back to Repositories</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden min-h-0 p-4 gap-4">
        {/* Left Side - Editor */}
        <div className="w-1/2 flex flex-col overflow-hidden border border-slate-700 rounded-lg bg-slate-800 min-h-0 shadow-lg">
          {blogInfo && !isPreviewMode && (
            <div className="px-6 py-3 shrink-0 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={!hasChanges}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo changes"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Undo
                </button>
                {hasChanges && (
                  <span className="text-xs text-yellow-400 flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    Unsaved changes
                  </span>
                )}
              </div>
              <button
                onClick={handleSaveLocal}
                disabled={!hasChanges}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg transition-colors text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save changes locally (does not commit to GitHub)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </button>
            </div>
          )}

          {blogInfo && isPreviewMode && (
            <div className="px-6 py-3 shrink-0 flex items-center gap-2 border-b border-slate-700">
              <button
                onClick={() => setHighlightCharacters(!highlightCharacters)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                  highlightCharacters 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title="Toggle character highlighting"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Characters ({characters.length})
              </button>
              <button
                onClick={() => setHighlightLocations(!highlightLocations)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                  highlightLocations 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title="Toggle location highlighting"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Locations ({locations.length})
              </button>
              <button
                onClick={() => setHighlightKeywords(!highlightKeywords)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                  highlightKeywords 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title="Toggle keyword highlighting"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Keywords ({keywords.length})
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden p-6 min-h-0">
            <div className="h-full flex flex-col min-h-0 overflow-auto">
              <RichTextEditor
                key={`${blogInfo?.path || 'editor'}-${contentVersion}`}
                placeholder="Start typing..."
                initialContent={editorInitialContent}
                highlightWords={highlightWords}
                highlightWordColors={highlightWordColors}
                onChange={handleChange}
                onWordClick={handleWordClick}
                hideModeSwitcher={false}
                forcePreview={forcePreview}
                onPreviewChange={handlePreviewChange}
              />
            </div>
          </div>
        </div>

        {/* Right Side - Legend and Stats */}
        <div className="w-1/2 bg-slate-800 flex flex-col overflow-hidden border border-slate-700 rounded-lg min-h-0 shadow-lg">
          {highlightCharacters && isPreviewMode && (
            <CharacterLegend
              characters={characters}
              keywords={keywords}
              onRemoveKeyword={removeKeyword}
              handleAddCharacter={handleAddCharacter}
              handleRemoveLocation={handleRemoveLocation}
            />
          )}

          {highlightLocations && isPreviewMode && (
            <LocationLegend
              locations={locations}
              keywords={keywords}
              onRemoveKeyword={removeKeyword}
              handleAddLocation={handleAddLocation}
              handleRemoveCharacter={handleRemoveCharacter}
            />
          )}

          {isPreviewMode && (
            <KeywordLegend
              keywords={keywords}
              onAddKeyword={addKeyword}
              onRemoveKeyword={removeKeyword}
              stats={stats}
              handleWordClick={handleWordClick}
              handleRemoveCharacter={handleRemoveCharacter}
              handleRemoveLocation={handleRemoveLocation}
            />
          )}

          {isPreviewMode && <StatsPanel stats={stats} />}

          {!isPreviewMode && (
            <div className="flex-1 overflow-hidden p-6 bg-gradient-to-b from-slate-800 to-slate-900 min-h-0">
              <div className="h-full flex flex-col">
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 flex-1 flex flex-col min-h-0 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Synonym Finder
                  </h3>
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <SynonymFinder synonymSearchWord={synonymSearchWord} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <SaveModal
        showSaveModal={showSaveModal}
        setShowSaveModal={setShowSaveModal}
        commitMessage={commitMessage}
        setCommitMessage={setCommitMessage}
        saveError={saveError}
        isSaving={isSaving}
        isFetching={isFetching}
        isShaMismatchError={isShaMismatchError}
        githubToken={githubToken}
        setShowTokenInput={setShowTokenInput}
        handleSave={(msg, onSuccess) => handleSave(msg, () => {
          setShowSaveModal(false);
          setCommitMessage('');
          onSuccess?.();
        })}
        handleFetchLatestAndRetry={(msg, onSuccess) => handleFetchLatestAndRetry(msg, () => {
          setShowSaveModal(false);
          setCommitMessage('');
          onSuccess?.();
        })}
      />

      <AddEntityModal
        showAddEntityModal={showAddEntityModal}
        setShowAddEntityModal={setShowAddEntityModal}
        selectedText={selectedText}
        setSelectedText={setSelectedText}
        entityType={entityType}
        setEntityType={setEntityType}
        handleAddCharacter={handleAddCharacter}
        handleAddLocation={handleAddLocation}
      />

      <TokenInputModal
        showTokenInput={showTokenInput}
        setShowTokenInput={setShowTokenInput}
        tokenInput={tokenInput}
        setTokenInput={setTokenInput}
        setGitHubToken={setGitHubToken}
      />
    </div>
  );
};
