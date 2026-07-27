# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-01

### Added

- Architecture design (docs/architecture.md)
- Monorepo setup with Bun workspaces
- SDK package with types, schemas, and contracts
- Core runtime kernel with DI, event bus, lifecycle, config, and logging
- Storage layer with SQLite persistence
- Plugin manager with discovery, loading, and lifecycle management
- Match engine for turn-based match execution
- Runtime for battle orchestration and session management
- MCP protocol implementation and tool definitions
- Controller with virtual input devices (keyboard, mouse, gamepad)
- Observation system for perception pipeline
- Agent runtime for LLM agent execution
- Battle Tanks arena plugin
- Chess arena plugin
- Server with Hono REST API
- Web UI with React shell
- CLI tool with arena command
- Built-in plugins: chat, polls, export, rewards
- Project configuration files (.gitignore, .editorconfig, .prettierrc, etc.)
