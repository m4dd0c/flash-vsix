import * as vscode from 'vscode';
import { SearchMode } from './types';

export class StatusBar {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
    this.item.name = 'Flash Jump';
  }

  public show(
    query: string,
    mode: SearchMode,
    matchCount: number,
    labelCount: number,
    isTreesitter = false,
    isCharMotion = false
  ): void {
    if (isTreesitter) {
      this.item.text = `$(zap) Flash [Treesitter AST] Pick a label to select node  [;] Expand  [,] Shrink  [Esc] Cancel`;
      this.item.tooltip = 'Flash Treesitter Mode: Select surrounding syntactic scope';
    } else if (isCharMotion) {
      this.item.text = `$(zap) Flash [Motion] Type target character...  [Esc] Cancel`;
      this.item.tooltip = 'Flash Character Motion';
    } else {
      const modeStr = mode.toUpperCase();
      const queryStr = query ? `"${query}"` : 'Type to search...';
      const matchesStr = `${matchCount} match${matchCount === 1 ? '' : 'es'}`;
      const labelsStr = labelCount > 0 ? ` (${labelCount} labels)` : '';
      this.item.text = `$(zap) Flash [${modeStr}] ${queryStr}  •  ${matchesStr}${labelsStr}  [Enter] Jump  [Esc] Cancel`;
      this.item.tooltip = 'Flash Jump Mode: Type search pattern or press label to jump immediately';
    }

    this.item.show();
  }

  public hide(): void {
    this.item.hide();
  }

  public dispose(): void {
    this.item.dispose();
  }
}
