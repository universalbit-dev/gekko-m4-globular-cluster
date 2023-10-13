#### Virtual Environment [NodEnv](https://gist.github.com/mrbar42/faa10a68e32a40c2363aed5e150d68da)
```
# install the base app
git clone https://github.com/nodenv/nodenv.git ~/.nodenv

# add nodenv to system wide bin dir to allow executing it everywhere
sudo ln -vs ~/.nodenv/bin/nodenv /usr/local/bin/nodenv

# compile dynamic bash extension to speed up nodenv - this can safely fail
cd ~/.nodenv
src/configure && make -C src || true
cd ~/

# install plugins
mkdir -p "$(nodenv root)"/plugins
git clone https://github.com/nodenv/node-build.git "$(nodenv root)"/plugins/node-build
git clone https://github.com/nodenv/nodenv-aliases.git $(nodenv root)/plugins/nodenv-aliases

# install a node version to bootstrap shims
nodenv install 20.8.0
nodenv global 20

# make shims available system wide
sudo ln -vs $(nodenv root)/shims/* /usr/local/bin/

# make sure everything is working
node --version
npm --version
npx --version
```
