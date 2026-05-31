![Project Status: Development Stopped](https://img.shields.io/badge/status-development%20stopped-red)
## 🚀 Quick HTTPS Setup for Grafana (Advanced Charting)

To make advanced charting with Grafana easy in Gekko M4 Globular Cluster, this repo includes:

- **`https_ngc6121_setup.sh`** — Automated setup script for Grafana with HTTPS  
- **`ssl/distinguished.cnf`** — SSL certificate configuration file

### 📦 How to Use
1. **Ensure you are you are inside the `ssl/` directory and that `distinguished.cnf` exists in this folder.**
2. **Make the setup script executable:**
   ```bash
   chmod +x https_ngc6121_setup.sh
   ```
3. **Run the setup script:**
   ```bash
   ./https_ngc6121_setup.sh
   ```

#### This script will:

- Install Grafana if needed
- Set up firewall and dependencies
- Generate and install a self-signed SSL certificate
- Configure Grafana for HTTPS
- Start the Grafana server

4. **Access Grafana:**  
   Open [https://localhost:3000](https://localhost:3000) in your browser.  
   *(You may see a browser warning about the self-signed certificate.)*

---

> ℹ️ **Note:**  
> This script is intended as a beginner-friendly, local/development setup for running Grafana with HTTPS in the Gekko M4 Globular Cluster project.  
> For production use, advanced configuration, or best security practices, always refer to the official Grafana documentation:  
> [Set up HTTPS in Grafana (Official Docs)](https://grafana.com/docs/grafana/latest/setup-grafana/set-up-https/)

---
