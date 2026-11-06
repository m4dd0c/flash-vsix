import * as vscode from 'vscode';
import { FlashConfig, InputMode, LabelReuse, LabelStyle, SearchMode } from './types';

export function getConfig(): FlashConfig {
  const cfg = vscode.workspace.getConfiguration('flash');
  return {
    labels: cfg.get<string>('labels', 'asdfghjklqwertyuiopzxcvbnm'),
    searchMode: cfg.get<SearchMode>('search.mode', 'exact'),
    multiWindow: cfg.get<boolean>('search.multiWindow', true),
    smartCase: cfg.get<boolean>('search.smartCase', true),
    maxMatchCount: cfg.get<number>('search.maxMatchCount', 300),
    uppercaseLabels: cfg.get<boolean>('label.uppercase', true),
    reuseLabels: cfg.get<LabelReuse>('label.reuse', 'lowercase'),
    distanceSort: cfg.get<boolean>('label.distanceSort', true),
    labelStyle: cfg.get<LabelStyle>('label.style', 'overlay'),
    minPatternLength: cfg.get<number>('label.minPatternLength', 0),
    backdrop: cfg.get<boolean>('highlight.backdrop', true),
    labelBackgroundColor: cfg.get<string>('highlight.labelBackgroundColor', '#ff007c'),
    labelForegroundColor: cfg.get<string>('highlight.labelForegroundColor', '#ffffff'),
    matchBackgroundColor: cfg.get<string>('highlight.matchBackgroundColor', 'rgba(62, 104, 215, 0.35)'),
    currentMatchBackgroundColor: cfg.get<string>('highlight.currentMatchBackgroundColor', 'rgba(255, 150, 108, 0.50)'),
    charMotionMultiLine: cfg.get<boolean>('charMotion.multiLine', true),
    autojump: cfg.get<boolean>('jump.autojump', false),
    inputMode: cfg.get<InputMode>('inputMode', 'inEditor'),
  };
}
