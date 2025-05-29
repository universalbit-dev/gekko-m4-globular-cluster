# Installation & Environment Setup

**Repository:** [universalbit-dev/gekko-m4-globular-cluster](https://github.com/universalbit-dev/gekko-m4-globular-cluster)

---

## Prerequisites

Before starting, make sure your system has:

- **Operating System:** Windows, macOS, or Linux
- **Node.js:** v20 (recommended)
- **npm:** (comes bundled with Node.js)
- **Git:** For cloning the repository
- **nvm:** (Node Version Manager) - recommended for Node.js version management

---

## 1. Install Node Version Manager (nvm)

### macOS/Linux

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
# Reload your shell
source ~/.bashrc
nvm --version
```

### Windows

- Download the installer from [nvm-windows releases](https://github.com/coreybutler/nvm-windows/releases)
- Follow the installation prompts
- Open a new Command Prompt to verify:
```bash
nvm --version
```

---

## 2. Install Node.js (20) via nvm

```bash
nvm install 20
nvm use 20
nvm alias default 20
node --version   # Should display: v20
```
> 🧪 **Note:** Feel free to test the installation using Node.js version 24 and share your feedback!


---

## 3. Install Git

### macOS/Linux

```bash
sudo apt-get install git         # Ubuntu/Debian
sudo yum install git             # CentOS/RHEL
git --version
```

### Windows

- Download and install from [git-scm.com](https://git-scm.com/)
- Check version:
```bash
git --version
```

---

## 4. Clone the Repository

```bash
git clone https://github.com/universalbit-dev/gekko-m4-globular-cluster.git
cd gekko-m4-globular-cluster
```

---

## 5. Install Project Dependencies

```bash
npm install && npm audit fix && npm install pm2 -g
```
This installs and updates all dependencies listed in `package.json`.

---

## Additional Resources

- [Main README: Installation & Setup](https://github.com/universalbit-dev/gekko-m4-globular-cluster?tab=readme-ov-file#installation--setup)
- See `/docs` for further documentation and guides.
- Using `nvm` helps prevent Node.js version conflicts.

---

## Notes

- Ensure your system’s architecture (e.g., x64) matches Node.js and project requirements.
- For troubleshooting or advanced setup (like Docker or CI), see additional docs or open an issue.

---
