//https://nodejs.org/api/dns.html
const { Resolver } = require('node:dns');
const resolver = new Resolver();
var ping = require('ping');

/* Run Bash Script */
var exec = require('node:child_process').exec
exec('echo $(curl -s https://api64.ipify.org?format=json)',
    function (error, stdout, stderr) {
        console.log('\x1b[33m%s\x1b[0m','Your Ip:' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });
//Your Ip

/* CISCO SYSTEM  OpenDNS */
var OpenDNS= ['208.67.222.123','208.67.220.220','208.67.222.220','208.67.220.222','208.67.222.222','208.67.220.123'];

/*
Level3 DNS 4.2.2.2 4.2.2.1 redirects mistyped URL to Level 3 Web Search
https://serverlogic3.com/what-is-a-level-3-public-dns-server/
*/
var Level3=['4.2.2.2','4.2.2.1'];

/* HE DNS Hurricane Electric */
var HeDNS=['74.82.42.42'];


OpenDNS.forEach(function(host){
    ping.sys.probe(host, function(isAlive){
        var msg = isAlive ? 'OpenDNS:' + host + ' is alive' : ' DNS:' + host + ' is dead';
        console.log(msg);
    });
});

HeDNS.forEach(function(host){
    ping.sys.probe(host, function(isAlive){
        var msg = isAlive ? 'Hurricane Electric:' + host + ' is alive' : ' DNS:' + host + ' is dead';
        console.log(msg);
    });
});

Level3.forEach(function(host){
    ping.sys.probe(host, function(isAlive){
        var msg = isAlive ? 'Level3:' + host + ' is alive' : ' DNS:' + host + ' is dead';
        console.log(msg);
    });
});

//https://nodejs.org/api/dns.html#dnssetserversservers
resolver.setServers(['208.67.220.123','208.67.220.220','208.67.222.220','208.67.220.222','208.67.222.123','4.2.2.1','4.2.2.2','208.67.222.222','74.82.42.42']);
// This request will use the Servers, independent of global settings.
resolver.resolve4('noads.libredns.gr', (err, addresses) => {});
