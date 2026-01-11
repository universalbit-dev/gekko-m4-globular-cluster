---

## 📢 Support the UniversalBit Project
Help us grow and continue innovating!  
- [Support the UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support)  
- [Learn about Disambiguation](https://en.wikipedia.org/wiki/Wikipedia:Disambiguation)  
- [Bash Reference Manual](https://www.gnu.org/software/bash/manual/)


##### thinking sustainable personal finance
<img src="https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/images/ai_snail.png" width="auto"></img>   

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

## 📚 Project Documentation Overview

- 🗂️ **Main documentation is available in:**
  - [`docs/`](./docs/) – Core guides and references
  - [`tools/docs/`](./tools/docs/) – Tool-specific documentation

- 📄 **Important:**  
  For configuring dynamic exchange simulators and using live public data, **please read [`docs/env_file.md`](./docs/env_file.md)** carefully.

---
## Requirements

Before setting up the project, make sure your environment meets the following requirements:

- **Node.js 20**: Installed using [nvm](https://github.com/nvm-sh/nvm)  
- **Packages**: Required build tools for native module compilation:
   ```bash
   sudo apt update
   sudo apt install -y build-essential g++ python3 make node-gyp
   ```

---

#### **Installation & Setup** []
##### Install Node.js Using [`nvm`](https://github.com/nvm-sh/nvm)
To manage and install Node.js, use `nvm` (Node Version Manager):

* Install Node.js version `20`:
   ```bash
   nvm install 20
   nvm use 20
   ```
* **Verify your version:**
   ```bash
   node -v
   ```
   Should print something like `v20.x.x`
---
 

##### Clone the Repository

Download the project by cloning the repository:

```bash
git clone https://github.com/universalbit-dev/gekko-m4-globular-cluster.git
cd gekko-m4-globular-cluster
```
---

**Secure the configuration file**
```bash
sudo chmod 600 .env
```
---

##### Quickly install all dependencies and start the node ecosystem using PM2!

**Give Permission to Execute the Script**  
   Open your terminal in the project root and run:  
   ```bash
   chmod +x ngc6121.sh
   ```

**Run the Script**  
   Start the setup and all processes with:  
   ```bash
   ./ngc6121.sh
   ```

This will ensure that all necessary modules are installed and the application is ready to run.

##### [Troubleshooting Tulind Installation](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/troubleshooting_tulind_installation.md)

---

#### **Test and simulate your strategies**
- **[Exchange Simulator](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/mode/simulator/readme.md)** 
- **[Strategies](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/strategies/introduction.md)**

#### **Gekko Indicators Engine**
- **[Indicators](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/strategies/indicators)**
- **[Indicators -- short description --](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/indicators.md)**


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
> ℹ️ **Gekko M4 Globular Cluster Tools**  
> Discover a set of powerful tools designed to enhance your workflow!  
> You can find all available tools in [`/tools`](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/tools).


#### **Resources**
* #### **[Docs](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/docs)**  - Resources, guides, and references to understand, use, and extend the project 
* #### **[PM2](https://pm2.keymetrics.io/)** - Process Manager for Node.js applications.
* #### **[Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)** - Guide to defining PM2 application declarations.
* #### **[Thanks Developers](https://github.com/askmike/gekko/graphs/contributors)** - Acknowledgment to contributors of the Gekko project.
* #### **[MiCA Regulation & This Project](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/MiCA_regulation_and_this_project.md)** - How MiCA Relates to This Project.
    
* #### **[Project Resources](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/resources/readme.md)** - Additional resources related to this project.
* ##### **[NET Node](https://github.com/universalbit-dev/universalbit-dev/tree/main/blockchain/bitcoin)** - Explore Bitcoin-specific blockchain nodes.
* #### **[TulipIndicators](https://tulipindicators.org/)** - Technical analysis indicators for financial data.
* #### **[Blockchain Mining](https://github.com/universalbit-dev/universalbit-dev/tree/main/blockchain)** - Resources on blockchain and mining.

---

> ### 📌 **Note on Calculations**
>
> When working with this project, you may encounter both:
>
> - 📊 **Deterministic Calculations:**  
>   Always give the same result when using the same input—precise and predictable.
>
> - 🎲 **Random (Unpredictable) Calculations:**  
>   Add an element of chance, so results may change even with the same input.
>
> **Why this matters:**  
> 📊 Deterministic processes are best when you need repeatable and reliable results.  
> 🎲 Random processes are great for modeling uncertainty or real-world situations where outcomes aren’t always predictable.
>
> Understanding which type is used in different parts of this project will help you interpret the results correctly and decide how to use or adjust the code for your needs.

---
