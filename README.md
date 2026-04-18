# Block References for Obsidian

Logseq-style **linked block references** for tags. Click any `#tag` to see every block in your vault where that tag appears — grouped by note, with heading context.

## Features

- **Tag click handler** — Click a `#tag` in Reading mode to open the Block References panel (Ctrl/Cmd+click in Live Preview)
- **Block-level results** — Shows the full paragraph, list item, or heading that contains the tag, not just a line of text
- **Heading context** — Each block displays its nearest parent heading so you know where it sits in the source note
- **Click to navigate** — Click any block to jump to its exact location in the source note
- **Live updates** — The panel refreshes automatically when you edit your notes
- **Tag search command** — Use the command palette ("Search tag references") to pick any tag from a suggestion list

## Installation

### Via BRAT (recommended for beta testing)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. In BRAT settings, click "Add Beta plugin"
3. Enter the GitHub URL of this repository
4. Enable the plugin in Settings → Community Plugins

### Install from source

1. Clone the repository and build:
   ```bash
   git clone https://github.com/philipppollmann/obsidian-block-refs.git
   cd obsidian-block-refs
   npm install
   npm run build
   ```
2. Copy `main.js`, `manifest.json`, and `styles.css` into your vault:
   ```bash
   mkdir -p /path/to/your-vault/.obsidian/plugins/obsidian-block-refs
   cp main.js manifest.json styles.css /path/to/your-vault/.obsidian/plugins/obsidian-block-refs/
   ```
   Or create a symlink for ongoing development (changes reflect immediately):
   ```bash
   ln -s "$(pwd)" /path/to/your-vault/.obsidian/plugins/obsidian-block-refs
   ```
3. In Obsidian: Settings → Community Plugins → toggle "Restricted Mode" off → reload the plugin list → enable **Block References**

### Manual installation (from release)

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/philipppollmann/obsidian-block-refs/releases)
2. Create a folder `obsidian-block-refs` inside your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into that folder
4. Enable the plugin in Settings → Community Plugins

## Usage

1. **Click a tag** in any note (Reading mode) to open the Block References panel in the right sidebar
2. In **Live Preview** mode, use **Ctrl+Click** (Cmd+Click on Mac) on a tag
3. Or open the **Command Palette** (`Ctrl/Cmd+P`) and run "Block References: Search tag references" to pick a tag from a list

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Override tag click | On | Replace Obsidian's default tag search with the Block References view |
| Show parent heading | On | Display the nearest heading above each block for context |

## Development

### Prerequisites

- Node.js 16+
- npm
- An Obsidian vault for testing

### Setup

```bash
# Clone the repo
git clone https://github.com/philipppollmann/obsidian-block-refs.git
cd obsidian-block-refs

# Install dependencies
npm install

# Start dev build (watches for changes)
npm run dev
```

### Local testing with symlink

Link the plugin into your test vault so Obsidian picks it up:

```bash
# macOS / Linux
ln -s /path/to/obsidian-block-refs /path/to/your-vault/.obsidian/plugins/obsidian-block-refs

# Windows (PowerShell, run as admin)
New-Item -ItemType SymbolicLink -Path "C:\path\to\vault\.obsidian\plugins\obsidian-block-refs" -Target "C:\path\to\obsidian-block-refs"
```

Then in Obsidian:
1. Settings → Community Plugins → Enable community plugins
2. Find "Block References" and enable it
3. Install the [Hot Reload](https://github.com/pjeby/hot-reload) plugin for automatic reloading during development (create an empty `.hotreload` file in the plugin directory)

### Build for production

```bash
npm run build
```

This runs TypeScript type-checking and then bundles with esbuild.

### Releasing a new version

1. Update the version in `package.json`
2. Run `npm version <major|minor|patch>` — this automatically updates `manifest.json` and `versions.json` via the `version` script
3. Push the version tag: `git push origin v0.1.0`
4. Create a GitHub release with the tag and attach `main.js`, `manifest.json`, and `styles.css`

For automated releases, add a GitHub Action (e.g. the [Obsidian Plugin Release Action](https://github.com/obsidianmd/obsidian-sample-plugin/blob/master/.github/workflows/release.yml)).

## Relevant Obsidian APIs

| API | Purpose |
|-----|---------|
| `Plugin` | Base class, lifecycle hooks (`onload`/`onunload`), command registration |
| `ItemView` | Custom sidebar panel for rendering block references |
| `MetadataCache` | Access parsed tags, headings, and sections for every file in the vault |
| `Vault.cachedRead()` | Fast cached file reading for block content extraction |
| `MarkdownRenderer.render()` | Render markdown strings into HTML inside the view |
| `SuggestModal` | Tag picker in the command palette |
| `WorkspaceLeaf` | Managing sidebar panels and navigation |

## Known limitations

- Frontmatter tags are not shown (they don't have block context)
- Nested tags (`#parent/child`) match exactly — searching `#parent` won't show `#parent/child` blocks
- Very large vaults (10k+ notes) may show a brief delay on first render

## License

[MIT](LICENSE)
