import ccxt from '../../js/ccxt.js';

async function test() {
    // Define exchange credentials
    const exchangeConfigs = {
        bittrex: { apiKey: 'YOUR_API_KEY', secret: 'YOUR_SECRET' },
        bitfinex: { apiKey: 'YOUR_API_KEY', secret: 'YOUR_SECRET' },
    };

    // Filter only supported exchanges present in ccxt
    const ids = ccxt.exchanges.filter(id => id in exchangeConfigs);

    const exchanges = {};

    await Promise.all(ids.map(async id => {
        try {
            const config = exchangeConfigs[id];
            console.log(`Config for ${id}:`, config);

            // Instantiate exchange
            const exchange = new ccxt[id](config);
            console.log(`${exchange.id} exchange instantiated`);

            // Load markets
            await exchange.loadMarkets();
            console.log(`${exchange.id} markets loaded`);

            // Check balance if API key is set
            if (exchange.apiKey) {
                const balance = await exchange.fetchBalance();
                console.log(`${exchange.id} balance:`, balance);
            }

            exchanges[id] = exchange;
        } catch (err) {
            console.error(`Error initializing ${id}:`, err);
        }
    }));

    // When all exchanges are ready
    console.log('Loaded exchanges:', Object.keys(exchanges).join(', '));
}

test();
