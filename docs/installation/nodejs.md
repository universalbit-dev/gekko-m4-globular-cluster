# 🚀 Installing Node.js

This guide provides detailed steps to install Node.js using NVM (Node Version Manager), ensuring you have the correct environment for development.

## 📋 Table of Contents

- [🔧 Prerequisites](#-prerequisites)
- [📥 Installing NVM](#-installing-nvm)
- [📦 Installing Node.js](#-installing-nodejs)
- [✅ Verification](#-verification)
- [🛠️ Troubleshooting](#-troubleshooting)
- [📚 Additional Resources](#-additional-resources)

---

## 🔧 Prerequisites

Before proceeding, ensure:
- 🖥️ You have `cURL` or `Wget` installed.
- 📝 You know which shell profile your system uses (e.g., `~/.bashrc`, `~/.zshrc`).

---

## 📥 Installing NVM

Node Version Manager (NVM) lets you manage multiple Node.js versions easily. To install NVM, use one of the following commands (they always fetch the latest version):

- Using **cURL**:
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
  ```
- Or using **Wget**:
  ```bash
  wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
  ```

🔄 After running the install script, reload your shell configuration (replace `.bashrc` with your shell's config file if needed):

```bash
source ~/.bashrc
```

🔎 Verify NVM installation:

```bash
command -v nvm
```
If the command outputs `nvm`, the installation was successful.

---

## 📦 Installing Node.js

> **Note:** 🆕 You can install and use any Node.js version. Feel free to experiment with Node.js 24 (the latest LTS) or other versions. If you encounter issues with a specific version, please [submit an issue](../../issues) so we can improve compatibility!

1. ⬇️ Install the latest LTS version of Node.js:
   ```bash
   nvm install --lts
   ```

2. 🎯 To install a specific major version (for example, Node.js 21):
   ```bash
   nvm install 21
   ```

3. 📌 Set a default Node.js version:
   ```bash
   nvm alias default 21
   ```

4. 🔍 Verify your Node.js installation:
   ```bash
   node --version
   ```

---

## ✅ Verification

1. 🏷️ Check the installed Node.js version:
   ```bash
   node --version
   ```

2. 📦 Check the installed npm (Node.js package manager) version:
   ```bash
   npm --version
   ```

---

## 🛠️ Troubleshooting

### Common Issues

- ❓ **NVM command not found**: Make sure the install script added the required lines to your shell profile. Reload it using `source ~/.bashrc` or your shell's config file.
- 🔒 **Permission denied**: Ensure you have the correct permissions, and check directory permissions for `~/.nvm`.

### Debugging

🐞 To get detailed debug output from NVM:
```bash
nvm debug
```

---

## 📚 Additional Resources

- 🌐 [Node.js Official Website](https://nodejs.org)
- 🗃️ [NVM GitHub Repository](https://github.com/nvm-sh/nvm)
- 📖 [Node.js Learning Resources](https://nodejs.dev/en/learn/)

---
