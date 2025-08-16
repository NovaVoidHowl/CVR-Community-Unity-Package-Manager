# Development Setup Guide

This guide will help you set up the development environment for the CVR Community Unity Package Manager.

## Prerequisites Installation

### 1. Install Rust

**Windows:**

- Download and run the Rust installer from <https://rustup.rs/>
- Or run this command in PowerShell:

   ```powershell
   Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "rustup-init.exe"
   .\rustup-init.exe
   ```

- Follow the installation prompts (default options are recommended)
- Restart your terminal/command prompt

**macOS/Linux:**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 2. Install Node.js

**Windows:**

- Download and install from <https://nodejs.org/> (LTS version recommended)

**macOS:**

```bash
# Using Homebrew
brew install node
```

**Linux (Ubuntu/Debian):**

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install Tauri CLI

After Rust and Node.js are installed:

```bash
cargo install tauri-cli
```

### 4. Additional Windows Dependencies

**Windows only** - Install Microsoft C++ Build Tools:

- Download Visual Studio Installer from <https://visualstudio.microsoft.com/downloads/>
- Install "Desktop development with C++" workload
- Or install just the build tools: <https://visualstudio.microsoft.com/visual-cpp-build-tools/>

## Verify Installation

Run these commands to verify everything is installed correctly:

```bash
# Check Rust
cargo --version
rustc --version

# Check Node.js
node --version
npm --version

# Check Tauri CLI
cargo tauri --version
```

## Development Workflow

### 1. Install Project Dependencies

```bash
npm install
```

### 2. Run in Development Mode

```bash
npm run dev
# Or use Tauri CLI directly:
cargo tauri dev
```

### 3. Build for Production

```bash
npm run build
# Or:
cargo tauri build
```

## Troubleshooting

### Common Issues

**"cargo: command not found" or similar:**

- Restart your terminal after installing Rust
- Run `source ~/.cargo/env` on macOS/Linux
- On Windows, restart PowerShell/Command Prompt

**Build errors on Windows:**

- Ensure Visual Studio Build Tools are installed
- Try installing the latest Windows SDK

**Permission errors:**

- On Windows, try running as Administrator
- On macOS/Linux, ensure you have proper permissions

**Package operations failing:**

- Ensure the Unity project has proper structure (Packages/manifest.json)
- Check that Git repositories are accessible (network connectivity)
- Verify project permissions for file operations

> **Note**: The application uses libgit2 for all Git operations, so no external Git installation is required.

### Getting Help

If you encounter issues:

- Check the [Tauri documentation](https://tauri.app/)
- Search existing issues on the project repository
- Create a new issue with your error details

## Project Structure Overview

- `src/` - Frontend HTML/CSS/JavaScript files with tabbed interface
- `src-tauri/` - Rust backend code and Tauri configuration
- `package.json` - Node.js dependencies and scripts
- `src-tauri/Cargo.toml` - Rust dependencies including git2, reqwest, serde
- `src-tauri/tauri.conf.json` - Tauri app configuration
- `sample-registry.json` - Example package registry format
- `SETUP.md` - This development setup guide
- `README.md` - Main project documentation

## Development Features

### Current Implementation

- **Package Management**: Full install/update/remove functionality
- **Git Operations**: Direct repository cloning with tag/branch support
- **Conflict Detection**: Automatic conflict resolution between package sources
- **Theme System**: Dark/Light/Auto theme switching
- **Multi-Project Support**: Manage multiple Unity projects simultaneously
- **Registry System**: Support for remote package registries

### Architecture

- **Frontend**: Single-page application with tab navigation
- **Backend**: Rust-based with Tauri framework for cross-platform support
- **Storage**: Local JSON configuration with automatic persistence
- **Git Integration**: Uses libgit2 for reliable Git operations

## Next Steps

Once your environment is set up:

- Run `npm run dev` to start the development server
- The app should open automatically
- Start developing! Changes to frontend files will hot-reload
- Rust changes require a restart of the dev server
