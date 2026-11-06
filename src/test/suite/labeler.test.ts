import * as assert from 'assert';
import * as vscode from 'vscode';
import { Labeler } from '../../labeler';
import { FlashConfig, Match } from '../../types';

describe('Flash Labeler (folke/flash.nvim parity)', () => {
  const dummyUri = vscode.Uri.parse('untitled:test.ts');
  const dummyDoc = { uri: dummyUri } as vscode.TextDocument;
  const dummyEditor = { document: dummyDoc } as vscode.TextEditor;

  function makeMatch(line: number, startCol: number, endCol: number, nextChar?: string, distance?: number): Match {
    return {
      editor: dummyEditor,
      range: new vscode.Range(line, startCol, line, endCol),
      nextChar,
      distance: distance ?? line * 1000 + startCol,
    };
  }

  it('skips labels that match continuation characters (bar + f in barfoo)', () => {
    // Equivalent to folke/flash.nvim:
    // foo foo
    // bar
    // barfoo
    // search("bar"):skip(1000, {"a", "b", "c", "f"}) -> {"a", "b", "c"}
    const matches: Match[] = [
      makeMatch(1, 0, 3, undefined), // "bar" at end
      makeMatch(2, 0, 3, 'f'),       // "barfoo" -> nextChar is 'f'
    ];

    const candidatePool = ['a', 'b', 'c', 'f'];
    const safeLabels = Labeler.filterSafeLabels(candidatePool, matches, true, 'bar');

    assert.deepStrictEqual(safeLabels, ['a', 'b', 'c']);
  });

  it('skips all labels for an empty pattern', () => {
    // Equivalent to folke/flash.nvim: search(""):skip(...) -> {}
    const matches: Match[] = [makeMatch(0, 0, 4, 'p')];
    const safeLabels = Labeler.filterSafeLabels(['a', 'b', 'c', 't'], matches, true, '');
    assert.deepStrictEqual(safeLabels, []);
  });

  it('considers ignorecase/smartcase when skipping labels', () => {
    // Equivalent to folke/flash.nvim: pattern withC -> skips both 'c' and 'C'
    const matches: Match[] = [makeMatch(0, 0, 4, 'C')];
    const candidatePool = ['a', 'b', 'c', 'C', 'p', 'w'];
    const safeLabels = Labeler.filterSafeLabels(candidatePool, matches, true, 'with');
    assert.deepStrictEqual(safeLabels, ['a', 'b', 'p', 'w']);
  });

  it('sorts matches by distance from cursor', () => {
    const matches: Match[] = [
      makeMatch(10, 5, 8, undefined, 500),
      makeMatch(2, 1, 4, undefined, 20),
      makeMatch(5, 2, 5, undefined, 100),
    ];

    const sorted = Labeler.sortMatches(matches, dummyEditor);
    assert.strictEqual(sorted[0].distance, 20);
    assert.strictEqual(sorted[1].distance, 100);
    assert.strictEqual(sorted[2].distance, 500);
  });

  it('reuses previously assigned labels to prevent flickering', () => {
    const labeler = new Labeler();
    const config: FlashConfig = {
      labels: 'asdfghjklqwertyuiopzxcvbnm',
      searchMode: 'exact',
      multiWindow: true,
      smartCase: true,
      maxMatchCount: 100,
      uppercaseLabels: false,
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

    const match1 = makeMatch(0, 0, 1, 'o'); // "fo" -> nextChar is 'o'
    const match2 = makeMatch(1, 0, 1, 'i'); // "fi" -> nextChar is 'i'

    // Step 1: query is "f"
    const map1 = labeler.assignLabels([match1, match2], 'f', dummyEditor, config);
    const assignedLabel1 = match1.label!;
    assert.ok(assignedLabel1);

    // Step 2: query extends to "fo", match1 is still there
    const match1Step2 = makeMatch(0, 0, 2, 'o');
    const map2 = labeler.assignLabels([match1Step2], 'fo', dummyEditor, config);

    // match1 should retain its previously assigned label
    assert.strictEqual(match1Step2.label, assignedLabel1);
  });
});
