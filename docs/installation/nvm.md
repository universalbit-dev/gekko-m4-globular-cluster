* [NVM Repository](https://github.com/nvm-sh/nvm)
* [Node versions on your device](https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/)

Installing and Updating
Install & Update Script

To install or update nvm, you should run the install script. To do that, you may either download and run the script manually, or use the following cURL or Wget command:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```
```bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Running either of the above commands downloads a script and runs it. 
The script clones the nvm repository to 
```bash
~/.nvm
```
 and attempts to add the source lines from the snippet below to the correct profile file 
 ```bash
 ~/.bash_profile, ~/.zshrc, ~/.profile, or ~/.bashrc
```
```bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```
[Additional Notes](https://github.com/nvm-sh/nvm?tab=readme-ov-file#additional-notes)

