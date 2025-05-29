---

## 📢 Support the UniversalBit Project
Help us grow and continue innovating!  
- [Support the UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support)  
- [Learn about Disambiguation](https://en.wikipedia.org/wiki/Wikipedia:Disambiguation)  
- [Bash Reference Manual](https://www.gnu.org/software/bash/manual/)


##### thinking sustainable personal finance
<img src="https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/images/snail.png" width="auto"></img>   

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

- **System**: Linux (Tested on `Linux 6.11.0-24-generic`)
- **Node.js**: Installed using [nvm](https://github.com/nvm-sh/nvm)  
- **Tested on Node.js version**: `20`
- **Packages**: Required build tools
   ```bash
   sudo apt install -y build-essential
   ```
---

#### **Installation & Setup**

##### Install Node.js Using [`nvm`](https://github.com/nvm-sh/nvm)
To manage and install Node.js, use `nvm` (Node Version Manager):

* Install Node.js version `20`:
   ```bash
   nvm install 20
   ```
#### Feel free to test installation and contribute using **Node.js** version 24.  

##### Clone the Repository

Download the project by cloning the repository:

```bash
git clone https://github.com/universalbit-dev/gekko-m4-globular-cluster.git
cd gekko-m4-globular-cluster
```

##### Install Dependencies

Install all required Node.js packages and dependencies:

```bash
npm i && npm audit fix && npm i pm2 -g 
``` 

This will ensure that all necessary modules are installed and the application is ready to run.

##### [Troubleshooting Tulind Installation](#troubleshooting-tulind-installation-1)

---

#### **Test and simulate your strategies**
- **[Exchange Simulator](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/mode/simulator/readme.md)** 
- **[Strategies](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/strategies/introduction.md)**

#### **Gekko Indicators Engine**
- **[Indicators](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/strategies/indicators)**
- **[Indicators -- short description --](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/indicators.md)**

#### **Start PM2 Ecosystem**

To run the PM2 process manager with the specified configuration file:

```bash
pm2 start simulator.config.js --merge-logs --log-date-format "YYYY-MM-DD HH:mm:ss"
```

This command will start the PM2 ecosystem using the `simulator.config.js` file, which defines the processes and settings required for your application.

#### **Monitor your application and display real-time logs**:
```bash
pm2 monit
```
The `pm2 monit` command is part of the [PM2 process manager](https://pm2.keymetrics.io/), a popular tool for managing and monitoring Node.js applications.

#### **Advanced Charting**

For details on implementing advanced charting for this project, refer to the dedicated documentation:  
- **[Advanced Charting](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/ngc6121_advanced_charting.md)**
- **[Quick HTTPS Setup](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/ssl)**
- **[Design a Reusable Winston Logger](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/ngc6121_advanced_charting.md#design-a-reusable-winston-logger-module--loggerjs)**
---

### Troubleshooting Tulind Installation:
The `tulind` package may encounter some issues during installation due to missing dependencies, incorrect configurations, or build-related problems. Below are some common issues and their solutions:

#### **Common Issues**
- **Build Errors**:
   - The system may lack the necessary build tools to compile the native module.
   - Missing or outdated dependencies can cause build failures.

- **Module Compatibility**:
   - Incompatibility with the Node.js version being used.

- **Incomplete Installation**:
   - The module may fail to install partially, leading to runtime errors.

#### **Solutions**
**Ensure Required Build Tools are Installed**:
   Run the following command to install the necessary build tools on Linux:
   ```bash
   sudo apt install -y build-essential
   ```

**Reinstall `tulind`**:
   Use the following commands to ensure a clean installation:
   - Standard installation:
     ```bash
     npm i tulind --save
     ```
   - Force rebuild from source if pre-built binaries fail:
     ```bash
     npm i tulind --build-from-source
     ```

**Verify Node.js Version Compatibility**:
   Ensure you're using a compatible Node.js version (e.g., `20`). If needed, switch versions using `nvm`.

**Clear npm Cache**:
   If installation issues persist, clear the npm cache and attempt reinstallation:
   ```bash
   npm cache clean --force
   npm i tulind --save
   ```

**Debug Logs**:
   Run the installation with verbose logs to identify the root cause of the issue:
   ```bash
   npm i tulind --save --verbose
   ```
   
#### **Resources**

* ##### [PM2](https://pm2.keymetrics.io/) - Process Manager for Node.js applications.
* ##### [Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/) - Guide to defining PM2 application declarations.
* ##### [Thanks Developers](https://github.com/askmike/gekko/graphs/contributors) - Acknowledgment to contributors of the Gekko project.
* ##### [Learning Together](https://www.esma.europa.eu/sites/default/files/2024-12/ESMA35-1872330276-1899_-_Final_report_on_GLs_on_reverse_solicitation_under_MiCA.pdf) - Educational resources on financial regulations and MiCA.
* ##### [Project Resources](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/resources/readme.md) - Additional resources related to this project.
* ##### [NET Node](https://github.com/universalbit-dev/universalbit-dev/tree/main/blockchain/bitcoin) - Explore Bitcoin-specific blockchain nodes.
* ##### [TulipIndicators](https://tulipindicators.org/) - Technical analysis indicators for financial data.
* ##### [Blockchain Mining](https://github.com/universalbit-dev/universalbit-dev/tree/main/blockchain) - Resources on blockchain and mining.
