//https://support.kraken.com/hc/en-us/articles/4413834730260-Example-code-for-NodeJs-REST-and-WebSocket-API

const axios = require("axios");
const crypto = require('crypto');
const WebSocket = require('ws');

const Main = async () => {

let apiPublicKey = ""
let apiPrivateKey = ""

try {

console.log("|=========================================|");
console.log("| KRAKEN.COM NODEJS TEST APP |");
console.log("|=========================================|");
console.log();


/* PUBLIC REST API Examples */
/* Note that setting the if statement of 1 == 0 to 1 == 1 will execute the specific block of code */
if (1 == 0) {
let publicResponse = "";

let publicEndpoint = "SystemStatus";
let publicInputParameters = "";

/* MORE PUBLIC REST EXAMPLES

let publicEndpoint = "AssetPairs";
let publicInputParameters = "pair=ethusd,xbtusd";

let publicEndpoint = "Ticker";
let publicInputParameters = "pair=ethusd";

let publicEndpoint = "Trades";
let publicInputParameters = "pair=ethusd&since=0";
*/

publicResponse = await QueryPublicEndpoint(publicEndpoint, publicInputParameters);
console.log(publicResponse);

}

/* PRIVATE REST API Examples */
/* Note that setting the if statement of 1 == 0 to 1 == 1 will execute the specific block of code */
if (1 == 0) {
let privateResponse = "";

let privateEndpoint = "Balance";
let privateInputParameters = "";

/* MORE PRIVATE REST EXAMPLES 

let privateEndpoint = "AddOrder";
let privateInputParameters = "pair=xbteur&type=buy&ordertype=limit&price=1.00&volume=1";

let privateEndpoint = "AddOrder"
let privateInputParameters = "pair=xdgeur&type=sell&ordertype=limit&volume=3000&price=%2b10.0%" //Positive Percentage Example (%2 represtes +, which is a reseved character in HTTP)

let privateEndpoint = "AddOrder"
let privateInputParameters = "pair=xdgeur&type=sell&ordertype=limit&volume=3000&price=-10.0%" //Negative Percentage Example

let privateEndpoint = "AddOrder"
let privateInputParameters = "pair=xdgeur&type=buy&ordertype=market&volume=3000&userref=789" //Userref Example

let privateEndpoint = "Balance" //{"error":[]} IS SUCCESS, Means EMPTY BALANCE
let privateInputParameters = ""

let privateEndpoint = "QueryOrders"
let privateInputParameters = "txid=OFUSL6-GXIIT-KZ2JDJ"

let privateEndpoint = "AddOrder"
let privateInputParameters = "pair=xdgusd&type=buy&ordertype=market&volume=5000"

let privateEndpoint = "DepositAddresses"
let privateInputParameters = "asset=xbt&method=Bitcoin"

let privateEndpoint = "DepositMethods"
let privateInputParameters = "asset=eth"

let privateEndpoint = "WalletTransfer"
let privateInputParameters = "asset=xbt&to=Futures Wallet&from=Spot Wallet&amount=0.0045"

let privateEndpoint = "TradesHistory"
let privateInputParameters = "start=1577836800&end=1609459200"

let privateEndpoint = "GetWebSocketsToken"
let privateInputParameters = ""
*/

privateResponse = await QueryPrivateEndpoint(privateEndpoint,
privateInputParameters,
apiPublicKey,
apiPrivateKey);
console.log(privateResponse);
}

/* PUBLIC WEBSOCKET Examples */
/* Note that setting the if statement of 1 == 0 to 1 == 1 will execute the specific block of code */
if (1 == 0) {

let publicWebSocketURL = "wss://ws.kraken.com/";
let publicWebSocketSubscriptionMsg = '{ "event":"subscribe", "subscription":{"name":"trade"},"pair":["XBT/USD"] }';

/* MORE PUBLIC WEBSOCKET EXAMPLES 

let publicWebSocketSubscriptionMsg = "{ "event": "subscribe", "subscription": { "interval": 1440, "name": "ohlc"}, "pair": [ "XBT/EUR"]}";
let publicWebSocketSubscriptionMsg = "{ "event": "subscribe", "subscription": { "name": "spread"}, "pair": [ "XBT/EUR","ETH/USD" ]}";

*/

await OpenAndStreamWebSocketSubscription(publicWebSocketURL, publicWebSocketSubscriptionMsg);
}

/* PRIVATE WEBSOCKET Examples */
/* Note that setting the if statement of 1 == 0 to 1 == 1 will execute the specific block of code */
if (1 == 0) {

let privateWebSocketURL = "wss://ws-auth.kraken.com/";
//GET THE WEBSOCKET TOKEN FORM THE JSON RESPONSE
let webSocketToken = await QueryPrivateEndpoint("GetWebSocketsToken", "", apiPublicKey, apiPrivateKey);
webSocketToken = webSocketToken['token'];

/* MORE PRIVATE WEBSOCKET EXAMPLES

let privateWebSocketSubscriptionMsg = `{ "event": "subscribe", "subscription": { "name": "openOrders", "token": "${webSocketToken}"}}`;
let privateWebSocketSubscriptionMsg = `{ "event": "subscribe", "subscription": { "name": "balances", "token": "${webSocketToken}"}}`;
let privateWebSocketSubscriptionMsg = `{"event":"addOrder","reqid":1234,"ordertype":"limit","pair":"XBT/EUR","token":"${webSocketToken}","type":"buy","volume":"1", "price":"1.00"}`;

*/

//REPLACE PLACEHOLDER WITH TOKEN
privateWebSocketSubscriptionMsg = `{ "event": "subscribe", "subscription": { "name": "ownTrades", "token": "${webSocketToken}"}}`;

await OpenAndStreamWebSocketSubscription(privateWebSocketURL, privateWebSocketSubscriptionMsg);
}


console.log("|=======================================|");
console.log("| END OF PROGRAM - HAVE A GOOD DAY :) |");
console.log("|=======================================|");
console.log("\n");

}
catch (e) {
console.log();
console.log("AN EXCEPTION OCCURED :(");
console.log(e);
}


/* Public REST API Endpoints */

async function QueryPublicEndpoint(endPointName, inputParameters) {
let jsonData;
const baseDomain = "https://api.kraken.com";
const publicPath = "/0/public/";
const apiEndpointFullURL = baseDomain + publicPath + endPointName + "?" + inputParameters;

jsonData = await axios.get(apiEndpointFullURL);
return jsonData.data.result;
}

/* Private REST API Endpoints */

async function QueryPrivateEndpoint(endPointName,
inputParameters,
apiPublicKey,
apiPrivateKey) {
const baseDomain = "https://api.kraken.com";
const privatePath = "/0/private/";

const apiEndpointFullURL = baseDomain + privatePath + endPointName;
const nonce = Date.now().toString();
const apiPostBodyData = "nonce=" + nonce + "&" + inputParameters;

const signature = CreateAuthenticationSignature(apiPrivateKey,
privatePath,
endPointName,
nonce,
apiPostBodyData);

const httpOptions =
{
headers: { 'API-Key': apiPublicKey, 'API-Sign': signature }
};

let jsonData = await axios.post(apiEndpointFullURL, apiPostBodyData, httpOptions);

return jsonData.data.result;
}

/* Authentication Algorithm */

function CreateAuthenticationSignature(apiPrivateKey,
apiPath,
endPointName,
nonce,
apiPostBodyData){

const apiPost = nonce + apiPostBodyData;
const secret = Buffer.from(apiPrivateKey, 'base64');
const sha256 = crypto.createHash('sha256');
const hash256 = sha256.update(apiPost).digest('binary');
const hmac512 = crypto.createHmac('sha512', secret);
const signatureString = hmac512.update(apiPath + endPointName + hash256, 'binary').digest('base64');
return signatureString;
}


/* WebSocket API */

async function OpenAndStreamWebSocketSubscription(connectionURL, webSocketSubscription) {
try {
const webSocketClient = new WebSocket(connectionURL);

webSocketClient.on('open', function open() {
webSocketClient.send(webSocketSubscription);
});

webSocketClient.on('message', function incoming(wsMsg) {
var d = new Date();
var msgTime = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
console.log(msgTime + ": " + wsMsg);
});

webSocketClient.on('close', function close() {
console.log("|==============================================|");
console.log("| END OF PROGRAM - HAVE A GOOD DAY :) |");
console.log("|==============================================|");
console.log("\n");
});

}
catch (e) {
console.log();
console.log("AN EXCEPTION OCCURED :(");
console.log(e);
}
}
};

Main();
