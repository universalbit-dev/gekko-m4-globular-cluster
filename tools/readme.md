## 🚦 **Gekko ML Prediction Workflow**

### 🗂️ **Directory Structure**
```
/core/convnet.js              # 🧠 Main ML library
/tools/
    train_ohlcv.js            # 🏋️‍♂️ Training script
    chart_recognition.js      # 🔮 Prediction script
    trained_ohlcv.json        # 💾 Saved model (output)
    ohlcv_data_prediction.csv # 📈 Predictions (output)
/logs/csv/ohlcv_data.csv      # 📄 Raw data from CSVEXPORT strategy
```

---

### 🔄 **Data Flow**
1. 📤 **CSVEXPORT**  
   - Generates `/logs/csv/ohlcv_data.csv` from Gekko strategy.

2. 🏋️‍♂️ **Model Training**  
   - Run:  
     ```bash
     node train_ohlcv.js
     ```
   - Loads labeled data, trains the neural network, and saves the model as `/tools/trained_ohlcv.json`.

3. 🔮 **Prediction**  
   - Run:  
     ```bash
     node chart_recognition.js
     ```
   - Loads the trained model and latest CSV data, outputs predictions to `/tools/ohlcv_data_prediction.csv`.

---

### 📂 **Outputs & Where to Find Them**
- **All ML outputs (model + predictions) are in `/tools/`**  
  - 💾 `trained_ohlcv.json` — your trained model  
  - 📈 `ohlcv_data_prediction.csv` — your predictions  
- **Raw source data always in:**  
  - 📄 `/logs/csv/ohlcv_data.csv` (from Gekko)

---

### 🚀 **How to Use (Step by Step)**
1. **Export OHLCV data:**  
   - Use the Gekko `CSVEXPORT` strategy (outputs to `/logs/csv/ohlcv_data.csv`).

2. **Add Labels:**  
   - Make sure each row in your JSON data has a `label` field (e.g., 0 = bull, 1 = bear, 2 = idle).

3. **Train the Model:**  
   - In the `/tools/` directory, run:  
     ```bash
     node train_ohlcv.js
     ```

4. **Predict with the Model:**  
   - Still in `/tools/`, run:  
     ```bash
     node chart_recognition.js
     ```

5. **Find Results:**  
   - Open `/tools/ohlcv_data_prediction.csv` for your prediction results!

---

### 💡 **Tips**
- Keep `/tools/` as your main workspace for all ML scripts and outputs.
- Always check that your `/logs/csv/ohlcv_data.csv` is up-to-date before training or predicting.
- Label your training data before running the training script.
