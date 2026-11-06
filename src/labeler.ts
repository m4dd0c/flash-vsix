import * as vscode from 'vscode';
import { FlashConfig, Match } from './types';

export class Labeler {
  private usedLabels: Map<string, string> = new Map();

  /**
   * Reset label cache (e.g. when starting a new flash session)
   */
  public reset(): void {
    this.usedLabels.clear();
  }

  /**
   * Get position key for caching assigned labels across keystrokes
   */
  public static getMatchKey(match: Match): string {
    return `${match.editor.document.uri.toString()}:${match.range.start.line}:${match.range.start.character}`;
  }

  /**
   * Filter and skip labels that match any character immediately following a match.
   * This is folke/flash.nvim's core innovation: labels never collide with search continuation.
   */
  public static filterSafeLabels(
    candidateLabels: string[],
    matches: Match[],
    smartCase: boolean,
    query: string
  ): string[] {
    if (!query) {
      return [];
    }

    // Collect all characters that immediately follow any match in the buffer
    const continuationChars = new Set<string>();
    for (const m of matches) {
      if (m.nextChar) {
        if (smartCase && !/[A-Z]/.test(query)) {
          continuationChars.add(m.nextChar.toLowerCase());
          continuationChars.add(m.nextChar.toUpperCase());
        } else {
          continuationChars.add(m.nextChar);
        }
      }
    }

    // Filter candidate labels: remove any label that is a continuation char
    return candidateLabels.filter((label) => {
      if (continuationChars.has(label)) {
        return false;
      }
      if (smartCase && !/[A-Z]/.test(query) && continuationChars.has(label.toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  /**
   * Sort matches by active editor priority, then distance from cursor
   */
  public static sortMatches(
    matches: Match[],
    activeEditor: vscode.TextEditor | undefined
  ): Match[] {
    const activeUri = activeEditor?.document.uri.toString();

    return [...matches].sort((a, b) => {
      const aIsActive = a.editor.document.uri.toString() === activeUri;
      const bIsActive = b.editor.document.uri.toString() === activeUri;

      if (aIsActive && !bIsActive) {
        return -1;
      }
      if (!aIsActive && bIsActive) {
        return 1;
      }

      // Sort by distance from cursor
      const distA = a.distance ?? 0;
      const distB = b.distance ?? 0;
      if (distA !== distB) {
        return distA - distB;
      }

      // Fallback: document order
      if (a.range.start.line !== b.range.start.line) {
        return a.range.start.line - b.range.start.line;
      }
      return a.range.start.character - b.range.start.character;
    });
  }

  /**
   * Assign jump labels to matches according to flash.nvim's rules:
   * 1. Skip continuation characters
   * 2. Sort by distance
   * 3. Reuse previously assigned labels where valid
   * 4. Allocate remaining labels from candidate pool
   */
  public assignLabels(
    matches: Match[],
    query: string,
    activeEditor: vscode.TextEditor | undefined,
    config: FlashConfig
  ): Map<string, Match> {
    const labelMap = new Map<string, Match>();

    if (query.length < config.minPatternLength) {
      return labelMap;
    }

    // 1. Generate base candidate pool
    let labelChars = config.labels.split('');
    if (config.uppercaseLabels) {
      labelChars.push(...config.labels.toUpperCase().split(''));
    }

    // Deduplicate labels
    const uniqueLabels = Array.from(new Set(labelChars));

    // 2. Skip continuation characters
    const safeLabels = Labeler.filterSafeLabels(uniqueLabels, matches, config.smartCase, query);
    const availablePool = [...safeLabels];

    // 3. Sort matches by distance
    const sortedMatches = config.distanceSort
      ? Labeler.sortMatches(matches, activeEditor)
      : matches;

    const assignedSet = new Set<string>();

    // 4. Pass 1: Reuse previously assigned labels if still safe
    if (config.reuseLabels !== 'none') {
      for (const match of sortedMatches) {
        const key = Labeler.getMatchKey(match);
        const prevLabel = this.usedLabels.get(key);

        if (prevLabel && availablePool.includes(prevLabel)) {
          const isLower = prevLabel.toLowerCase() === prevLabel;
          if (config.reuseLabels === 'all' || (config.reuseLabels === 'lowercase' && isLower)) {
            match.label = prevLabel;
            assignedSet.add(prevLabel);
            labelMap.set(prevLabel, match);

            // Remove from available pool
            const idx = availablePool.indexOf(prevLabel);
            if (idx !== -1) {
              availablePool.splice(idx, 1);
            }
          }
        }
      }
    }

    // 5. Pass 2: Assign labels to remaining matches
    for (const match of sortedMatches) {
      if (match.label) {
        continue;
      }

      if (availablePool.length === 0) {
        // Pool exhausted
        break;
      }

      const label = availablePool.shift()!;
      match.label = label;
      assignedSet.add(label);
      labelMap.set(label, match);

      // Cache for reuse
      const key = Labeler.getMatchKey(match);
      this.usedLabels.set(key, label);
    }

    return labelMap;
  }
}
