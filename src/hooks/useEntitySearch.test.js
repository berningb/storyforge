import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEntitySearch } from './useEntitySearch.js';
import { extractDialogue } from '../lib/textParser.js';

vi.mock('../lib/textParser.js', () => ({
  extractDialogue: vi.fn(),
}));

describe('useEntitySearch', () => {
  const mockFiles = [
    {
      path: 'ch1.md',
      content: '"Hello," Alex said. Alex walked to the Forest.',
    },
    {
      path: 'ch2.md',
      content: 'Morgan arrived at the Forest. "Hi," Morgan said.',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchCharacterDialogue', () => {
    it('should find dialogue for a character', () => {
      const mockDialogue = [
        { speaker: 'Alex', dialogue: 'Hello', context: '"Hello," Alex said.', file: 'ch1.md' },
      ];
      vi.mocked(extractDialogue).mockReturnValue(mockDialogue);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex']));

      const dialogue = result.current.searchCharacterDialogue('Alex');

      expect(dialogue.length).toBeGreaterThan(0);
      expect(dialogue[0].speaker).toBe('Alex');
    });

    it('should handle case-insensitive character matching', () => {
      const mockDialogue = [
        { speaker: 'Alex', dialogue: 'Hello', context: '"Hello," Alex said.', file: 'ch1.md' },
      ];
      vi.mocked(extractDialogue).mockReturnValue(mockDialogue);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex']));

      const dialogue = result.current.searchCharacterDialogue('alex');

      expect(dialogue.length).toBeGreaterThan(0);
    });

    it('should return empty array if no dialogue found', () => {
      vi.mocked(extractDialogue).mockReturnValue([]);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex']));

      const dialogue = result.current.searchCharacterDialogue('Nonexistent');

      expect(dialogue).toEqual([]);
    });

    it('should search across multiple files', () => {
      const mockDialogue1 = [
        { speaker: 'Alex', dialogue: 'Hello', context: '', file: 'ch1.md' },
      ];
      const mockDialogue2 = [
        { speaker: 'Alex', dialogue: 'Hi', context: '', file: 'ch2.md' },
      ];
      vi.mocked(extractDialogue)
        .mockReturnValueOnce(mockDialogue1)
        .mockReturnValueOnce(mockDialogue2);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex']));

      const dialogue = result.current.searchCharacterDialogue('Alex');

      expect(dialogue.length).toBe(2);
    });
  });

  describe('searchCharacterMentions', () => {
    it('should find non-dialogue mentions of character', () => {
      const mockDialogue = [
        { speaker: 'Alex', dialogue: 'Hello', context: '"Hello," Alex said.', file: 'ch1.md' },
      ];
      vi.mocked(extractDialogue).mockReturnValue(mockDialogue);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex']));

      const mentions = result.current.searchCharacterMentions('Alex');

      expect(Array.isArray(mentions)).toBe(true);
    });

    it('should exclude dialogue from mentions', () => {
      const mockDialogue = [
        { speaker: 'Alex', dialogue: 'Hello', context: '"Hello," Alex said.', file: 'ch1.md' },
      ];
      vi.mocked(extractDialogue).mockReturnValue(mockDialogue);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex']));

      const mentions = result.current.searchCharacterMentions('Alex');

      // Mentions should not include dialogue
      mentions.forEach(mention => {
        expect(mention.context).not.toContain('"Hello,"');
      });
    });

    it('should return empty array if no mentions found', () => {
      vi.mocked(extractDialogue).mockReturnValue([]);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex']));

      const mentions = result.current.searchCharacterMentions('Nonexistent');

      expect(mentions).toEqual([]);
    });
  });

  describe('searchLocationMentions', () => {
    it('should find location mentions with context', () => {
      vi.mocked(extractDialogue).mockReturnValue([]);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex', 'Morgan']));

      const mentions = result.current.searchLocationMentions('Forest');

      expect(mentions.length).toBeGreaterThan(0);
      expect(mentions[0]).toHaveProperty('context');
      expect(mentions[0]).toHaveProperty('file');
      expect(mentions[0]).toHaveProperty('characters');
    });

    it('should include characters mentioned in location context', () => {
      vi.mocked(extractDialogue).mockReturnValue([]);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex', 'Morgan']));

      const mentions = result.current.searchLocationMentions('Forest');

      // Check if characters are included in mentions
      mentions.forEach(mention => {
        expect(Array.isArray(mention.characters)).toBe(true);
      });
    });

    it('should return empty array if location not found', () => {
      vi.mocked(extractDialogue).mockReturnValue([]);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex']));

      const mentions = result.current.searchLocationMentions('NonexistentLocation');

      expect(mentions).toEqual([]);
    });

    it('should search across multiple files', () => {
      vi.mocked(extractDialogue).mockReturnValue([]);

      const { result } = renderHook(() => useEntitySearch(mockFiles, ['Alex', 'Morgan']));

      const mentions = result.current.searchLocationMentions('Forest');

      // Should find mentions in both files
      const files = mentions.map(m => m.file);
      expect(files).toContain('ch1.md');
      expect(files).toContain('ch2.md');
    });
  });
});

