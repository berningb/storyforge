import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaveHandlers } from './useSaveHandlers.js';
import { updateFileContent, getFileSha, fetchFileContent } from '../lib/github.js';
import { htmlToMarkdown, markdownToHtml } from '@react-quill/lib';

vi.mock('../lib/github.js');
vi.mock('@react-quill/lib', () => ({
  htmlToMarkdown: vi.fn((html) => `# Markdown\n${html}`),
  markdownToHtml: vi.fn((md) => `<p>${md}</p>`),
}));

describe('useSaveHandlers', () => {
  const mockBlogInfo = {
    repo: 'owner/repo',
    path: 'test.md',
    branch: 'main',
  };
  const mockGithubToken = 'token123';
  const mockEditorHtml = '<p>Content</p>';
  const mockEditorMarkdown = '# Markdown\nContent';
  const mockOnFileEdited = vi.fn();
  const mockUpdateContent = vi.fn();
  const mockSetFileSha = vi.fn();
  const mockFileSha = 'abc123';

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
  });

  const defaultProps = {
    blogInfo: mockBlogInfo,
    githubToken: mockGithubToken,
    editorHtml: mockEditorHtml,
    editorMarkdown: mockEditorMarkdown,
    contentToUse: mockEditorHtml,
    onFileEdited: mockOnFileEdited,
    updateContent: mockUpdateContent,
    setFileSha: mockSetFileSha,
    fileSha: mockFileSha,
  };

  describe('handleSave', () => {
    it('should save file successfully', async () => {
      vi.mocked(getFileSha).mockResolvedValue('abc123');
      vi.mocked(updateFileContent).mockResolvedValue({
        content: { sha: 'newsha' },
      });

      const { result } = renderHook(() => useSaveHandlers(defaultProps));

      await act(async () => {
        await result.current.handleSave('Update test', vi.fn());
      });

      expect(updateFileContent).toHaveBeenCalledWith(
        'owner',
        'repo',
        'test.md',
        expect.any(String),
        'abc123',
        'main',
        'Update test',
        'token123'
      );
      expect(mockSetFileSha).toHaveBeenCalledWith('newsha');
      expect(global.alert).toHaveBeenCalledWith('File saved successfully to GitHub!');
    });

    it('should fetch latest SHA before saving', async () => {
      vi.mocked(getFileSha).mockResolvedValue('newsha');
      vi.mocked(updateFileContent).mockResolvedValue({
        content: { sha: 'newsha' },
      });

      const { result } = renderHook(() => useSaveHandlers(defaultProps));

      await act(async () => {
        await result.current.handleSave('Update test');
      });

      expect(getFileSha).toHaveBeenCalled();
      expect(mockSetFileSha).toHaveBeenCalledWith('newsha');
    });

    it('should show error if file info missing', async () => {
      const { result } = renderHook(() =>
        useSaveHandlers({
          ...defaultProps,
          blogInfo: null,
        })
      );

      await act(async () => {
        await result.current.handleSave('Update test');
      });

      expect(result.current.saveError).toContain('File information missing');
    });

    it('should show error if token missing', async () => {
      const { result } = renderHook(() =>
        useSaveHandlers({
          ...defaultProps,
          githubToken: null,
        })
      );

      await act(async () => {
        await result.current.handleSave('Update test');
      });

      expect(result.current.saveError).toContain('GitHub access token required');
    });

    it('should show error if commit message empty', async () => {
      const { result } = renderHook(() => useSaveHandlers(defaultProps));

      await act(async () => {
        await result.current.handleSave('');
      });

      expect(result.current.saveError).toContain('commit message');
    });

    it('should handle SHA mismatch error', async () => {
      vi.mocked(getFileSha).mockResolvedValue('abc123');
      vi.mocked(updateFileContent).mockRejectedValue(
        new Error('sha does not match')
      );

      const { result } = renderHook(() => useSaveHandlers(defaultProps));

      await act(async () => {
        await result.current.handleSave('Update test');
      });

      expect(result.current.isShaMismatchError).toBe(true);
      expect(result.current.saveError).toContain('modified on GitHub');
    });
  });

  describe('handleFetchLatest', () => {
    it('should fetch latest file content', async () => {
      vi.mocked(fetchFileContent).mockResolvedValue('# Latest Markdown');
      vi.mocked(getFileSha).mockResolvedValue('latestsha');

      const { result } = renderHook(() => useSaveHandlers(defaultProps));

      await act(async () => {
        await result.current.handleFetchLatest();
      });

      expect(fetchFileContent).toHaveBeenCalledWith(
        'owner',
        'repo',
        'test.md',
        'main',
        'token123'
      );
      expect(mockUpdateContent).toHaveBeenCalledWith(
        expect.any(String),
        '# Latest Markdown'
      );
      expect(mockSetFileSha).toHaveBeenCalledWith('latestsha');
      expect(global.alert).toHaveBeenCalledWith('File fetched successfully from GitHub!');
    });

    it('should handle fetch error', async () => {
      vi.mocked(fetchFileContent).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useSaveHandlers(defaultProps));

      await act(async () => {
        await result.current.handleFetchLatest();
      });

      expect(result.current.fetchError).toBeTruthy();
      expect(result.current.fetchError.toLowerCase()).toContain('fetch');
    });
  });

  describe('handleFetchLatestAndRetry', () => {
    it('should fetch latest and retry save', async () => {
      vi.mocked(getFileSha).mockResolvedValue('latestsha');
      vi.mocked(updateFileContent).mockResolvedValue({
        content: { sha: 'newsha' },
      });

      const { result } = renderHook(() => useSaveHandlers(defaultProps));

      await act(async () => {
        await result.current.handleFetchLatestAndRetry('Update test', vi.fn());
      });

      expect(getFileSha).toHaveBeenCalled();
      expect(updateFileContent).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('File saved successfully to GitHub!');
    });

    it('should handle save error after fetch', async () => {
      vi.mocked(getFileSha).mockResolvedValue('latestsha');
      vi.mocked(updateFileContent).mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useSaveHandlers(defaultProps));

      await act(async () => {
        await result.current.handleFetchLatestAndRetry('Update test');
      });

      expect(result.current.saveError).toBeTruthy();
      expect(result.current.saveError.toLowerCase()).toContain('save');
    });
  });
});

