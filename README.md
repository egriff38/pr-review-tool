# PR Review

A command-line tool to streamline your GitHub PR review workflow. This tool helps you:
- Quickly find and check out PRs from your local repositories
- Open the PR in your editor
- Start a session timer for focused review

## Installation

```bash
# Install globally using npm
npm install -g pr-review

# Or using pnpm
pnpm add -g pr-review
```

## Usage

```bash
# Basic usage
pr-review https://github.com/owner/repo/pull/123

# With options
pr-review https://github.com/owner/repo/pull/123 --verbose --new-editor --duration 30
```

### Options

- `--no-editor`: Don't open the editor after checkout
- `--new-editor`: Open in a new editor window
- `--reuse-editor`: Reuse existing editor window
- `-d, --duration <minutes>`: Set session duration in minutes
- `--no-session`: Don't start a session timer
- `-v, --verbose`: Enable verbose output for debugging

## Session Timer Integration

This tool integrates with [Session](https://www.stayinsession.com/), a focus timer app for macOS. When you start a PR review, it automatically:

1. Opens Session with a 25-minute timer (configurable)
2. Sets the session intent to "Review [PR URL]"
3. Categorizes the session as "PR Review"
4. Adds the PR URL as session notes

To use this feature:
1. Install [Session](https://www.stayinsession.com/) on your Mac
2. The timer will start automatically when you run `pr-review`
3. Use `--no-session` to disable the timer
4. Use `--duration` to set a custom session length

## Configuration

Create a `~/.prreviewrc` file to customize the tool's behavior:

```json
{
  "searchDirs": [
    "~/projects",
    "~/work",
    "~/github"
  ],
  "defaultSessionDuration": 25
}
```

### Configuration Options

- `searchDirs`: Array of directories to search for git repositories (supports `~` for home directory)
- `defaultSessionDuration`: Default session duration in minutes

## Requirements

- Node.js
- GitHub CLI (`gh`)
- VS Code (for editor integration)
- [Session](https://www.stayinsession.com/) (for timer integration)

## Development

```bash
# Install dependencies
pnpm install

# Link the package for development
pnpm link --global
```

## License

ISC 