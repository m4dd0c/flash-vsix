import * as vscode from 'vscode';
import { FlashConfig, Match } from './types';

export class Decorator {
  private backdropDecorationType: vscode.TextEditorDecorationType | undefined;
  private matchDecorationType: vscode.TextEditorDecorationType | undefined;
  private currentDecorationType: vscode.TextEditorDecorationType | undefined;
  private labelDecorationType: vscode.TextEditorDecorationType | undefined;

  constructor() {
    this.createDecorationTypes();
  }

  public reload(config: FlashConfig): void {
    this.dispose();
    this.createDecorationTypes(config);
  }

  private createDecorationTypes(config?: FlashConfig): void {
    const labelBg = config?.labelBackgroundColor ?? '#ff007c';
    const labelFg = config?.labelForegroundColor ?? '#ffffff';
    const matchBg = config?.matchBackgroundColor ?? 'rgba(62, 104, 215, 0.35)';
    const currentBg = config?.currentMatchBackgroundColor ?? 'rgba(255, 150, 108, 0.50)';

    this.backdropDecorationType = vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      opacity: '0.35',
    });

    this.matchDecorationType = vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      backgroundColor: matchBg,
      borderRadius: '2px',
    });

    this.currentDecorationType = vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      backgroundColor: currentBg,
      border: '1px solid rgba(255, 150, 108, 0.9)',
      borderRadius: '2px',
    });

    this.labelDecorationType = vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
  }

  /**
   * Apply all decorations across visible editors
   */
  public update(
    editors: vscode.TextEditor[],
    matches: Match[],
    currentIndex: number,
    config: FlashConfig
  ): void {
    if (!this.backdropDecorationType || !this.matchDecorationType || !this.currentDecorationType || !this.labelDecorationType) {
      this.createDecorationTypes(config);
    }

    // Group matches by editor URI
    const editorMatchesMap = new Map<string, { editor: vscode.TextEditor; matches: Match[] }>();
    for (const ed of editors) {
      editorMatchesMap.set(ed.document.uri.toString(), { editor: ed, matches: [] });
    }
    for (const m of matches) {
      const uriStr = m.editor.document.uri.toString();
      const group = editorMatchesMap.get(uriStr);
      if (group) {
        group.matches.push(m);
      }
    }

    for (const { editor, matches: edMatches } of editorMatchesMap.values()) {
      // 1. Backdrop
      if (config.backdrop && this.backdropDecorationType) {
        editor.setDecorations(this.backdropDecorationType, editor.visibleRanges);
      } else if (this.backdropDecorationType) {
        editor.setDecorations(this.backdropDecorationType, []);
      }

      // 2. Matches & Current Match
      const matchRanges: vscode.Range[] = [];
      const currentRanges: vscode.Range[] = [];
      const labelDecorations: vscode.DecorationOptions[] = [];

      for (let i = 0; i < edMatches.length; i++) {
        const m = edMatches[i];
        const isCurrent = matches.indexOf(m) === currentIndex;

        if (isCurrent) {
          currentRanges.push(m.range);
        } else {
          matchRanges.push(m.range);
        }

        // 3. Jump Label Badges
        if (m.label) {
          const labelDec = this.createLabelDecoration(m, config);
          labelDecorations.push(labelDec);
        }
      }

      if (this.matchDecorationType) {
        editor.setDecorations(this.matchDecorationType, matchRanges);
      }
      if (this.currentDecorationType) {
        editor.setDecorations(this.currentDecorationType, currentRanges);
      }
      if (this.labelDecorationType) {
        editor.setDecorations(this.labelDecorationType, labelDecorations);
      }
    }
  }

  /**
   * Create label decoration badge
   */
  private createLabelDecoration(match: Match, config: FlashConfig): vscode.DecorationOptions {
    const label = match.label!;
    const style = config.labelStyle;

    const badgeCommon = {
      contentText: label,
      backgroundColor: config.labelBackgroundColor,
      color: config.labelForegroundColor,
      fontWeight: 'bold',
      fontStyle: 'normal',
      borderRadius: '3px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    };

    if (style === 'before') {
      return {
        range: new vscode.Range(match.range.start, match.range.start),
        renderOptions: {
          before: {
            ...badgeCommon,
            margin: '0 2px 0 0',
          },
        },
      };
    }

    if (style === 'after') {
      return {
        range: new vscode.Range(match.range.end, match.range.end),
        renderOptions: {
          after: {
            ...badgeCommon,
            margin: '0 0 0 2px',
          },
        },
      };
    }

    // Default: 'overlay' - visually placed at match start
    return {
      range: new vscode.Range(match.range.start, match.range.start),
      renderOptions: {
        after: {
          ...badgeCommon,
          margin: '0 0 0 1px',
        },
      },
    };
  }

  /**
   * Clear all decorations from given editors
   */
  public clear(editors: vscode.TextEditor[]): void {
    for (const editor of editors) {
      try {
        if (this.backdropDecorationType) {
          editor.setDecorations(this.backdropDecorationType, []);
        }
        if (this.matchDecorationType) {
          editor.setDecorations(this.matchDecorationType, []);
        }
        if (this.currentDecorationType) {
          editor.setDecorations(this.currentDecorationType, []);
        }
        if (this.labelDecorationType) {
          editor.setDecorations(this.labelDecorationType, []);
        }
      } catch {
        // Editor might be disposed
      }
    }
  }

  public dispose(): void {
    this.backdropDecorationType?.dispose();
    this.matchDecorationType?.dispose();
    this.currentDecorationType?.dispose();
    this.labelDecorationType?.dispose();
  }
}
