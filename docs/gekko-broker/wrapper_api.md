![Horizontal Scalability Architecture](../../images/horizontal%20scalability.png)

## Horizontal Scalability

scale your simulation environment by running multiple broker instances in parallel. This architecture lets you distribute workloads across processes or servers, enabling robust, high-performance operations for demanding tasks.

## Event-Driven Architecture

The broker is built on Node.js’s EventEmitter. This means your application can listen for **key events** and respond instantly. This event-driven approach makes your integration seamless, responsive, and easy to extend.

## Unified Exchange Interface

Switch effortlessly between **Simulated** and **Public** live market data environments. The broker abstracts away exchange details so you can use **ExchangeSimulator** in development and testing or the **[The CCXT](https://github.com/ccxt/ccxt)** with minimal code changes.

---

# Architectural Overview

The core broker is designed as a class that extends EventEmitter, providing a modular backbone for scalable, distributed trading systems. By decoupling exchange logic and supporting both simulated and live environments, this approach gives you flexibility.

---
