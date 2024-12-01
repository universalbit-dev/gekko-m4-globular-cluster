// Small plugin that subscribes to some events, stores
// them and sends it to the parent process.
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
const log = require('../core/log');
const subscriptions = require('../subscriptions');
const util = require('../core/util');const config = require('../core/util').getConfig();
const fs= require("fs-extra");
const {EventEmitter} = require("events");

const ChildToParent = function() {
  EventEmitter.call(this);
  _.bindAll(this, _.functions(this));
  subscriptions
    .forEach(sub => {
      this[sub.handler] = (event, next) => {
        process.send({type: sub.event, payload: event});
        if(_.isFunction(next)) {next();}
      }
    }, this);
}
util.makeEventEmitter(ChildToParent);util.inherit(ChildToParent, EventEmitter);

module.exports = ChildToParent;
