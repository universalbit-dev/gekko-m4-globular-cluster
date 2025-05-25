# Installing and Updating NVM (Node Version Manager)

Node Version Manager (NVM) is a tool that allows developers to manage multiple versions of Node.js on their system seamlessly. It is especially useful when working on projects that require different Node.js versions.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Using cURL](#using-curl)
  - [Using Wget](#using-wget)
- [Post-Installation Configuration](#post-installation-configuration)
- [Verification](#verification)
- [Example Usage](#example-usage)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

---

## Prerequisites

Before installing NVM, ensure that:
- You have either `cURL` or `Wget` installed on your system.
- You know which profile file your shell uses (e.g., `~/.bashrc`, `~/.zshrc`, `~/.bash_profile`, or `~/.profile`).
- The tested and recommended Node.js version for this project is **21**.

---

## Installation

### Using cURL

Run the following command to install or update NVM using cURL:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/install.sh | bash
```

### Using Wget

Alternatively, use Wget to install or update NVM:

```bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
```

Running either of the above commands downloads a script and executes it. The script:
1. Clones the NVM repository to `~/.nvm`.
2. Adds the following lines to the appropriate profile file (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

---

## Post-Installation Configuration

After installing NVM:
1. Open a new terminal or reload your shell configuration using:
   ```bash
   source ~/.bashrc  # Replace with your profile file, if different
   ```
2. Confirm that NVM is loaded by running:
   ```bash
   command -v nvm
   ```
   If the command outputs `nvm`, the installation was successful.

---

## Verification

To verify the installation:
1. Run the following command to check the installed NVM version:
   ```bash
   nvm --version
   ```
2. If the version number is displayed, NVM is correctly installed.

---

## Example Usage

Here are some common NVM commands:


- **Install a specific Node.js version**:
  ```bash
  nvm install 21
  ```
- **Switch to a specific Node.js version**:
  ```bash
  nvm use 21
  ```
- **List installed Node.js versions**:
  ```bash
  nvm list
  ```
- **Set a default Node.js version**:
  ```bash
  nvm alias default 21
  ```
**Feel free to experiment with different Node.js versions during installation!**

While this project should work with the recommended Node.js versions, you are welcome to try installing and running it with newer versions such as Node.js 24. If you encounter any issues or have feedback about compatibility, please share your experience.

For example, to use Node.js 24 with nvm:

```bash
nvm install 24
nvm use 24
```
---

## Troubleshooting

### Common Issues
- **NVM command not found**: Ensure the lines added by the installation script are correctly placed in your profile file. Reload the profile file using `source`.
- **Permission errors**: Run the installation script with appropriate permissions or check directory permissions for `~/.nvm`.

### Debugging
Run the following command for detailed debug information:
```bash
nvm debug
```

---

## Additional Resources

- [NVM Repository](https://github.com/nvm-sh/nvm)
- [A Beginner's Guide to NVM](https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/)
- [Additional Notes](https://github.com/nvm-sh/nvm?tab=readme-ov-file#additional-notes)

---
