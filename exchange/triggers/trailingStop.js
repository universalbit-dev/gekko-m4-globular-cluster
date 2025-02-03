const EventEmitter = require('events');

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
    super();

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
