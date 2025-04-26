[![CodeQL](https://github.com/universalbit-dev/gekko-m4-globular-cluster/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/universalbit-dev/gekko-m4-globular-cluster/actions/workflows/github-code-scanning/codeql)
 [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Hyperledger](https://img.shields.io/badge/hyperledger-2F3134?style=for-the-badge&logo=hyperledger&logoColor=white)](https://www.lfdecentralizedtrust.org/)
##### [Support UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support) -- [Disambiguation](https://en.wikipedia.org/wiki/Wikipedia:Disambiguation) -- [Bash Reference Manual](https://www.gnu.org/software/bash/manual/html_node/index.html) -- [Join Mastodon](https://mastodon.social/invite/wTHp2hSD) -- [Website](https://sites.google.com/view/universalbit-dev/home-page) -- [Content Delivery Network](https://universalbitcdn.it/) -- [Nodejs20](https://nodejs.org/en/blog/release/v20.15.0) -- [NVM](https://github.com/nvm-sh/nvm) -- [BTC TestNet](https://en.bitcoin.it/wiki/Testnet) -- [.ENV](https://www.dotenv.org/docs/frameworks/pm2/heroku)

<img src="https://github.com/universalbit-dev/universalbit-dev/blob/main/docs/assets/images/geppo.png" width="3%"></img>   
##### thinking sustainable personal finance

<img src="https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/images/gekko-m4-codespaces.png" width="auto"></img>   

# Gekko M4 Globular Cluster

**Feature-Rich [M4 NGC 6121]**

---

## Overview

The **Gekko M4 Globular Cluster** repository is a feature-rich implementation designed for advanced algorithmic trading. It leverages the Gekko trading bot framework with added capabilities to manage multiple trading strategies seamlessly.

---

## Features

- **Dynamic Strategy Management**: Create, manage, and execute multiple trading strategies within a single framework.
- **Custom Advice Handling**: Collect and process trading advice from each strategy dynamically.
- **Robust Base**: Built on top of Gekko's `tradingAdvisor` plugin for enhanced modularity.
- **Scalable Architecture**: Easily extendable to incorporate additional strategies and configurations.

---

## Requirements

Before setting up the project, make sure your environment meets the following requirements:

1. **System**: Linux (Tested on `Linux 6.11.0-24-generic`)
2. **Node.js**: Installed using [nvm](https://github.com/nvm-sh/nvm)  
   **Tested on Node.js version**: `v20.19.1`
3. **Packages**: Required build tools
   ```bash
   sudo apt install -y build-essential
   ```

---

## Installation & Setup

### 1. Install Node.js Using `nvm`

* Install `nvm`:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
   source ~/.nvm/nvm.sh
   ```

* Install Node.js:
   ```bash
   nvm install 20.19.1
   ```

* Set default Node.js version:
   ```bash
   nvm use 20.19.1
   nvm alias default 20.19.1
   ```

* Verify installation:
   ```bash
   node -v
   npm -v
   ```

### 2. Clone the Repository

```bash
git clone https://github.com/universalbit-dev/gekko-m4-globular-cluster.git
cd gekko-m4-globular-cluster
```

### 3. Install Dependencies

```bash
npm install && npm audit fix
npm cache clean --force && npm i tulind --save
npm i pm2 -g
```
### **PM2**
PM2 is a production process manager for Node.js applications. It helps manage application processes, ensuring they restart automatically in case of crashes and supporting features like load balancing, log management, and monitoring.

### **Tulind**
Tulind (Ta-Lib for Node.js) is a library for technical analysis in financial trading. It provides a wide range of indicators, such as moving averages, RSI, and MACD, to analyze stock or cryptocurrency price trends.

---
##### Test and simulate your strategies
* [Exchange Simulator](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/mode/trade/trade.md) 
* [Strategies](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/strategies/introduction.md)

##### Gekko Indicators Engine
* [Indicators](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/strategies/indicators)
* [Indicators -- short description --](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/indicators.md)

##### Start PM2 Ecosystem:
```bash
pm2 start simulator.config.js
```

##### To monitor the application and display real-time logs and system metrics, run the following command:
```bash
pm2 monit
```
The `pm2 monit` command is part of the [PM2 process manager](https://pm2.keymetrics.io/), a popular tool for managing and monitoring Node.js applications.

### Features
- The interface is divided into sections, each corresponding to a running application.
- You can view:
  - **Logs**: Check application output and errors.
  - **Metrics**: Real-time CPU and memory usage.
  - **Application State**: See if the application is online, stopped, or restarting.
---


### Troubleshooting Tulind Installation:
The `tulind` package may encounter some issues during installation due to missing dependencies, incorrect configurations, or build-related problems. Below are some common issues and their solutions:

#### **Common Issues**
1. **Build Errors**:
   - The system may lack the necessary build tools to compile the native module.
   - Missing or outdated dependencies can cause build failures.

2. **Module Compatibility**:
   - Incompatibility with the Node.js version being used.

3. **Incomplete Installation**:
   - The module may fail to install partially, leading to runtime errors.

#### **Solutions**
1. **Ensure Required Build Tools are Installed**:
   Run the following command to install the necessary build tools on Linux:
   ```bash
   sudo apt install -y build-essential
   ```

2. **Reinstall `tulind`**:
   Use the following commands to ensure a clean installation:
   - Standard installation:
     ```bash
     npm i tulind --save
     ```
   - Force rebuild from source if pre-built binaries fail:
     ```bash
     npm i tulind --build-from-source
     ```

3. **Verify Node.js Version Compatibility**:
   Ensure you're using a compatible Node.js version (e.g., `v20.19.1`). If needed, switch versions using `nvm`.

4. **Clear npm Cache**:
   If installation issues persist, clear the npm cache and attempt reinstallation:
   ```bash
   npm cache clean --force
   npm i tulind --save
   ```

5. **Debug Logs**:
   Run the installation with verbose logs to identify the root cause of the issue:
   ```bash
   npm i tulind --save --verbose
   ```

#### Resources:
* ##### [PM2](https://pm2.keymetrics.io/) Process Manager
* ##### [Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
* ##### [Thanks developers](https://github.com/askmike/gekko/graphs/contributors).
* ##### [Learning Together](https://www.esma.europa.eu/sites/default/files/2024-12/ESMA35-1872330276-1899_-_Final_report_on_GLs_on_reverse_solicitation_under_MiCA.pdf)
* ##### [Resources](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/resources/readme.md)
* ##### [NET Node](https://github.com/universalbit-dev/universalbit-dev/tree/main/blockchain/bitcoin)
* ##### [TulipIndicator](https://tulipindicators.org/)
* ##### [BlockChain Mining](https://github.com/universalbit-dev/universalbit-dev/tree/main/blockchain)





