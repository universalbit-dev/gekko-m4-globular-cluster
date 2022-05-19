const pm2 = require('pm2')
pm2.connect(function(err) {
  if (err) {
    console.error(err)
    process.exit(2)
  }

  pm2.start({
    script    : 'gekko.js',
    args      : '-c config.js --ui',
    name      : 'gekko-m4-nodejs_v12_ccxt'
  }, function(err, apps) {
    if (err) {
      console.error(err)
      return pm2.disconnect()
    }

    pm2.list((err, list) => {
      console.log(err, list)


    })
  })
})
