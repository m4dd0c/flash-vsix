import * as vscode from 'vscode';
import { CharMotionHelper } from './charMotion';
import { getConfig } from './config';
import { Decorator } from './decorator';
import { Labeler } from './labeler';
import { Matcher } from './matcher';
import { StatusBar } from './statusBar';
import { TreesitterHelper } from './treesitter';
import { CharMotionKind, FlashConfig, Match, SearchMode, StartOptions } from './types';

export class FlashState {
  private active = false;
  private mode: SearchMode = 'exact';
  private query = '';
  private matches: Match[] = [];
  private targetIndex = 0;
  private labelMap = new Map<string, Match>();

  private isSelectMode = false;
  private initialAnchor: vscode.Position | undefined;
  private isTreesitterMode = false;
  private isCharMotionMode = false;
  private charMotionKind: CharMotionKind = 'f';
  private quickInput: vscode.InputBox | undefined;

  private labeler = new Labeler();
  private decorator: Decorator;
  private statusBar: StatusBar;
  private config: FlashConfig;

  // Stored for repeating last jump
  private lastJumpQuery = '';
  private lastJumpMode: SearchMode = 'exact';

  constructor(decorator: Decorator, statusBar: StatusBar) {
    this.decorator = decorator;
    this.statusBar = statusBar;
    this.config = getConfig();
  }

  public get isActive(): boolean {
    return this.active;
  }

  public reloadConfig(): void {
    this.config = getConfig();
    this.decorator.reload(this.config);
  }

  /**
   * Start a Flash session
   */
  public async start(options: StartOptions = {}): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    this.config = getConfig();
    this.active = true;
    await vscode.commands.executeCommand('setContext', 'flash.active', true);

    this.mode = options.mode ?? this.config.searchMode;
    const currentSel = activeEditor.selection;
    // Auto-detect visual mode / active selection:
    // If options.select is explicitly true, OR if the editor already has a non-empty selection (e.g. Vim Visual Mode)
    this.isSelectMode = options.select ?? !currentSel.isEmpty;

    if (!currentSel.isEmpty) {
      // In Vim Visual mode, if selecting backward, anchor is after active.
      // The true starting character of the visual selection is the earlier position:
      this.initialAnchor = currentSel.anchor.isAfter(currentSel.active)
        ? currentSel.active
        : currentSel.anchor;
    } else {
      this.initialAnchor = currentSel.active;
    }

    this.isTreesitterMode = options.isTreesitter ?? false;
    this.isCharMotionMode = options.isCharMotion ?? false;
    this.charMotionKind = options.charMotionKind ?? 'f';
    this.query = options.initialQuery ?? '';
    this.targetIndex = 0;
    this.matches = [];
    this.labelMap.clear();
    this.labeler.reset();

    if (this.isTreesitterMode) {
      // AST mode: query SelectionRangeProvider for cursor hierarchy
      const cursor = activeEditor.selection.active;
      this.matches = await TreesitterHelper.buildAstMatches(activeEditor, cursor);
      this.assignAstLabels();
      this.updateDecorationsAndStatus();
      return;
    }

    if (this.isCharMotionMode) {
      // Wait for single character
      this.statusBar.show('', this.mode, 0, 0, false, true);
      return;
    }

    if (this.mode === 'word' || this.mode === 'line') {
      // Immediate matches for word starts or lines
      const editors = this.getVisibleEditors();
      this.matches = Matcher.findMatches(editors, activeEditor, this.mode, this.mode, this.config);
      this.assignLabelsAndDecorate();
      return;
    }

    if (this.query) {
      this.updateMatchesAndLabels();
    } else {
      // Initial prompt without query
      const editors = this.getVisibleEditors();
      if (this.config.backdrop) {
        this.decorator.update(editors, [], 0, this.config);
      }
      this.statusBar.show(this.query, this.mode, 0, 0);
    }

