#### [NODENV](https://github.com/nodenv/nodenv) Manage multiple NodeJS versions. 

install the base app

```bash
git clone https://github.com/nodenv/nodenv.git ~/.nodenv
```
add nodenv to system wide bin directory to allow executing it everywhere
```bash
sudo ln -vs ~/.nodenv/bin/nodenv /usr/local/bin/nodenv
```
-- copilot short description -- :

nodeenv is a tool to create isolated Node.js environments. 
It is similar to Python's virtualenv, allowing you to manage different Node.js versions and associated packages in isolated environments.

compile dynamic bash extension to speed up nodenv -- this can safely fail --
```bash
cd ~/.nodenv
src/configure && make -C src || true
cd ~/
```

install plugins
```bash
mkdir -p "$(nodenv root)"/plugins
git clone https://github.com/nodenv/node-build.git "$(nodenv root)"/plugins/node-build
git clone https://github.com/nodenv/nodenv-aliases.git $(nodenv root)/plugins/nodenv-aliases
```
install a node version to bootstrap shims
```bash
nodenv install 20.8.0
nodenv global 20
```

make shims available system wide
```bash
sudo ln -vs $(nodenv root)/shims/* /usr/local/bin/
```
make sure everything is working
```bash
node --version
npm --version
npx --version
```
also can be integrated with the environment which was built by virtualenv (python) [nodeenv 1.8.0](https://pypi.org/project/nodeenv/)

Additional resources:
* [Installing nodenv on ubuntu](https://gist.github.com/mrbar42/faa10a68e32a40c2363aed5e150d68da)
* [How-to-setup-virtual-environments-in-Python](https://www.freecodecamp.org/news/how-to-setup-virtual-environments-in-python/)


