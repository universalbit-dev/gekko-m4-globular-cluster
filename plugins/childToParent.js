// Small plugin that subscribes to some events, stores
// them and sends it to the parent process.

const log = require('../core/log');
const _ = require('../core/lodash');
const subscriptions = require('../subscriptions');
const config = require('../core/util').getConfig();
const fs= require('node:fs');
const async=require('async');
async.map(['adviceLogger.js','backtestResultExporter.js','childToParent.js','eventLogger.js'], fs.stat, function(err, results){_.noop;});

const ChildToParent = function() {

  subscriptions
    .forEach(sub => {
      this[sub.handler] = (event, next) => {
        process.send({type: sub.event, payload: event});
        if(_.isFunction(next)) {
          next();
        }
      }
    }, this);

}

module.exports = ChildToParent;