    if (this.config.inputMode === 'quickInput') {
      this.setupQuickInput();
    }
  }

  private setupQuickInput(): void {
    this.quickInput = vscode.window.createInputBox();
    this.quickInput.title = '⚡ Flash';
    this.quickInput.placeholder = 'Type search pattern or jump label...';
    this.quickInput.value = this.query;
    this.quickInput.onDidChangeValue(async (val) => {
      if (val.length > this.query.length) {
        const added = val.slice(this.query.length);
        for (const ch of added) {
          await this.handleChar(ch);
        }
      } else if (val.length < this.query.length) {
        const diff = this.query.length - val.length;
        for (let i = 0; i < diff; i++) {
          await this.handleBackspace();
        }
      }
    });
    this.quickInput.onDidHide(() => {
      if (this.active) {
        this.cancel();
      }
    });
    this.quickInput.show();
  }

  /**
   * Handle character input intercepted from 'type' command
   */
  public async handleChar(char: string): Promise<void> {
    if (!this.active) {
      return;
    }

    // Handle Char Motion mode (f, t, F, T)
    if (this.isCharMotionMode && !this.query) {
      this.query = char;
      CharMotionHelper.setLastMotion(this.charMotionKind, char);

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        this.cancel();
        return;
      }

      this.matches = CharMotionHelper.findCharMatches(
        activeEditor,
        this.charMotionKind,
        char,
        this.config
      );

      if (this.matches.length === 0) {
        this.cancel();
        return;
      }

      if (this.matches.length === 1 || this.config.autojump) {
        await this.jumpToMatch(this.matches[0]);
        return;
      }

      // Multiple occurrences: assign labels for instant jump
      this.assignLabelsAndDecorate();
      return;
    }

    // Check if typed character is an active jump label
    const targetMatch = this.labelMap.get(char);
    if (targetMatch) {
      await this.jumpToMatch(targetMatch);
      return;
    }

    // In AST Treesitter mode, handle ; (expand) and , (shrink)
    if (this.isTreesitterMode) {
      if (char === ';') {
        this.expandAstSelection(1);
        return;
      }
      if (char === ',') {
        this.expandAstSelection(-1);
        return;
      }
      return;
    }

    // Standard jump mode: append character to search query
    this.query += char;
    this.lastJumpQuery = this.query;
    this.lastJumpMode = this.mode;

    await this.updateMatchesAndLabels();

    // Autojump if enabled and only 1 match
    if (this.config.autojump && this.matches.length === 1) {
      await this.jumpToMatch(this.matches[0]);
    }
  }

  /**
   * Handle Backspace: delete last character or exit
   */
  public async handleBackspace(): Promise<void> {
    if (!this.active) {
      return;
    }

    if (this.query.length > 0) {
      this.query = this.query.slice(0, -1);
      this.lastJumpQuery = this.query;
      await this.updateMatchesAndLabels();
    } else {
      this.cancel();
    }
  }

  /**
   * Handle Enter: jump to current target match
   */
  public async handleEnter(): Promise<void> {
    if (!this.active) {
      return;
    }

    if (this.matches.length > 0) {
      const idx = Math.min(this.targetIndex, this.matches.length - 1);
      await this.jumpToMatch(this.matches[idx]);
    } else {
      this.cancel();
    }
  }

  /**
   * Cycle to next match (Tab)
   */
  public handleNext(): void {
    if (!this.active || this.matches.length === 0) {
      return;
    }
    this.targetIndex = (this.targetIndex + 1) % this.matches.length;
    this.updateDecorationsAndStatus();
  }

  /**
   * Cycle to previous match (Shift+Tab)
   */
  public handlePrev(): void {
    if (!this.active || this.matches.length === 0) {
      return;
    }
    this.targetIndex = (this.targetIndex - 1 + this.matches.length) % this.matches.length;
    this.updateDecorationsAndStatus();
  }

  /**
   * Toggle search mode between exact, fuzzy, and regex
   */
  public async toggleMode(): Promise<void> {
    if (!this.active) {
      return;
    }

    if (this.mode === 'exact') {
      this.mode = 'fuzzy';
    } else if (this.mode === 'fuzzy') {
      this.mode = 'regex';
    } else {
      this.mode = 'exact';
    }

    await this.updateMatchesAndLabels();
  }

  /**
   * Repeat last jump motion
   */
  public async repeatLast(): Promise<void> {
    const lastMotion = CharMotionHelper.getLastMotion();
    if (lastMotion) {
      await this.start({
        isCharMotion: true,
        charMotionKind: lastMotion.kind,
        initialQuery: lastMotion.targetChar,
      });
      return;
    }

    if (this.lastJumpQuery) {
      await this.start({
        mode: this.lastJumpMode,
        initialQuery: this.lastJumpQuery,
      });
    }
  }

  /**
   * Cancel and teardown Flash session
   */
  public cancel(): void {
    if (!this.active) {
      return;
    }

    this.active = false;
    vscode.commands.executeCommand('setContext', 'flash.active', false);

    if (this.quickInput) {
      const qi = this.quickInput;
      this.quickInput = undefined;
      qi.hide();
      qi.dispose();
    }

    const editors = this.getVisibleEditors();
    this.decorator.clear(editors);
    this.statusBar.hide();

    this.matches = [];
    this.labelMap.clear();
    this.query = '';
    this.targetIndex = 0;
    this.initialAnchor = undefined;
    this.isSelectMode = false;
  }

  /**
   * Update search matches and assign continuation-aware labels
   */
  private async updateMatchesAndLabels(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    const editors = this.getVisibleEditors();

    if (!this.query) {
      this.matches = [];
      this.labelMap.clear();
      this.decorator.clear(editors);
      if (this.config.backdrop) {
        this.decorator.update(editors, [], 0, this.config);
      }
      this.statusBar.show(this.query, this.mode, 0, 0);
      return;
    }

    this.matches = Matcher.findMatches(editors, activeEditor, this.query, this.mode, this.config);
    this.targetIndex = 0;
    this.assignLabelsAndDecorate();
  }

  /**
   * Assign labels and refresh visual decorations
   */
  private assignLabelsAndDecorate(): void {
    const activeEditor = vscode.window.activeTextEditor;
    const editors = this.getVisibleEditors();

    this.labelMap = this.labeler.assignLabels(
      this.matches,
      this.query,
      activeEditor,
      this.config
    );

    this.updateDecorationsAndStatus();
  }

  /**
   * Assign labels to Treesitter AST nodes
   */
  private assignAstLabels(): void {
    this.labelMap.clear();
    const candidateLabels = this.config.labels.split('');

    for (let i = 0; i < this.matches.length && i < candidateLabels.length; i++) {
      const label = candidateLabels[i];
      const match = this.matches[i];
      match.label = label;
      this.labelMap.set(label, match);
    }
  }

  /**
   * Expand/shrink AST selection incrementally (; and ,)
   */
  private expandAstSelection(delta: number): void {
    if (this.matches.length === 0) {
      return;
    }
    const newIdx = Math.max(0, Math.min(this.targetIndex + delta, this.matches.length - 1));
    this.targetIndex = newIdx;
    const targetMatch = this.matches[newIdx];
    if (targetMatch) {
      targetMatch.editor.selection = new vscode.Selection(
        targetMatch.range.start,
        targetMatch.range.end
      );
      targetMatch.editor.revealRange(targetMatch.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
    this.updateDecorationsAndStatus();
  }

  /**
   * Update decorations and status bar UI
   */
  private updateDecorationsAndStatus(): void {
    const editors = this.getVisibleEditors();
    this.decorator.update(editors, this.matches, this.targetIndex, this.config);
    this.statusBar.show(
      this.query,
      this.mode,
      this.matches.length,
      this.labelMap.size,
      this.isTreesitterMode,
      this.isCharMotionMode
    );
  }

  /**
   * Jump to target match and exit Flash session
   */
  private async jumpToMatch(match: Match): Promise<void> {
    const editor = match.editor;

    // Focus editor if needed (multi-window jump)
    if (vscode.window.activeTextEditor !== editor) {
      await vscode.window.showTextDocument(editor.document, editor.viewColumn, false);
    }

    if (this.isSelectMode && this.initialAnchor) {
      const origin = this.initialAnchor;
      const targetPos = match.range.start;

      // Check if target is after or before the origin position
      const isForward = targetPos.line > origin.line || (targetPos.line === origin.line && targetPos.character >= origin.character);

      if (isForward) {
        // Forward selection:
        // In Vim Visual Mode, moving forward to a character/word includes that character
        const docLine = editor.document.lineAt(targetPos.line);
        const endChar = Math.min(docLine.text.length, targetPos.character + 1);
        const endPos = new vscode.Position(targetPos.line, endChar);
        editor.selection = new vscode.Selection(origin, endPos);
      } else {
        // Backward selection:
        // In Vim Visual Mode, anchor includes origin character, active is at targetPos
        const originLine = editor.document.lineAt(origin.line);
        const anchorChar = Math.min(originLine.text.length, origin.character + 1);
        const anchorPos = new vscode.Position(origin.line, anchorChar);
        editor.selection = new vscode.Selection(anchorPos, targetPos);
      }
    } else if (this.isTreesitterMode) {
      // Select the AST node range
      editor.selection = new vscode.Selection(match.range.start, match.range.end);
    } else {
      // Move cursor to match position
      const targetPos = match.range.start;
      editor.selection = new vscode.Selection(targetPos, targetPos);
    }

    editor.revealRange(match.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);

    this.cancel();
  }

  /**
   * Get visible editors taking into account multiWindow config
   */
  private getVisibleEditors(): vscode.TextEditor[] {
    if (!this.config.multiWindow) {
      const active = vscode.window.activeTextEditor;
      return active ? [active] : [];
    }
    return [...vscode.window.visibleTextEditors];
  }

  public dispose(): void {
    this.cancel();
    this.decorator.dispose();
    this.statusBar.dispose();
  }
}
