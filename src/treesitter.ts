import * as vscode from 'vscode';
import { Match } from './types';

export class TreesitterHelper {
  /**
   * Resolve syntactic AST node hierarchy for the current cursor position
   * using VS Code's SelectionRangeProvider.
   */
  public static async getSelectionRanges(
    editor: vscode.TextEditor,
    position: vscode.Position
  ): Promise<vscode.Range[]> {
    const doc = editor.document;
    const ranges: vscode.Range[] = [];

    try {
      const results = await vscode.commands.executeCommand<vscode.SelectionRange[]>(
        'vscode.executeSelectionRangeProvider',
        doc.uri,
        [position]
      );

      if (!results || results.length === 0) {
        // Fallback: word range, line range, whole document
        const wordRange = doc.getWordRangeAtPosition(position);
        if (wordRange) {
          ranges.push(wordRange);
        }
        ranges.push(doc.lineAt(position.line).range);
        return ranges;
      }

      let current: vscode.SelectionRange | undefined = results[0];
      const seen = new Set<string>();

      while (current) {
        const key = `${current.range.start.line}:${current.range.start.character}-${current.range.end.line}:${current.range.end.character}`;
        if (!seen.has(key)) {
          seen.add(key);
          ranges.push(current.range);
        }
        current = current.parent;
      }
    } catch {
      // Fallback if provider fails
      const wordRange = editor.document.getWordRangeAtPosition(position);
      if (wordRange) {
        ranges.push(wordRange);
      }
      ranges.push(editor.document.lineAt(position.line).range);
    }

    return ranges;
  }

  /**
   * Build Matches for AST ranges so they can be labeled and selected
   */
  public static async buildAstMatches(
    editor: vscode.TextEditor,
    cursor: vscode.Position
  ): Promise<Match[]> {
    const ranges = await this.getSelectionRanges(editor, cursor);
    const matches: Match[] = [];

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      matches.push({
        editor,
        range,
        astDepth: i,
        distance: i, // Innermost nodes get priority
      });
    }

    return matches;
  }
}
