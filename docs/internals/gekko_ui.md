# UI Interface Cancelled

Currently, the Gekko UI interface is cancelled. This means all operations and functionalities must be performed directly through the terminal. 

## What Does This Mean?

- **No Graphical Interface**: You will not be able to interact with Gekko through a web-based or graphical interface.
- **Terminal-Only Operations**: All commands, configurations, and outputs will need to be managed via the command line.

## How to Work in Console Mode

1. **Run Commands**: Use the terminal to execute Gekko commands. For example:
   ```bash
   node gekko --config config.js
   ```
   Replace `config.js` with your specific configuration file.

2. **Configure Settings**: Make adjustments to configuration files manually. These files are usually found under the `env/` directory.

3. **View Output**: All logs, errors, and outputs will be displayed directly in the terminal.

## Benefits of Terminal Mode

- **Lightweight Operation**: Terminal mode consumes fewer system resources compared to running a full UI.
- **Greater Control**: Direct access to commands and logs provides advanced users with more control over Gekko's behavior.
- **Easier Debugging**: Errors and logs are immediately accessible in the terminal for troubleshooting.
