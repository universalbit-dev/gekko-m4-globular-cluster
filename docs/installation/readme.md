# Installation & Environment Setup

**Repository:** [universalbit-dev/gekko-m4-globular-cluster](https://github.com/universalbit-dev/gekko-m4-globular-cluster)

---

## 🚦 Prerequisites

Before you begin, ensure you have **all of the following:**

- **Operating System:** Linux, macOS, or Windows
- **Node.js:** v22 **(required!)**
- **npm:** (bundled with Node.js)
- **Git:** For cloning the repository
- **nvm:** (Node Version Manager) – recommended
- **Build Tools:** For native npm modules, required for Linux/macOS (see below)

---

## 1. Install Node Version Manager (**nvm**)

### macOS / Linux

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
# Reload your shell
source ~/.bashrc  # or: source ~/.zshrc
nvm --version
```

### Windows

- Download and install [nvm-windows](https://github.com/coreybutler/nvm-windows/releases/latest).
- Open a new terminal and check:
  ```bash
  nvm --version
  ```

---

## 2. Install Node.js (22.x) via nvm

```bash
nvm install 22
nvm use 22
nvm alias default 22
node --version   # Should display: v22.x.x
```

> **Important:**  
> This project requires Node.js v22+. Version 20 is **not supported.**  
> If you ever had Node.js v20 or v18 installed, run:
> ```bash
> nvm uninstall 18
> nvm uninstall 20
> ```

---

## 3. Install Git

### Linux

```bash
sudo apt-get install git         # Debian/Ubuntu
# or
sudo yum install git             # CentOS/RHEL/Fedora
git --version
```

### macOS

```bash
brew install git
git --version
```

### Windows

- Download and install from [git-scm.com](https://git-scm.com/download/win)
- Then check:
  ```bash
  git --version
  ```

---

## 4. Install Required Build Tools (Linux/macOS only)

This ensures native modules such as `tulind` compile successfully.

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y build-essential g++ python3 make
```

### macOS

```bash
xcode-select --install
```

### Windows

- Make sure you have [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) and [Python 3](https://www.python.org/) installed.

---

## 5. Clone the Repository

```bash
git clone https://github.com/universalbit-dev/gekko-m4-globular-cluster.git
cd gekko-m4-globular-cluster
```

---

## 6. Install All Project Dependencies

```bash
npm install
```

If you see errors or warnings related to `tulind`, run:

```bash
npm rebuild tulind --build-from-source
```

---

## 7. Install Global Helper Tools (PM2 & node-gyp)

```bash
npm install -g pm2 node-gyp
```

If you get permissions errors, use `sudo` or fix your `npm` prefix.

---

## 8. Quickstart: Automatic Setup Script

We provide a robust, environment-checking setup script:

```bash
chmod +x ngc6121.sh
./ngc6121.sh
```
This will check your system, install missing tools, rebuild native modules, and start `pm2` for you.

---

## 9. Start the PM2 Ecosystem

```bash
pm2 start simulator.config.js --name ngc6121
pm2 list
```

---

## 10. Verify Node.js Version and Module Health

Check your Node version:

```bash
node -v
# Should display: v22.x.x
```

Test `tulind` module:

```bash
node -e "require('tulind'); console.log('tulind loaded OK')"
```
If you see an error, rerun the rebuild:
```bash
npm rebuild tulind --build-from-source
```

---

## 🛠 Troubleshooting

- **After upgrading Node.js:**  
  Always run:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  npm rebuild
  ```
- **For detailed tulind troubleshooting:**  
  See [Troubleshooting Tulind Installation](./docs/troubleshooting_tulind_installation.md)
- **Permissions errors?**  
  Make sure your user owns the whole project directory:  
  ```bash
  sudo chown -R $USER:$USER .
  ```

---

## Additional Resources

- [Main README: Installation & Setup](https://github.com/universalbit-dev/gekko-m4-globular-cluster#installation--setup)
- [`ngc6121.sh`](./ngc6121.sh) – automated installer/setup script.
- [`/docs`](./docs/) – further documentation and guides.
- Using `nvm` prevents Node.js version conflicts.

---

## Notes

- Ensure your system’s architecture (e.g., x64) matches Node.js and project requirements.
- For Docker or CI setup, see additional documentation or open an issue.

---
