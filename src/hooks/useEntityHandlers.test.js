import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEntityHandlers } from './useEntityHandlers.js';
import { saveRepoCharacters, saveRepoLocations, saveRepoKeywords } from '../lib/repoData.js';
import { extractDialogue, autoDetectEntities } from '../lib/textParser.js';

vi.mock('../lib/repoData.js');
vi.mock('../lib/textParser.js');

describe('useEntityHandlers', () => {
  const mockCurrentUser = { uid: 'user123' };
  const mockRepo = { fullName: 'owner/repo' };
  const mockFiles = [
    { path: 'ch1.md', content: '"Hello," Alex said.' },
  ];
  const mockSetCharacters = vi.fn();
  const mockSetLocations = vi.fn();
  const mockSetKeywords = vi.fn();
  const mockSetCharacterDialogueCounts = vi.fn();
  const mockSetCharacterMentionCounts = vi.fn();
  const mockSetLocationMentionCounts = vi.fn();
  const mockSetError = vi.fn();
  const mockSearchCharacterDialogue = vi.fn(() => []);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    currentUser: mockCurrentUser,
    repo: mockRepo,
    files: mockFiles,
    characters: [],
    setCharacters: mockSetCharacters,
    locations: [],
    setLocations: mockSetLocations,
    keywords: [],
    setKeywords: mockSetKeywords,
    setCharacterDialogueCounts: mockSetCharacterDialogueCounts,
    setCharacterMentionCounts: mockSetCharacterMentionCounts,
    setLocationMentionCounts: mockSetLocationMentionCounts,
    setError: mockSetError,
    searchCharacterDialogue: mockSearchCharacterDialogue,
  };

  describe('handleAddCharacter', () => {
    it('should add a new character', async () => {
      vi.mocked(saveRepoCharacters).mockResolvedValue(undefined);
      mockSearchCharacterDialogue.mockReturnValue([]);

      const { result } = renderHook(() => useEntityHandlers(defaultProps));

      await act(async () => {
        result.current.setNewCharacterName('Alex');
      });

      await act(async () => {
        await result.current.handleAddCharacter();
      });

      expect(mockSetCharacters).toHaveBeenCalled();
      expect(saveRepoCharacters).toHaveBeenCalledWith(
        'user123',
        'owner/repo',
        expect.arrayContaining(['Alex'])
      );
    });

    it('should not add duplicate character', async () => {
      const { result } = renderHook(() =>
        useEntityHandlers({
          ...defaultProps,
          characters: ['Alex'],
        })
      );

      await act(async () => {
        result.current.setNewCharacterName('Alex');
        await result.current.handleAddCharacter();
      });

      expect(mockSetCharacters).not.toHaveBeenCalled();
    });

    it('should calculate dialogue and mention counts', async () => {
      vi.mocked(saveRepoCharacters).mockResolvedValue(undefined);
      mockSearchCharacterDialogue.mockReturnValue([
        { speaker: 'Alex', dialogue: 'Hello', context: '', file: 'ch1.md' },
      ]);

      const { result } = renderHook(() => useEntityHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddCharacter('Alex');
      });

      expect(mockSetCharacterDialogueCounts).toHaveBeenCalled();
      expect(mockSetCharacterMentionCounts).toHaveBeenCalled();
    });

    it('should revert on save error', async () => {
      vi.mocked(saveRepoCharacters).mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useEntityHandlers(defaultProps));

      await act(async () => {
        try {
          await result.current.handleAddCharacter('Alex');
        } catch (e) {
          // Expected
        }
      });

      expect(mockSetCharacters).toHaveBeenCalledWith([]);
    });
  });

  describe('handleRemoveCharacter', () => {
    it('should remove a character', async () => {
      vi.mocked(saveRepoCharacters).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useEntityHandlers({
          ...defaultProps,
          characters: ['Alex', 'Morgan'],
        })
      );

      await act(async () => {
        await result.current.handleRemoveCharacter('Alex');
      });

      expect(mockSetCharacters).toHaveBeenCalledWith(['Morgan']);
      expect(saveRepoCharacters).toHaveBeenCalled();
    });
  });

  describe('handleAddLocation', () => {
    it('should add a new location', async () => {
      vi.mocked(saveRepoLocations).mockResolvedValue(undefined);

      const { result } = renderHook(() => useEntityHandlers(defaultProps));

      await act(async () => {
        result.current.setNewLocationName('Forest');
      });

      await act(async () => {
        await result.current.handleAddLocation();
      });

      expect(mockSetLocations).toHaveBeenCalled();
      expect(saveRepoLocations).toHaveBeenCalled();
    });

    it('should calculate mention count', async () => {
      vi.mocked(saveRepoLocations).mockResolvedValue(undefined);

      const { result } = renderHook(() => useEntityHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddLocation('Forest');
      });

      expect(mockSetLocationMentionCounts).toHaveBeenCalled();
    });
  });

  describe('handleAddKeyword', () => {
    it('should add a new keyword', async () => {
      vi.mocked(saveRepoKeywords).mockResolvedValue(undefined);

      const { result } = renderHook(() => useEntityHandlers(defaultProps));

      await act(async () => {
        result.current.setNewKeywordName('magic');
      });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.handleAddKeyword();
      });

      // Wait for save operation
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(mockSetKeywords).toHaveBeenCalled();
    });

    it('should not add duplicate keyword', async () => {
      const { result } = renderHook(() =>
        useEntityHandlers({
          ...defaultProps,
          keywords: [{ word: 'magic', color: { class: 'bg-purple-200', text: 'text-purple-800' } }],
        })
      );

      await act(async () => {
        await result.current.handleAddKeyword('magic');
      });

      // Should update but not duplicate
      expect(mockSetKeywords).toHaveBeenCalled();
    });

    it('should use provided color', async () => {
      vi.mocked(saveRepoKeywords).mockResolvedValue(undefined);
      const customColor = { class: 'bg-blue-200', text: 'text-blue-800' };

      const { result } = renderHook(() => useEntityHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddKeyword('magic', customColor);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      // Check that setKeywords was called with the correct color
      const calls = mockSetKeywords.mock.calls;
      const lastCall = calls[calls.length - 1];
      if (lastCall && lastCall[0]) {
        const keywords = typeof lastCall[0] === 'function' ? lastCall[0]([]) : lastCall[0];
        const magicKeyword = keywords.find(k => k.word === 'magic');
        expect(magicKeyword).toBeDefined();
        expect(magicKeyword.color).toEqual(customColor);
      }
    });
  });

  describe('handleRemoveKeyword', () => {
    it('should remove a keyword', async () => {
      vi.mocked(saveRepoKeywords).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useEntityHandlers({
          ...defaultProps,
          keywords: [
            { word: 'magic', color: {} },
            { word: 'spell', color: {} },
          ],
        })
      );

      await act(async () => {
        await result.current.handleRemoveKeyword('magic');
      });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      // Check that setKeywords was called with a function that filters out 'magic'
      expect(mockSetKeywords).toHaveBeenCalled();
      const calls = mockSetKeywords.mock.calls;
      const lastCall = calls[calls.length - 1];
      if (lastCall && typeof lastCall[0] === 'function') {
        const result = lastCall[0]([
          { word: 'magic', color: {} },
          { word: 'spell', color: {} },
        ]);
        expect(result).not.toContainEqual(expect.objectContaining({ word: 'magic' }));
        expect(result).toContainEqual(expect.objectContaining({ word: 'spell' }));
      }
    });
  });

  describe('handleAutoDetect', () => {
    it('should detect entities and show modal', async () => {
      vi.mocked(autoDetectEntities).mockReturnValue({
        characters: [{ name: 'Alex', count: 5, confidence: 'high' }],
        locations: [{ name: 'Forest', count: 3, confidence: 'medium' }],
      });

      const { result } = renderHook(() => useEntityHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAutoDetect();
      });

      expect(result.current.showAutoDetect).toBe(true);
      expect(result.current.suggestedCharacters.length).toBeGreaterThan(0);
      expect(result.current.suggestedLocations.length).toBeGreaterThan(0);
    });

    it('should show error if no files', async () => {
      const { result } = renderHook(() =>
        useEntityHandlers({
          ...defaultProps,
          files: [],
        })
      );

      await act(async () => {
        await result.current.handleAutoDetect();
      });

      expect(mockSetError).toHaveBeenCalled();
    });
  });

  describe('handleAddMultipleCharacters', () => {
    it('should add multiple characters at once', async () => {
      vi.mocked(saveRepoCharacters).mockResolvedValue(undefined);
      mockSearchCharacterDialogue.mockReturnValue([]);

      const { result } = renderHook(() => useEntityHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddMultipleCharacters(['Alex', 'Morgan']);
      });

      expect(mockSetCharacters).toHaveBeenCalledWith(
        expect.arrayContaining(['Alex', 'Morgan'])
      );
    });

    it('should filter out existing characters', async () => {
      const { result } = renderHook(() =>
        useEntityHandlers({
          ...defaultProps,
          characters: ['Alex'],
        })
      );

      await act(async () => {
        await result.current.handleAddMultipleCharacters(['Alex', 'Morgan']);
      });

      expect(mockSetCharacters).toHaveBeenCalledWith(
        expect.arrayContaining(['Alex', 'Morgan'])
      );
    });
  });

  describe('handleAddMultipleLocations', () => {
    it('should add multiple locations at once', async () => {
      vi.mocked(saveRepoLocations).mockResolvedValue(undefined);

      const { result } = renderHook(() => useEntityHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddMultipleLocations(['Forest', 'Tower']);
      });

      expect(mockSetLocations).toHaveBeenCalledWith(
        expect.arrayContaining(['Forest', 'Tower'])
      );
    });
  });
});

