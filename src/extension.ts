import * as vscode from 'vscode';
import { Decorator } from './decorator';
import { FlashState } from './state';
import { StatusBar } from './statusBar';

export function activate(context: vscode.ExtensionContext): void {
  const decorator = new Decorator();
  const statusBar = new StatusBar();
  const flashState = new FlashState(decorator, statusBar);

  context.subscriptions.push(decorator, statusBar, {
    dispose: () => flashState.dispose(),
  });

  // Handle in-editor keystrokes without overriding or interfering with Vim's type handler
  context.subscriptions.push(
    vscode.commands.registerCommand('flash.inputKey', async (args?: { character?: string }) => {
      if (flashState.isActive && args?.character) {
        await flashState.handleChar(args.character);
      }
    })
  );

  // Register Flash commands
  context.subscriptions.push(
    vscode.commands.registerCommand('flash.jump', async () => {
      await flashState.start();
    }),

    vscode.commands.registerCommand('flash.jumpSelect', async () => {
      await flashState.start({ select: true });
    }),

    vscode.commands.registerCommand('flash.treesitter', async () => {
      await flashState.start({ isTreesitter: true });
    }),

    vscode.commands.registerCommand('flash.treesitterSearch', async () => {
      await flashState.start({ isTreesitter: true });
    }),

    vscode.commands.registerCommand('flash.jumpWord', async () => {
      await flashState.start({ mode: 'word' });
    }),

    vscode.commands.registerCommand('flash.jumpLine', async () => {
      await flashState.start({ mode: 'line' });
    }),

    vscode.commands.registerCommand('flash.findNextChar', async () => {
      await flashState.start({ isCharMotion: true, charMotionKind: 'f' });
    }),

    vscode.commands.registerCommand('flash.findPrevChar', async () => {
      await flashState.start({ isCharMotion: true, charMotionKind: 'F' });
    }),

    vscode.commands.registerCommand('flash.tillNextChar', async () => {
      await flashState.start({ isCharMotion: true, charMotionKind: 't' });
    }),

    vscode.commands.registerCommand('flash.tillPrevChar', async () => {
      await flashState.start({ isCharMotion: true, charMotionKind: 'T' });
    }),

    vscode.commands.registerCommand('flash.repeat', async () => {
      await flashState.repeatLast();
    }),

    // Interactive state handlers
    vscode.commands.registerCommand('flash.cancel', () => {
      flashState.cancel();
    }),

    vscode.commands.registerCommand('flash.backspace', async () => {
      await flashState.handleBackspace();
    }),

    vscode.commands.registerCommand('flash.jumpFirst', async () => {
      await flashState.handleEnter();
    }),

    vscode.commands.registerCommand('flash.nextMatch', () => {
      flashState.handleNext();
    }),

    vscode.commands.registerCommand('flash.prevMatch', () => {
      flashState.handlePrev();
    }),

    vscode.commands.registerCommand('flash.toggleMode', async () => {
      await flashState.toggleMode();
    })
  );

  // Reload config on settings change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('flash')) {
        flashState.reloadConfig();
      }
    })
  );

  // Clean up if active editor closes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor && flashState.isActive) {
        flashState.cancel();
      }
    })
  );
}

export function deactivate(): void {
  // Disposed via subscriptions
}
