# Preparing the Environment for Gekko-M4 Globular Cluster

## Prerequisites
Before starting, ensure that your system meets the following requirements:
1. **Operating System**: Compatible with Windows, macOS, or Linux.
2. **Node.js Version**: `20.19.1` (tested and recommended).
3. **Package Manager**: `npm` (comes with Node.js).
4. **Git**: Ensure Git is installed to clone the repository.
5. **nvm (Node Version Manager)**: Recommended to manage Node.js versions.

---

## Step 1: Install `nvm` (Node Version Manager)
Using `nvm` allows you to easily install and switch between Node.js versions.

### For macOS/Linux:
1. Open your terminal and run:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
   ```
2. After installation, reload your shell configuration:
   ```bash
   source ~/.bashrc
   ```
   or
   ```bash
   source ~/.zshrc
   ```
3. Verify the installation:
   ```bash
   nvm --version
   ```

### For Windows:
1. Download the `nvm for Windows` installer from the [nvm-windows GitHub releases page](https://github.com/coreybutler/nvm-windows/releases).
2. Install `nvm` by following the prompts in the installer.
3. After installation, open a new command prompt and verify the installation:
   ```bash
   nvm --version
   ```

---

## Step 2: Install Node.js (Version 20.19.1)
Once `nvm` is installed, use it to install the required Node.js version.

1. Install Node.js version `20.19.1`:
   ```bash
   nvm install 20.19.1
   ```
2. Use Node.js version `20.19.1`:
   ```bash
   nvm use 20.19.1
   ```
3. Set it as the default version:
   ```bash
   nvm alias default 20.19.1
   ```
4. Confirm the installed version:
   ```bash
   node --version
   ```
   The output should be:
   ```
   v20.19.1
   ```

---

## Step 3: Install Git
Ensure Git is installed on your system to clone the `Gekko-M4` repository.

### For macOS/Linux:
1. Install Git using your package manager:
   ```bash
   sudo apt-get install git       # For Ubuntu/Debian
   sudo yum install git           # For CentOS/RHEL
   ```
2. Verify the installation:
   ```bash
   git --version
   ```

### For Windows:
1. Download and install Git from the [official Git website](https://git-scm.com/).
2. Verify the installation:
   ```bash
   git --version
   ```

---

## Step 4: Clone the Gekko-M4 Repository
1. Open your terminal or command prompt and run:
   ```bash
   git clone https://github.com/universalbit-dev/gekko-m4
   ```
2. Navigate to the cloned repository:
   ```bash
   cd gekko-m4
   ```

---

## Step 5: Install Dependencies
1. Use `npm` to install the required dependencies:
   ```bash
   npm install && npm audit fix
   ```
   This will install all necessary packages specified in the `package.json` file.

---

## Additional Notes
- **Repository Documentation**: For more details, refer to the [Installation & Setup Guide](https://github.com/universalbit-dev/gekko-m4-globular-cluster?tab=readme-ov-file#installation--setup).
- **System Compatibility**: Ensure your system architecture (e.g., x64) matches the requirements for Node.js and `Gekko-M4`.
- **nvm Benefits**: Using `nvm` ensures no conflicts with other Node.js versions installed on your system.

---
