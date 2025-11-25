import { describe, it, expect } from 'vitest';
import { highlightWordsMultiColor, PASTEL_COLORS, MOCK_TEXT } from './editorUtils.js';

describe('editorUtils', () => {
  describe('highlightWordsMultiColor', () => {
    it('should return original HTML if no wordColorMap provided', () => {
      const html = '<p>Test content</p>';
      const result = highlightWordsMultiColor(html, null);
      expect(result).toBe(html);
    });

    it('should return original HTML if wordColorMap is empty', () => {
      const html = '<p>Test content</p>';
      const result = highlightWordsMultiColor(html, []);
      expect(result).toBe(html);
    });

    it('should highlight single word', () => {
      const html = '<p>Test content</p>';
      const wordColorMap = [
        {
          word: 'Test',
          color: { class: 'bg-yellow-200', text: 'text-yellow-800' },
        },
      ];

      const result = highlightWordsMultiColor(html, wordColorMap);

      expect(result).toContain('bg-yellow-200');
      expect(result).toContain('text-yellow-800');
      expect(result).toContain('Test');
    });

    it('should highlight multiple words with different colors', () => {
      const html = '<p>Test content here</p>';
      const wordColorMap = [
        {
          word: 'Test',
          color: { class: 'bg-yellow-200', text: 'text-yellow-800' },
        },
        {
          word: 'content',
          color: { class: 'bg-blue-200', text: 'text-blue-800' },
        },
      ];

      const result = highlightWordsMultiColor(html, wordColorMap);

      expect(result).toContain('bg-yellow-200');
      expect(result).toContain('bg-blue-200');
      expect(result).toContain('Test');
      expect(result).toContain('content');
    });

    it('should handle overlapping words (longest first)', () => {
      const html = '<p>Test content</p>';
      const wordColorMap = [
        {
          word: 'Test',
          color: { class: 'bg-yellow-200', text: 'text-yellow-800' },
        },
        {
          word: 'Test content',
          color: { class: 'bg-green-200', text: 'text-green-800' },
        },
      ];

      const result = highlightWordsMultiColor(html, wordColorMap);

      // Longer phrase should be highlighted first
      expect(result).toContain('bg-green-200');
    });

    it('should escape special regex characters in words', () => {
      const html = '<p>Test (special) content</p>';
      const wordColorMap = [
        {
          word: '(special)',
          color: { class: 'bg-yellow-200', text: 'text-yellow-800' },
        },
      ];

      const result = highlightWordsMultiColor(html, wordColorMap);

      expect(result).toContain('(special)');
    });

    it('should not highlight words inside HTML tags', () => {
      const html = '<p class="test-class">Content</p>';
      const wordColorMap = [
        {
          word: 'class',
          color: { class: 'bg-yellow-200', text: 'text-yellow-800' },
        },
      ];

      const result = highlightWordsMultiColor(html, wordColorMap);

      // Should not highlight 'class' inside the tag
      expect(result).toContain('class="test-class"');
      expect(result).not.toContain('bg-yellow-200');
    });

    it('should handle case-insensitive matching', () => {
      const html = '<p>TEST content</p>';
      const wordColorMap = [
        {
          word: 'test',
          color: { class: 'bg-yellow-200', text: 'text-yellow-800' },
        },
      ];

      const result = highlightWordsMultiColor(html, wordColorMap);

      expect(result).toContain('bg-yellow-200');
    });

    it('should handle word boundaries correctly', () => {
      const html = '<p>Testing content</p>';
      const wordColorMap = [
        {
          word: 'test',
          color: { class: 'bg-yellow-200', text: 'text-yellow-800' },
        },
      ];

      const result = highlightWordsMultiColor(html, wordColorMap);

      // Should not match 'test' inside 'Testing' due to word boundary
      expect(result).not.toContain('bg-yellow-200');
    });

    it('should preserve HTML structure', () => {
      const html = '<p>Test <strong>content</strong> here</p>';
      const wordColorMap = [
        {
          word: 'Test',
          color: { class: 'bg-yellow-200', text: 'text-yellow-800' },
        },
      ];

      const result = highlightWordsMultiColor(html, wordColorMap);

      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('</strong>');
      expect(result).toContain('</p>');
    });
  });

  describe('PASTEL_COLORS', () => {
    it('should have 8 color options', () => {
      expect(PASTEL_COLORS.length).toBe(8);
    });

    it('should have valid color structure', () => {
      PASTEL_COLORS.forEach(color => {
        expect(color).toHaveProperty('name');
        expect(color).toHaveProperty('class');
        expect(color).toHaveProperty('text');
        expect(color.class).toMatch(/^bg-\w+-\d+$/);
        expect(color.text).toMatch(/^text-\w+-\d+$/);
      });
    });
  });

  describe('MOCK_TEXT', () => {
    it('should be a string', () => {
      expect(typeof MOCK_TEXT).toBe('string');
    });

    it('should contain HTML content', () => {
      expect(MOCK_TEXT).toContain('<h1>');
      expect(MOCK_TEXT).toContain('<p>');
    });
  });
});

