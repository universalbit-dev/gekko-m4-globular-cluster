// exchange/socketConnection.js
class SocketConnection {
  constructor(api, retryDelay = 1000) {
    this.api = api;
    this.retryDelay = retryDelay;
  }

  async fetchTickerWithRetry(market) {
    try {
      const ticker = await this.api.fetchTicker(market);
      return ticker;
    } catch (err) {
      console.log(this.api.name, err.message);
      if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.message === 'socket hang up') {
        console.log('Retrying fetchTicker due to socket hang up...');
        await this.delay(this.retryDelay); // Delay before retry
        return this.fetchTickerWithRetry(market); // Retry fetching ticker
      }
      throw new Error('Failed to fetch ticker after retries');
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = SocketConnection;
