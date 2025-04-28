# Installing Node.js

This guide provides detailed steps to install Node.js using NVM (Node Version Manager) and ensures you have the correct environment for your development needs.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installing NVM](#installing-nvm)
- [Installing Node.js](#installing-nodejs)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

---

## Prerequisites

Before proceeding, ensure:
- You have `cURL` or `Wget` installed on your system.
- You know which shell profile file your system uses (e.g., `~/.bashrc`, `~/.zshrc`).

---

## Installing NVM

Node Version Manager (NVM) is a tool that allows you to manage multiple versions of Node.js. To install NVM, follow these steps:

1. Install NVM using `cURL`:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   ```

2. Alternatively, use `Wget`:
   ```bash
   wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   ```

3. Reload your shell configuration:
   ```bash
   source ~/.bashrc  # Replace with your shell's profile file if different
   ```

4. Verify the NVM installation:
   ```bash
   command -v nvm
   ```
   If the command outputs `nvm`, the installation was successful.

---

## Installing Node.js

1. Install the latest stable version of Node.js:
   ```bash
   nvm install --lts
   ```

2. Install a specific version of Node.js (e.g., version 21.19.0):
   ```bash
   nvm install 21.19.0
   ```

3. Set a default Node.js version:
   ```bash
   nvm alias default 21.19.0
   ```

4. Verify the Node.js installation:
   ```bash
   node --version
   ```

---

## Verification

To ensure your Node.js environment is correctly set up:
1. Check the installed Node.js version:
   ```bash
   node --version
   ```

2. Check the installed NPM (Node Package Manager) version:
   ```bash
   npm --version
   ```

---

## Troubleshooting

### Common Issues
- **NVM command not found**: Ensure the installation script added the necessary lines to your profile file and reload it using `source`.
- **Permission denied**: Run the installation script with appropriate permissions or check the directory permissions for `~/.nvm`.

### Debugging
- Run the following command for detailed debug output from NVM:
  ```bash
  nvm debug
  ```

---

## Additional Resources

- [Node.js Official Website](https://nodejs.org)
- [NVM Repository](https://github.com/nvm-sh/nvm)
- [Node.js Learn](https://nodejs.dev/en/learn/)

---
