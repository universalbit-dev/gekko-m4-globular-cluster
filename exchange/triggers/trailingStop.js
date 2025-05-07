const EventEmitter = require('events');

/**
 * Class representing a Trailing Stop mechanism.
 * Supports trailing the price in a single direction (upward or downward).
 * On trigger (when the price moves in the opposite direction), you should take action (e.g., sell).
 */
class TrailingStop extends EventEmitter {
  /**
   * Create a TrailingStop.
   * @param {Object} params - The parameters for the trailing stop.
   * @param {number} params.trail - Fixed offset from the price.
   * @param {number} params.initialPrice - Initial price, preferably buy price.
   * @param {Function} params.onTrigger - Function to call when the stop triggers.
   * @param {'up'|'down'} params.direction - Direction of the trailing stop ('up' for upward, 'down' for downward).
   */
  constructor({ trail, initialPrice, onTrigger, direction = 'down' }) {
    super();

    if (trail <= 0 || initialPrice <= 0) {
      throw new Error('Trail and initialPrice must be positive numbers.');
    }
    if (!['up', 'down'].includes(direction)) {
      throw new Error("Direction must be either 'up' or 'down'.");
    }

    this.trail = trail;
    this.isLive = true;
    this.onTrigger = onTrigger;
    this.previousPrice = initialPrice;
    this.trailingPoint =
      direction === 'up'
        ? initialPrice + this.trail
        : initialPrice - this.trail;
    this.direction = direction;

    this.updatePrice = this.updatePrice.bind(this);
    this.updateTrail = this.updateTrail.bind(this);
    this.trigger = this.trigger.bind(this);
    this.reset = this.reset.bind(this);
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

    if (price <= 0) {
      throw new Error('Price must be a positive number.');
    }

    // Adjust the trailing point based on the new price
    if (this.direction === 'up' && price > this.previousPrice) {
      this.trailingPoint = price + this.trail;
    } else if (this.direction === 'down' && price < this.previousPrice) {
      this.trailingPoint = price - this.trail;
    }

    // Check if the trailing stop should trigger
    if (
      (this.direction === 'up' && price < this.trailingPoint) ||
      (this.direction === 'down' && price > this.trailingPoint)
    ) {
      this.trigger();
    }

    this.previousPrice = price;
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
    this.trailingPoint =
      this.direction === 'up'
        ? this.previousPrice + this.trail
        : this.previousPrice - this.trail;
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
        throw error; // Re-throw the error for further debugging
      }
    }
    this.emit('trigger', this.previousPrice);
  }

  /**
   * Reset the trailing stop with a new initial price.
   * @param {number} initialPrice - The new initial price.
   */
  reset(initialPrice) {
    if (initialPrice <= 0) {
      throw new Error('Initial price must be a positive number.');
    }

    this.isLive = true;
    this.previousPrice = initialPrice;
    this.trailingPoint =
      this.direction === 'up'
        ? initialPrice + this.trail
        : initialPrice - this.trail;
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
