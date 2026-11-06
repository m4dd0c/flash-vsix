export class Position {
  constructor(public readonly line: number, public readonly character: number) {}
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;

  constructor(start: Position, end: Position);
  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
  constructor(
    startOrStartLine: Position | number,
    endOrStartChar: Position | number,
    endLine?: number,
    endChar?: number
  ) {
    if (typeof startOrStartLine === 'number') {
      this.start = new Position(startOrStartLine, endOrStartChar as number);
      this.end = new Position(endLine!, endChar!);
    } else {
      this.start = startOrStartLine;
      this.end = endOrStartChar as Position;
    }
  }
}

export class Uri {
  constructor(public readonly scheme: string, public readonly path: string) {}

  public static parse(val: string): Uri {
    return new Uri('file', val);
  }

  public toString(): string {
    return `${this.scheme}://${this.path}`;
  }
}

export const window = {
  activeTextEditor: undefined,
  visibleTextEditors: [],
  createStatusBarItem: () => ({
    name: '',
    text: '',
    tooltip: '',
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
  createTextEditorDecorationType: () => ({
    dispose: () => {},
  }),
  createInputBox: () => ({
    title: '',
    placeholder: '',
    value: '',
    onDidChangeValue: () => ({ dispose: () => {} }),
    onDidHide: () => ({ dispose: () => {} }),
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: async () => {},
};

export const workspace = {
  getConfiguration: () => ({
    get: (key: string, defaultVal: any) => defaultVal,
  }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const DecorationRangeBehavior = {
  OpenOpen: 0,
  ClosedClosed: 1,
  OpenClosed: 2,
  ClosedOpen: 3,
};
