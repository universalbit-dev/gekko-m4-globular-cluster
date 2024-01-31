const _ = require('../core/lodash3');require('lodash-migrate');
var util = require('../core/util');

const subscriptions = require('../subscriptions');
const config = require('../core/util').getConfig().eventLogger;
var log = require('../core/log');

const EventLogger = function() {}
_.bindAll(this,_.functions(this));
_.each(subscriptions, sub => {
  if(config.whitelist && !config.whitelist.includes(sub.event)) {
    return;
  }
util.makeEventEmitter(EventLogger);



  EventLogger.prototype[sub.handler] = (event, next) => {
    log.info(`\t\t\t\t[EVENT ${sub.event}]\n`, event);
    if(_.isFunction(next))
      next();
  }
});

module.exports = EventLogger;
