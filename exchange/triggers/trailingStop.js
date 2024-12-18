const {EventEmitter} = require('events');
const util = require('../../core/util');

class Event extends EventEmitter {};
const eventEmitter = new Event();

// @param initialPrice: initial price, preferably buy price
// @param trail: fixed offset from the price
// @param onTrigger: fn to call when the stop triggers
class TrailingStop extends Event{
  constructor({trail, initialPrice, onTrigger}) {
    super();
    EventEmitter.call(this);
    this.trail = trail;
    this.isLive = true;
    this.onTrigger = onTrigger;
    this.previousPrice = initialPrice;
    this.trailingPoint = initialPrice - this.trail;
  }

  updatePrice(price) {
    if(!this.isLive) {return;}
    if(price > this.trailingPoint + this.trail) {this.trailingPoint = price - this.trail;}
    this.previousPrice = price;

    if(price <= this.trailingPoint) {this.trigger();}
  }

  updateTrail(trail) {
    if(!this.isLive) {return;}

    this.trail = trail;
    this.trailingPoint = this.previousPrice - this.trail;
    // recheck whether moving the trail triggered.
    this.updatePrice(this.previousPrice);
  }

  trigger() {
    if(!this.isLive) {
      return;
    }

    this.isLive = false;
    if(this.onTrigger) {
      this.onTrigger(this.previousPrice);
    }
    eventEmitter.emit('trigger', this.previousPrice);
  }
}
util.makeEventEmitter(TrailingStop);

module.exports = TrailingStop;
