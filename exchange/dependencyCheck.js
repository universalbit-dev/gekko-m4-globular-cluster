const deps = require('./package.json').dependencies;const missing = [];

Object.keys(deps).forEach(dep => {
  try {require(dep);} 
  catch(e) {if(e.code === 'MODULE_NOT_FOUND') {missing.push(dep);}
  }
});

if(missing.length) {
  console.error(
    '\nThe following Gekko Broker dependencies are not installed: [',
    missing.join(', '),
    '].\n\nYou need to install them first, read here how:',''
  );
  process.exit(1);
}
