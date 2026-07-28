# Contributing to AI Game Arena

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `bun install`
4. Create a feature branch: `git checkout -b feature/my-feature`

## Development

### Commands

```bash
# Install dependencies
bun install

# Typecheck all packages
bun run typecheck

# Format code
bun run format

# Build all packages
bun run build
```

### Project Structure

- `packages/` - Core packages (SDK, Core, Runtime, etc.)
- `apps/` - Server and Web UI
- `games/` - Arena plugins (battle-tanks, chess)
- `plugins/` - Built-in plugins (chat, polls, export, rewards)

### Creating a Plugin

1. Create a new directory in `plugins/`
2. Add `plugin.json` manifest (for plugins) or `game.json` (for games)
3. Implement `activate()` and `deactivate()` exports
4. Register MCP tools, event handlers, and UI panels

See existing plugins for examples.

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Run `bun run format` before committing

## Pull Requests

1. Update documentation if needed
2. Add tests for new features
3. Ensure all checks pass
4. Create a clear PR description

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
