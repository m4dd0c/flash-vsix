import * as assert from 'assert';
import * as vscode from 'vscode';
import { CharMotionHelper } from '../../charMotion';
import { Matcher } from '../../matcher';
import { FlashConfig } from '../../types';

describe('Flash Matcher Regex Builder', () => {
  function testMatch(regex: RegExp, text: string): boolean {
    regex.lastIndex = 0;
    return regex.test(text);
  }

  it('builds case-insensitive exact regex when smartCase is lowercase', () => {
    const regex = Matcher.buildRegex('foo', 'exact', false);
    assert.ok(regex);
    assert.strictEqual(regex.flags, 'gi');
    assert.ok(testMatch(regex, 'FOO'));
    assert.ok(testMatch(regex, 'foo'));
  });

  it('builds case-sensitive exact regex when smartCase detects uppercase', () => {
    const regex = Matcher.buildRegex('Foo', 'exact', true);
    assert.ok(regex);
    assert.strictEqual(regex.flags, 'g');
    assert.ok(testMatch(regex, 'Foo'));
    assert.strictEqual(testMatch(regex, 'foo'), false);
  });

  it('escapes special characters in exact mode', () => {
    const regex = Matcher.buildRegex('func(a: number)', 'exact', false);
    assert.ok(regex);
    assert.ok(testMatch(regex, 'const x = func(a: number);'));
  });

  it('builds fuzzy regex', () => {
    const regex = Matcher.buildRegex('fbr', 'fuzzy', false);
    assert.ok(regex);
    assert.ok(testMatch(regex, 'foobar'));
    assert.ok(testMatch(regex, 'foo_bar'));
  });

  it('handles invalid regex without crashing', () => {
    const regex = Matcher.buildRegex('[incomplete', 'regex', false);
    assert.strictEqual(regex, null);
  });
});

describe('Flash Matcher In Editor', () => {
  const lines = [
    'function calculateTotal(items: Item[]) {',
    '  let total = 0;',
    '  for (const item of items) {',
    '    total += item.price;',
    '  }',
    '  return total;',
    '}',
  ];

  const dummyDoc: any = {
    uri: vscode.Uri.parse('file:///test.ts'),
    lineAt: (n: number) => ({
      text: lines[n],
      firstNonWhitespaceCharacterIndex: lines[n].search(/\S/),
    }),
  };

  const dummyEditor: any = {
    document: dummyDoc,
    visibleRanges: [new vscode.Range(0, 0, 6, 1)],
    selection: { active: new vscode.Position(0, 0) },
  };

  const config: FlashConfig = {
    labels: 'asdfghjklqwertyuiopzxcvbnm',
    searchMode: 'exact',
    multiWindow: true,
    smartCase: true,
    maxMatchCount: 100,
    uppercaseLabels: true,
    reuseLabels: 'lowercase',
    distanceSort: true,
    labelStyle: 'overlay',
    minPatternLength: 0,
    backdrop: true,
    labelBackgroundColor: '#ff007c',
    labelForegroundColor: '#ffffff',
    matchBackgroundColor: 'rgba(62, 104, 215, 0.35)',
    currentMatchBackgroundColor: 'rgba(255, 150, 108, 0.50)',
    charMotionMultiLine: true,
    autojump: false,
    inputMode: 'inEditor',
  };

  it('finds exact matches for "total"', () => {
    const matches = Matcher.findMatchesInEditor(
      dummyEditor,
      dummyEditor,
      'total',
      'exact',
      config,
      100
    );

    // lines[0]: calculateTotal (1)
    // lines[1]: total (1)
    // lines[3]: total (1)
    // lines[5]: total (1)
    assert.strictEqual(matches.length, 4);
    assert.strictEqual(matches[0].range.start.line, 0);
    assert.strictEqual(matches[1].range.start.line, 1);
    assert.strictEqual(matches[2].range.start.line, 3);
    assert.strictEqual(matches[3].range.start.line, 5);
  });

  it('finds word starts in word mode', () => {
    const matches = Matcher.findMatchesInEditor(
      dummyEditor,
      dummyEditor,
      'word',
      'word',
      config,
      100
    );
    assert.ok(matches.length > 5);
    // First match is 'f' of 'function'
    assert.strictEqual(matches[0].range.start.line, 0);
    assert.strictEqual(matches[0].range.start.character, 0);
  });

  it('finds line starts in line mode', () => {
    const matches = Matcher.findMatchesInEditor(
      dummyEditor,
      dummyEditor,
      'line',
      'line',
      config,
      100
    );
    assert.strictEqual(matches.length, 7);
    assert.strictEqual(matches[0].range.start.line, 0);
    assert.strictEqual(matches[1].range.start.line, 1);
  });
});

describe('Flash Char Motions (f, t, F, T)', () => {
  const lineText = 'const name = "folke flash";';
  const dummyDoc: any = {
    lineAt: () => ({ text: lineText }),
  };
  const dummyEditor: any = {
    document: dummyDoc,
    visibleRanges: [new vscode.Range(0, 0, 0, lineText.length)],
    selection: { active: new vscode.Position(0, 0) }, // Cursor at start: 'c'
  };

  const config: FlashConfig = {
    labels: 'asdfghjkl',
    searchMode: 'exact',
    multiWindow: false,
    smartCase: true,
    maxMatchCount: 50,
    uppercaseLabels: false,
    reuseLabels: 'none',
    distanceSort: true,
    labelStyle: 'overlay',
    minPatternLength: 0,
    backdrop: false,
    labelBackgroundColor: '#ff007c',
    labelForegroundColor: '#ffffff',
    matchBackgroundColor: '',
    currentMatchBackgroundColor: '',
    charMotionMultiLine: false,
    autojump: false,
    inputMode: 'inEditor',
  };

  it('finds next char "f" forward with motion "f"', () => {
    const matches = CharMotionHelper.findCharMatches(dummyEditor, 'f', 'f', config);
    // "folke" at index 14, "flash" at index 20
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].range.start.character, 14);
    assert.strictEqual(matches[1].range.start.character, 20);
  });

  it('finds till next char "f" with motion "t" (stops at col - 1)', () => {
    const matches = CharMotionHelper.findCharMatches(dummyEditor, 't', 'f', config);
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].range.start.character, 13); // col - 1
  });

  it('finds backward char with motion "F"', () => {
    const editorWithCursorAtEnd: any = {
      ...dummyEditor,
      selection: { active: new vscode.Position(0, lineText.length) },
    };
    const matches = CharMotionHelper.findCharMatches(editorWithCursorAtEnd, 'F', 'f', config);
    // Closest backward occurrence is "flash" at 20, then "folke" at 14
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].range.start.character, 20);
    assert.strictEqual(matches[1].range.start.character, 14);
  });
});
