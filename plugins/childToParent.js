// Small plugin that subscribes to some events, stores
// them and sends it to the parent process.
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
const log = require('../core/log');
const _ = require('underscore');
const subscriptions = require('../subscriptions');
const config = require('../core/util').getConfig();
const fs= Promise.promisifyAll(require("fs-extra"));
const util = require('../core/util');
const EventEmitter=require('node:events');

const ChildToParent = function() {
  EventEmitter.call(this);
  _.bindAll(this, _.functions(ChildToParent.prototype));
  subscriptions
    .forEach(sub => {
      this[sub.handler] = (event, next) => {
        process.send({type: sub.event, payload: event});
        if(_.isFunction(next)) {next();}
      }
    }, this);

}
util.makeEventEmitter(ChildToParent);util.inherit(ChildToParent, EventEmitter);Promise.promisifyAll(ChildToParent);


module.exports = ChildToParent;
