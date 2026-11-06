import * as vscode from 'vscode';
import { CharMotionKind, FlashConfig, Match } from './types';

export interface LastCharMotion {
  kind: CharMotionKind;
  targetChar: string;
}

export class CharMotionHelper {
  private static lastMotion: LastCharMotion | undefined;

  public static getLastMotion(): LastCharMotion | undefined {
    return this.lastMotion;
  }

  public static setLastMotion(kind: CharMotionKind, targetChar: string): void {
    this.lastMotion = { kind, targetChar };
  }

  /**
   * Find matches for a character motion (f, t, F, T)
   */
  public static findCharMatches(
    editor: vscode.TextEditor,
    kind: CharMotionKind,
    targetChar: string,
    config: FlashConfig
  ): Match[] {
    const doc = editor.document;
    const cursor = editor.selection.active;
    const isForward = kind === 'f' || kind === 't';
    const isTill = kind === 't' || kind === 'T';
    const multiLine = config.charMotionMultiLine;

    const startLine = multiLine ? editor.visibleRanges[0]?.start.line ?? cursor.line : cursor.line;
    const endLine = multiLine ? editor.visibleRanges[0]?.end.line ?? cursor.line : cursor.line;

    const matches: Match[] = [];

    for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
      const lineText = doc.lineAt(lineNum).text;

      for (let col = 0; col < lineText.length; col++) {
        const ch = lineText.charAt(col);
        const matchesChar = config.smartCase
          ? ch === targetChar || ch.toLowerCase() === targetChar.toLowerCase()
          : ch === targetChar;

        if (!matchesChar) {
          continue;
        }

        // Check direction relative to cursor
        if (lineNum === cursor.line) {
          if (isForward && col <= cursor.character) {
            continue;
          }
          if (!isForward && col >= cursor.character) {
            continue;
          }
        } else if (isForward && lineNum < cursor.line) {
          continue;
        } else if (!isForward && lineNum > cursor.line) {
          continue;
        }

        // Target position based on motion type
        let targetCol = col;
        if (isTill) {
          targetCol = isForward ? Math.max(0, col - 1) : Math.min(lineText.length, col + 1);
        }

        const range = new vscode.Range(lineNum, targetCol, lineNum, targetCol + 1);
        const lineDelta = Math.abs(lineNum - cursor.line);
        const colDelta = Math.abs(col - cursor.character);
        const distance = lineDelta * 1000 + colDelta;

        matches.push({
          editor,
          range,
          distance,
        });
      }
    }

    // Sort: forward matches sorted ascending from cursor, backward matches sorted ascending distance from cursor
    matches.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    return matches;
  }
}
