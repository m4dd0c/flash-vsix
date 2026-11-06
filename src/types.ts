import * as vscode from 'vscode';

export type SearchMode = 'exact' | 'fuzzy' | 'regex' | 'word' | 'line';
export type LabelStyle = 'overlay' | 'after' | 'before';
export type LabelReuse = 'lowercase' | 'all' | 'none';
export type CharMotionKind = 'f' | 'F' | 't' | 'T';
export type InputMode = 'inEditor' | 'quickInput';

export interface Pos {
  line: number;
  character: number;
}

export interface Match {
  editor: vscode.TextEditor;
  range: vscode.Range;
  label?: string;
  nextChar?: string;
  distance?: number;
  fold?: boolean;
  astDepth?: number;
  isCurrent?: boolean;
}

export interface FlashConfig {
  labels: string;
  searchMode: SearchMode;
  multiWindow: boolean;
  smartCase: boolean;
  maxMatchCount: number;
  uppercaseLabels: boolean;
  reuseLabels: LabelReuse;
  distanceSort: boolean;
  labelStyle: LabelStyle;
  minPatternLength: number;
  backdrop: boolean;
  labelBackgroundColor: string;
  labelForegroundColor: string;
  matchBackgroundColor: string;
  currentMatchBackgroundColor: string;
  charMotionMultiLine: boolean;
  autojump: boolean;
  inputMode: InputMode;
}

export interface StartOptions {
  mode?: SearchMode;
  select?: boolean;
  initialQuery?: string;
  fixedLabels?: boolean;
  isTreesitter?: boolean;
  isCharMotion?: boolean;
  charMotionKind?: CharMotionKind;
  onMatchSelected?: (match: Match) => void;
}
