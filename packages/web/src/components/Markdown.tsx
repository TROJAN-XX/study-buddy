import React, { useMemo } from 'react';
import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MarkdownProps {
  content: string;
  /** `inline` omits the wrapping paragraph (useful inside table cells/labels). */
  variant?: 'block' | 'inline';
  className?: string;
}

const MATH_TOKEN_PREFIX = '@@SB_MATH_';
const MATH_TOKEN_SUFFIX = '@@';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMath(expression: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
      output: 'html',
    });
  } catch {
    return `<code>${escapeHtml(expression)}</code>`;
  }
}

/**
 * Replaces `$…$`, `$$…$$`, `\(…\)` and `\[…\]` with opaque tokens and renders
 * each expression through KaTeX. Fenced code blocks and inline code spans are
 * left untouched so literal `$` in code stays literal.
 */
function protectMath(source: string): { text: string; rendered: string[] } {
  const rendered: string[] = [];

  const stash = (expression: string, displayMode: boolean): string => {
    const token = `${MATH_TOKEN_PREFIX}${rendered.length}${MATH_TOKEN_SUFFIX}`;
    rendered.push(renderMath(expression, displayMode));
    return token;
  };

  const replaceInText = (text: string): string =>
    text
      // Display math on a single line
      .replace(/\$\$([^$\n]+?)\$\$/g, (_match, expression: string) => stash(expression, true))
      .replace(/\\\[([\s\S]+?)\\\]/g, (_match, expression: string) => stash(expression, true))
      // Inline math
      .replace(/\$([^$\n]+?)\$/g, (_match, expression: string) => stash(expression, false))
      .replace(/\\\(([\s\S]+?)\\\)/g, (_match, expression: string) => stash(expression, false));

  const lines = source.split('\n');
  let inFence = false;
  const output: string[] = [];

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    // Protect inline code spans before touching math delimiters.
    output.push(
      line
        .split(/(`[^`]*`)/g)
        .map((part) => (part.startsWith('`') && part.endsWith('`') ? part : replaceInText(part)))
        .join('')
    );
  }

  return { text: output.join('\n'), rendered };
}

function restoreMath(html: string, rendered: string[]): string {
  if (rendered.length === 0) return html;
  return html.replace(
    new RegExp(`${MATH_TOKEN_PREFIX}(\\d+)${MATH_TOKEN_SUFFIX}`, 'g'),
    (_match, index: string) => rendered[Number(index)] ?? ''
  );
}

/**
 * Offline-safe Markdown + KaTeX renderer.
 *
 * Raw HTML in the source is neutralised (only `<` is escaped, which is enough
 * to prevent tag injection while preserving blockquotes) and KaTeX is
 * configured with `trust: false`.
 */
export const Markdown: React.FC<MarkdownProps> = ({ content, variant = 'block', className }) => {
  const html = useMemo(() => {
    if (!content) return '';

    const { text, rendered } = protectMath(content);
    const safeSource = text.replace(/</g, '&lt;');

    marked.setOptions({ gfm: true, breaks: true });

    let parsed: string;
    try {
      parsed =
        variant === 'inline'
          ? (marked.parseInline(safeSource) as string)
          : (marked.parse(safeSource, { async: false }) as string);
    } catch (error) {
      console.error('[Markdown] Failed to parse content:', error);
      return escapeHtml(content);
    }

    // Neutralise script-bearing URLs (marked does not sanitise link targets).
    const safeHtml = parsed
      .replace(/(href|src)\s*=\s*"(?:javascript|vbscript):[^"]*"/gi, '$1="#"')
      .replace(/href\s*=\s*"data:[^"]*"/gi, 'href="#"');

    return restoreMath(safeHtml, rendered);
  }, [content, variant]);

  if (!content) return null;

  if (variant === 'inline') {
    return (
      <span
        className={className}
        // Content is sanitised above and math is rendered by KaTeX (trust: false).
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div
      className={['markdown-body', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
