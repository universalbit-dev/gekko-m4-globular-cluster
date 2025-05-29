# NODENV

[NODENV](https://github.com/nodenv/nodenv) is a powerful tool for managing multiple Node.js versions. It allows you to create isolated Node.js environments, similar to how Python's `virtualenv` works. This isolation ensures that different projects can use different Node.js versions and dependencies without conflicts.

---

## Overview

NODENV is designed to:
- Simplify the management of multiple Node.js versions.
- Enable seamless switching between versions for different projects.
- Work well in isolated environments, such as those created by Python's `virtualenv` or `nodeenv`.

By using NODENV, you can ensure compatibility and maintain a clean development environment for your projects.

---

## Installation Guide

### Step 1: Install NODENV
Clone the NODENV repository to your system:
```bash
git clone https://github.com/nodenv/nodenv.git ~/.nodenv
```

### Step 2: Add NODENV to System-wide Bin Directory
To make NODENV executable anywhere on your system:
```bash
sudo ln -vs ~/.nodenv/bin/nodenv /usr/local/bin/nodenv
```

### Step 3: Compile Dynamic Bash Extension (Optional)
This step speeds up NODENV but is optional and safe to skip if it fails:
```bash
cd ~/.nodenv
src/configure && make -C src || true
cd ~/
```

---

## Plugins for Extended Functionality

Enhance NODENV by installing these plugins:
```bash
mkdir -p "$(nodenv root)"/plugins
git clone https://github.com/nodenv/node-build.git "$(nodenv root)"/plugins/node-build
git clone https://github.com/nodenv/nodenv-aliases.git $(nodenv root)/plugins/nodenv-aliases
```

---

## Setting Up a Node.js Version

1. Install a Node.js version:
   ```bash
   nodenv install 21
   nodenv global 21
   ```

2. Make shims available system-wide:
   ```bash
   sudo ln -vs $(nodenv root)/shims/* /usr/local/bin/
   ```

3. Verify the installation:
   ```bash
   node --version
   npm --version
   npx --version
   ```

---
> **Note:**  
> Both [`nodenv`](https://github.com/nodenv/nodenv) and [`nvm`](https://github.com/nvm-sh/nvm) are popular tools for managing multiple Node.js versions.  
> 
> - **nodenv** is a lightweight version manager that uses shims, similar to rbenv, and works well in Unix-like environments.
> - **nvm** is a widely-used bash-based version manager, popular in the broader Node.js community.
>
> The command  
> ```sh
> nodenv install 21
> ```
> works similarly to  
> ```sh
> nvm install 21
> ```
> Both commands will install Node.js version `21` using their respective tools.  
>
> Choose the one that best fits your workflow or project requirements.

## Integration with Other Tools

### Integration with Python's Virtual Environments
NODENV can be used alongside Python's `virtualenv` for managing isolated environments. This allows combining Python and Node.js environments for projects requiring both. For example:
- Use [nodeenv 1.8.0](https://pypi.org/project/nodeenv/) for creating Node.js environments within Python virtual environments.

---

## Additional Resources

- [Installing NODENV on Ubuntu](https://gist.github.com/mrbar42/faa10a68e32a40c2363aed5e150d68da)
- [How to Set Up Virtual Environments in Python](https://www.freecodecamp.org/news/how-to-setup-virtual-environments-in-python/)

---
