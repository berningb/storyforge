import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorState } from './useEditorState.js';
import { htmlToMarkdown } from '@react-quill/lib';

vi.mock('@react-quill/lib', () => ({
  htmlToMarkdown: vi.fn((html) => `# Markdown\n${html}`),
  markdownToHtml: vi.fn((md) => `<p>${md}</p>`),
}));

describe('useEditorState', () => {
  const mockBlogInfo = { path: 'test.md' };
  const mockOnFileEdited = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with initial content', () => {
    const initialContent = '<p>Initial content</p>';

    const { result } = renderHook(() =>
      useEditorState({
        initialContent,
        blogInfo: mockBlogInfo,
        onFileEdited: mockOnFileEdited,
      })
    );

    expect(result.current.editorHtml).toBe(initialContent);
    expect(result.current.hasChanges).toBe(false);
  });

  it('should handle content changes', () => {
    const initialContent = '<p>Initial</p>';
    const newContent = '<p>Updated</p>';

    const { result } = renderHook(() =>
      useEditorState({
        initialContent,
        blogInfo: mockBlogInfo,
        onFileEdited: mockOnFileEdited,
      })
    );

    act(() => {
      result.current.handleChange('Updated', newContent, '# Markdown');
    });

    expect(result.current.editorHtml).toBe(newContent);
    expect(result.current.hasChanges).toBe(true);
  });

  it('should call onFileEdited when content changes', () => {
    const initialContent = '<p>Initial</p>';
    const newContent = '<p>Updated</p>';

    const { result } = renderHook(() =>
      useEditorState({
        initialContent,
        blogInfo: mockBlogInfo,
        onFileEdited: mockOnFileEdited,
      })
    );

    act(() => {
      result.current.handleChange('Updated', newContent, '# Markdown');
    });

    expect(mockOnFileEdited).toHaveBeenCalledWith(
      'test.md',
      true,
      expect.objectContaining({
        html: newContent,
        markdown: '# Markdown',
      })
    );
  });

  it('should handle undo', () => {
    const initialContent = '<p>Initial</p>';
    const newContent = '<p>Updated</p>';

    const { result } = renderHook(() =>
      useEditorState({
        initialContent,
        blogInfo: mockBlogInfo,
        onFileEdited: mockOnFileEdited,
      })
    );

    act(() => {
      result.current.handleChange('Updated', newContent, '# Markdown');
    });

    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.handleUndo();
    });

    expect(result.current.editorHtml).toBe(initialContent);
    expect(result.current.hasChanges).toBe(false);
    expect(mockOnFileEdited).toHaveBeenCalledWith('test.md', false, null);
  });

  it('should handle save local', () => {
    const initialContent = '<p>Initial</p>';
    const newContent = '<p>Updated</p>';

    const { result } = renderHook(() =>
      useEditorState({
        initialContent,
        blogInfo: mockBlogInfo,
        onFileEdited: mockOnFileEdited,
      })
    );

    act(() => {
      result.current.handleChange('Updated', newContent, '# Markdown');
    });

    act(() => {
      result.current.handleSaveLocal();
    });

    expect(result.current.hasChanges).toBe(false);
    expect(result.current.originalContent).toBe(newContent);
  });

  it('should update content', () => {
    const initialContent = '<p>Initial</p>';
    const updatedContent = '<p>Updated</p>';

    const { result } = renderHook(() =>
      useEditorState({
        initialContent,
        blogInfo: mockBlogInfo,
        onFileEdited: mockOnFileEdited,
      })
    );

    act(() => {
      result.current.updateContent(updatedContent, '# Updated Markdown');
    });

    expect(result.current.editorHtml).toBe(updatedContent);
    expect(result.current.editorMarkdown).toBe('# Updated Markdown');
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.contentVersion).toBeGreaterThan(0);
  });

  it('should not mark as changed if content is same as original', () => {
    const initialContent = '<p>Initial</p>';

    const { result } = renderHook(() =>
      useEditorState({
        initialContent,
        blogInfo: mockBlogInfo,
        onFileEdited: mockOnFileEdited,
      })
    );

    act(() => {
      result.current.handleChange('Initial', initialContent, '# Markdown');
    });

    expect(result.current.hasChanges).toBe(false);
  });

  it('should increment contentVersion on undo', () => {
    const initialContent = '<p>Initial</p>';
    const newContent = '<p>Updated</p>';

    const { result } = renderHook(() =>
      useEditorState({
        initialContent,
        blogInfo: mockBlogInfo,
        onFileEdited: mockOnFileEdited,
      })
    );

    const initialVersion = result.current.contentVersion;

    act(() => {
      result.current.handleChange('Updated', newContent, '# Markdown');
      result.current.handleUndo();
    });

    expect(result.current.contentVersion).toBeGreaterThan(initialVersion);
  });
});

