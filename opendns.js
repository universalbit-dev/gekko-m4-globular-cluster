//https://nodejs.org/api/dns.html
const { Resolver } = require('node:dns');
const resolver = new Resolver();
var ping = require('ping');

/*Run Bash Script*/
var exec = require('child_process').exec
exec('echo $(curl -s https://api.ipify.org)',
    function (error, stdout, stderr) {
        console.log('\x1b[33m%s\x1b[0m','stdout:' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });

/* CISCO SYSTEM  OpenDNS */
var CiscoOpenDNS= ['208.67.222.123','208.67.220.220','208.67.222.220','208.67.220.222','208.67.222.222','4.2.2.1','4.2.2.2','208.67.220.123'];


/*
Level3 DNS 4.2.2.2 4.2.2.1 redirects mistyped URL to Level 3 Web Search
https://serverlogic3.com/what-is-a-level-3-public-dns-server/
*/

var hosts = ['208.67.222.222','208.67.220.220','208.67.222.220','208.67.220.222','208.67.222.123','4.2.2.1','4.2.2.2','208.67.220.123'];

hosts.forEach(function(host){
    ping.sys.probe(host, function(isAlive){
        var msg = isAlive ? 'host ' + host + ' is alive' : ' host ' + host + ' is dead';
        console.log(msg);
    });
});

//https://nodejs.org/api/dns.html#dnssetserversservers
resolver.setServers(['208.67.220.123','208.67.220.220','208.67.222.220','208.67.220.222','208.67.222.123','4.2.2.1','4.2.2.2','208.67.222.222']);



