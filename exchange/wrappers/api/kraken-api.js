const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
async function QueryPublicEndpoint(endPointName, inputParameters) {
let jsonData;
const baseDomain = "https://api.kraken.com";
const publicPath = "/0/public/";
const apiEndpointFullURL =
baseDomain + publicPath + endPointName + "?" + inputParameters;

await axios
.get(apiEndpointFullURL)
.then((res) => {
jsonData = res;
})
.catch((err) => {
jsonData = err;
});
return jsonData.data;
}
