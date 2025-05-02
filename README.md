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
# Basic usage with PR URL
pr-review https://github.com/owner/repo/pull/123

# Basic usage with current branch PR
pr-review

# With options
pr-review https://github.com/owner/repo/pull/123 --verbose --new-editor --duration 30
# Or with current branch PR
pr-review --verbose --new-editor --duration 30

# Initialize configuration
pr-review init

# Check version
pr-review --version
```

### Available Commands

```bash
$ pr-review --help
Usage: pr-review [options] [command] [pr-url]

Tool to check out GitHub PRs and open them in your editor

Arguments:
  pr-url                    GitHub PR URL (optional, defaults to current branch PR)

Options:
  -v, --version             display version number
  --no-editor               Do not open the editor
  --new-editor              Open in a new editor window
  --reuse-editor            Reuse existing editor window
  -d, --duration <minutes>  Specify session duration in minutes
  --no-session              Do not start a session timer
  -V, --verbose             Enable verbose output
  -h, --help                display help for command

Commands:
  which-config              Show the location of the config file
  init [options]            Generate an initial configuration file
```

### Options

- `-v, --version`: Display the current version number
- `--no-editor`: Don't open the editor after checkout
- `--new-editor`: Open in a new editor window
- `--reuse-editor`: Reuse existing editor window
- `-d, --duration <minutes>`: Set session duration in minutes
- `--no-session`: Don't start a session timer
- `-V, --verbose`: Enable verbose output for debugging

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

The tool uses a configuration file at `~/.pr-review-tool.config.json`. You can generate an initial configuration file using:

```bash
# Interactive mode - will prompt for configuration
pr-review init

# Quick mode - uses default values
pr-review init --default
```

The configuration file supports the following options:

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