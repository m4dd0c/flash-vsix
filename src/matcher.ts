import * as vscode from 'vscode';
import { FlashConfig, Match, SearchMode } from './types';

export class Matcher {
  /**
   * Find matches across given editors within their visible ranges.
   */
  public static findMatches(
    editors: vscode.TextEditor[],
    activeEditor: vscode.TextEditor | undefined,
    query: string,
    mode: SearchMode,
    config: FlashConfig
  ): Match[] {
    const results: Match[] = [];
    const maxMatches = config.maxMatchCount;

    for (const editor of editors) {
      if (results.length >= maxMatches) {
        break;
      }

      const editorMatches = this.findMatchesInEditor(
        editor,
        activeEditor,
        query,
        mode,
        config,
        maxMatches - results.length
      );
      results.push(...editorMatches);
    }

    return results;
  }

  /**
   * Find matches within visible lines of a single editor.
   */
  public static findMatchesInEditor(
    editor: vscode.TextEditor,
    activeEditor: vscode.TextEditor | undefined,
    query: string,
    mode: SearchMode,
    config: FlashConfig,
    limit: number
  ): Match[] {
    const doc = editor.document;
    const visibleRanges = editor.visibleRanges;
    if (visibleRanges.length === 0) {
      return [];
    }

    const cursor = activeEditor && activeEditor.document.uri.toString() === editor.document.uri.toString()
      ? activeEditor.selection.active
      : new vscode.Position(visibleRanges[0].start.line, 0);

    const matches: Match[] = [];
    const isSmartCase = config.smartCase;
    const hasUpperCase = /[A-Z]/.test(query);
    const caseSensitive = isSmartCase ? hasUpperCase : false;

    // Build regex based on mode
    const regex = this.buildRegex(query, mode, caseSensitive);
    if (!regex && mode !== 'word' && mode !== 'line') {
      return [];
    }

    for (const vRange of visibleRanges) {
      const startLine = vRange.start.line;
      const endLine = vRange.end.line;

      for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
        if (matches.length >= limit) {
          break;
        }

        const line = doc.lineAt(lineNum);
        const lineText = line.text;

        if (mode === 'line') {
          // Match start of non-whitespace or column 0
          const firstNonWs = line.firstNonWhitespaceCharacterIndex;
          const targetCol = firstNonWs >= 0 && firstNonWs < lineText.length ? firstNonWs : 0;
          const range = new vscode.Range(lineNum, targetCol, lineNum, targetCol + 1);
          const nextChar = lineText.charAt(targetCol + 1) || undefined;
          matches.push(this.createMatch(editor, range, nextChar, cursor));
          continue;
        }

        if (mode === 'word') {
          const wordRegex = /\b\w/g;
          let match: RegExpExecArray | null;
          while ((match = wordRegex.exec(lineText)) !== null) {
            const col = match.index;
            const range = new vscode.Range(lineNum, col, lineNum, col + 1);
            const nextChar = lineText.charAt(col + 1) || undefined;
            matches.push(this.createMatch(editor, range, nextChar, cursor));
            if (matches.length >= limit) {
              break;
            }
          }
          continue;
        }

        if (!regex) {
          continue;
        }

        // Standard regex execution
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(lineText)) !== null) {
          const startCol = match.index;
          const matchLen = match[0].length;
          if (matchLen === 0) {
            regex.lastIndex++;
            continue;
          }

          const endCol = startCol + matchLen;
          const range = new vscode.Range(lineNum, startCol, lineNum, endCol);
          const nextChar = lineText.charAt(endCol) || undefined;

          matches.push(this.createMatch(editor, range, nextChar, cursor));

          if (matches.length >= limit) {
            break;
          }
        }
      }
    }

    return matches;
  }

  /**
   * Helper to create a Match object with calculated distance.
   */
  private static createMatch(
    editor: vscode.TextEditor,
    range: vscode.Range,
    nextChar: string | undefined,
    cursor: vscode.Position
  ): Match {
    const lineDelta = Math.abs(range.start.line - cursor.line);
    const colDelta = Math.abs(range.start.character - cursor.character);
    const distance = lineDelta * 1000 + colDelta;

    return {
      editor,
      range,
      nextChar,
      distance,
    };
  }

  /**
   * Construct RegExp based on query and search mode.
   */
  public static buildRegex(query: string, mode: SearchMode, caseSensitive: boolean): RegExp | null {
    if (!query) {
      return null;
    }

    const flags = caseSensitive ? 'g' : 'gi';

    try {
      if (mode === 'exact') {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, flags);
      }

      if (mode === 'fuzzy') {
        // Build fuzzy pattern: chars separated by non-whitespace (or anything)
        const chars = query.split('').map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const fuzzyPattern = chars.join('[^\\s]*?');
        return new RegExp(fuzzyPattern, flags);
      }

      if (mode === 'regex') {
        return new RegExp(query, flags);
      }
    } catch {
      // Invalid regex while typing
      return null;
    }

    return null;
  }
}
