const EventEmitter = require('events');
const _ = require('lodash');
/**
 * Class representing a Trailing Stop mechanism.
 * Note: As of now only supports trailing the price going up (after a buy),
 * on trigger (when the price moves down) you should sell.
 */
class TrailingStop extends EventEmitter {
  /**
   * Create a TrailingStop.
   * @param {Object} params - The parameters for the trailing stop.
   * @param {number} params.trail - Fixed offset from the price.
   * @param {number} params.initialPrice - Initial price, preferably buy price.
   * @param {Function} params.onTrigger - Function to call when the stop triggers.
   */
  constructor({trail, initialPrice, onTrigger}) {
    super(api);
    _.bindAll(this,_.functions(this));
    if (trail <= 0 || initialPrice <= 0) {
      throw new Error('Trail and initialPrice must be positive numbers.');
    }

    this.trail = trail;
    this.isLive = true;
    this.onTrigger = onTrigger;
    this.previousPrice = initialPrice;
    this.trailingPoint = initialPrice - this.trail;
  }

  /**
   * Update the price and check if the trailing stop should trigger.
   * @param {number} price - The current price.
   */
  updatePrice(price) {
    if (!this.isLive) {
      console.warn('TrailingStop is not live.');
      return;
    }

    if (price > this.trailingPoint + this.trail) {
      this.trailingPoint = price - this.trail;
    }

    this.previousPrice = price;

    if (price <= this.trailingPoint) {
      this.trigger();
    }
  }

  /**
   * Update the trail value and recheck if the trailing stop should trigger.
   * @param {number} trail - The new trail value.
   */
  updateTrail(trail) {
    if (!this.isLive) {
      console.warn('TrailingStop is not live.');
      return;
    }

    if (trail <= 0) {
      throw new Error('Trail must be a positive number.');
    }

    this.trail = trail;
    this.trailingPoint = this.previousPrice - this.trail;
    // Recheck whether moving the trail triggered.
    this.updatePrice(this.previousPrice);
  }

  /**
   * Trigger the trailing stop.
   */
  trigger() {
    if (!this.isLive) {
      console.warn('TrailingStop is not live.');
      return;
    }

    this.isLive = false;
    if (this.onTrigger) {
      try {
        this.onTrigger(this.previousPrice);
      } catch (error) {
        console.error('Error in onTrigger callback:', error);
      }
    }
    this.emit('trigger', this.previousPrice);
  }
}

module.exports = TrailingStop;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
