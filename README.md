# ⚡ Flash for VS Code, Cursor & Antigravity

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Flash** lets you navigate your code with search labels, enhanced character motions, and AST Treesitter scope integration. Port of [folke/flash.nvim](https://github.com/folke/flash.nvim) for VS Code, Cursor, and Antigravity.

---

## ✨ Features

- 🔍 **Continuation-Aware Smart Skipping**: Labels are guaranteed **not** to exist as a continuation of your search pattern in the document.
- ⌨️ **Type as many characters as you want** before using a jump label—you are never locked into 1-character or 2-character modes.
- 🌳 **Treesitter AST Integration**: Enclosing AST syntax scopes (expression → statement → block → function → class) are highlighted and labeled for instant structural selection.
- ⚡ **Enhanced `f`, `t`, `F`, `T` character motions**: Multi-line and line-local motions with instant jump labels.
- 🪟 **Multi-Window Navigation**: Jump effortlessly across visible split editors and panes.
- 🎯 **Visual Stability & Label Reuse**: Labels already assigned to a position remain stable when typing more characters (no visual flickering).
- 📏 **Distance-Weighted Home Row Allocation**: Targets closest to your cursor get the easiest home-row keys (`a`, `s`, `d`, `f`, `j`, `k`, `l`).
- 🎨 **Slick Backdrop & Badges**: Folke's iconic magenta jump badges with background dimming for maximum visual clarity.
- ⚫ **Repeatable Motions**: Repeat your last jump or motion with a single keystroke.

---

## 🚀 Quick Start & Default Keybindings

| Command | Keybinding | Description |
|---|---|---|
| `flash.jump` | `Alt+S` | Interactive Flash search & jump anywhere on screen |
| `flash.jumpSelect` | `Alt+Shift+S` | Jump and extend selection from cursor to target |
| `flash.treesitter` | `Alt+T` | Select enclosing AST syntax nodes / parent scopes |
| `flash.jumpWord` | `Alt+W` | Quick jump to word beginnings |
| `flash.jumpLine` | `Alt+L` | Quick jump to line starts |
| `flash.findNextChar` | Command Palette | Enhanced `f` motion forward |
| `flash.findPrevChar` | Command Palette | Enhanced `F` motion backward |
| `flash.tillNextChar` | Command Palette | Enhanced `t` motion till forward |
| `flash.tillPrevChar` | Command Palette | Enhanced `T` motion till backward |
| `flash.repeat` | Command Palette | Repeat last jump or character motion |

### While Flash is Active:
- **Type any letter**: Refines the search pattern.
- **Type any visible label badge**: Instantly jumps to that location and exits Flash!
- **`Enter`**: Jumps to the current / first match.
- **`Tab` / `Shift+Tab`**: Cycle to next / previous match.
- **`Ctrl+S`**: Toggle match mode between `exact`, `fuzzy`, and `regex`.
- **`Backspace`**: Delete last character in pattern.
- **`Escape`**: Cancel and restore view.

### In Treesitter Mode:
- **`;`**: Expand selection to next outer parent AST node.
- **`,`**: Shrink selection to inner child AST node.
- **`[label]`**: Select that specific AST node immediately.

---

## 🛠️ Vim Integration (VSCodeVim / Neovim Extension)

To get the authentic `flash.nvim` experience in VS Code, Cursor, or Antigravity with Vim keybindings, add these to your `settings.json`:

```json
"vim.normalModeKeyBindingsNonRecursive": [
  {
    "before": ["s"],
    "commands": ["flash.jump"]
  },
  {
    "before": ["S"],
    "commands": ["flash.treesitter"]
  },
  {
    "before": ["f"],
    "commands": ["flash.findNextChar"]
  },
  {
    "before": ["F"],
    "commands": ["flash.findPrevChar"]
  },
  {
    "before": ["t"],
    "commands": ["flash.tillNextChar"]
  },
  {
    "before": ["T"],
    "commands": ["flash.tillPrevChar"]
  }
],
"vim.visualModeKeyBindingsNonRecursive": [
  {
    "before": ["s"],
    "commands": ["flash.jumpSelect"]
  },
  {
    "before": ["S"],
    "commands": ["flash.treesitter"]
  }
],
"vim.operatorPendingModeKeyBindings": [
  {
    "before": ["s"],
    "commands": ["flash.jumpSelect"]
  },
  {
    "before": ["S"],
    "commands": ["flash.treesitter"]
  }
]
```

---

## ⚙️ Configuration

Customize Flash in your VS Code / Cursor / Antigravity `settings.json`:

```json
{
  // Label keys in order of priority (home row first)
  "flash.labels": "asdfghjklqwertyuiopzxcvbnm",

  // Matching mode: "exact" | "fuzzy" | "regex"
  "flash.search.mode": "exact",

  // Search across all visible editor panes
  "flash.search.multiWindow": true,

  // Smart case: lowercase = case-insensitive, uppercase = case-sensitive
  "flash.search.smartCase": true,

  // Allow uppercase labels when matches exceed lowercase count
  "flash.label.uppercase": true,

  // Prevent label flickering across keystrokes: "lowercase" | "all" | "none"
  "flash.label.reuse": "lowercase",

  // Prioritize matches closer to cursor
  "flash.label.distanceSort": true,

  // Label placement style: "overlay" | "after" | "before"
  "flash.label.style": "overlay",

  // Dim non-matching text while searching
  "flash.highlight.backdrop": true,

  // Custom colors
  "flash.highlight.labelBackgroundColor": "#ff007c",
  "flash.highlight.labelForegroundColor": "#ffffff",
  "flash.highlight.matchBackgroundColor": "rgba(62, 104, 215, 0.35)",
  "flash.highlight.currentMatchBackgroundColor": "rgba(255, 150, 108, 0.50)",

  // Allow f/t/F/T motions to navigate across visible lines
  "flash.charMotion.multiLine": true,

  // Automatically jump when only one match remains
  "flash.jump.autojump": false
}
```

---

## 🧠 Reverse Engineering & Architecture Notes

For a complete breakdown of the algorithms, data structures, and state loop reverse engineered from `folke/flash.nvim`, see the [Reverse Engineering Report](file:///Users/manish/.gemini/antigravity-cli/brain/ce44b867-8193-4cd6-a4c0-40cf815601a3/flash-nvim-reverse-engineering.md).

---

## 📄 License

MIT © Manish. Ported from [folke/flash.nvim](https://github.com/folke/flash.nvim) with deep respect to Folke Lemaitre.
