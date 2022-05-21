var semver = require('semver');
var _ = require('lodash');

// validate that talib is installed, if not we'll throw an exception which will
// prevent further loading or out outside this module
try {
    var talib = require('talib');
} catch (e) {
    module.exports = null;
    return;
}

var talibError = 'Gekko was unable to configure talib indicator:\n\t';
var talibGTEv103 = semver.gte(talib.version, '1.0.3');

// Wrapper that executes a talib indicator
var execute = function(callback, params) {
    // talib callback style since talib-v1.0.3
    var talibCallback = function(err, result) {
        if(err) return callback(err);
        callback(null, result.result);
    };

    // talib legacy callback style before talib-v1.0.3
    var talibLegacyCallback = function(result) {
        var error = result.error;
        talibCallback.apply(this, [error, result]);
    };

    return talib.execute(params, talibGTEv103 ? talibCallback : talibLegacyCallback);
}

// Helper that makes sure all required parameters
// for a specific talib indicator are present.
var verifyParams = (methodName, params) => {
    var requiredParams = methods[methodName].requires;

    _.each(requiredParams, paramName => {
        if(!_.has(params, paramName)) {
            throw new Error(talibError + methodName + ' requires ' + paramName + '.');
        }

        var val = params[paramName];

        if(!_.isNumber(val)) {
            throw new Error(talibError + paramName + ' needs to be a number');
        }
    });
}

var methods = {};


//////////////////////////////Pattern Recognition//////////////////////////////
methods.cdl2crows = {
    requires: [],
    create: (params) => {
        verifyParams('cdl2crows', params);
        return (data, callback) => execute(callback, {
            name: "CDL2CROWS",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdl3blackcrows = {
    requires: [],
    create: (params) => {
        verifyParams('cdl3blackcrows', params);
        return (data, callback) => execute(callback, {
            name: "CDL3BLACKCROWS",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdl3inside = {
    requires: [],
    create: (params) => {
        verifyParams('cdl3inside', params);
        return (data, callback) => execute(callback, {
            name: "CDL3INSIDE",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdl3linestrike = {
    requires: [],
    create: (params) => {
        verifyParams('cdl3linestrike', params);
        return (data, callback) => execute(callback, {
            name: "CDL3LINESTRIKE",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdl3outside = {
    requires: [],
    create: (params) => {
        verifyParams('cdl3outside', params);
        return (data, callback) => execute(callback, {
            name: "CDL3OUTSIDE",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdl3starsinsouth = {
    requires: [],
    create: (params) => {
        verifyParams('cdl3starsinsouth', params);
        return (data, callback) => execute(callback, {
            name: "CDL3STARSINSOUTH",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdl3whitesoldiers = {
    requires: [],
    create: (params) => {
        verifyParams('cdl3whitesoldiers', params);
        return (data, callback) => execute(callback, {
            name: "CDL3WHITESOLDIERS",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlabandonedbaby = {
    requires: ['optInPenetration'],
    create: (params) => {
        verifyParams('cdlabandonedbaby', params);
        return (data, callback) => execute(callback, {
            name: "CDLABANDONEDBABY",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            optInPenetration: params.optInPenetration
        });
    }
}
methods.cdladvanceblock = {
    requires: [],
    create: (params) => {
        verifyParams('cdladvanceblock', params);
        return (data, callback) => execute(callback, {
            name: "CDLADVANCEBLOCK",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlbelthold = {
    requires: [],
    create: (params) => {
        verifyParams('cdlbelthold', params);
        return (data, callback) => execute(callback, {
            name: "CDLBELTHOLD",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlbreakaway = {
    requires: [],
    create: (params) => {
        verifyParams('cdlbreakaway', params);
        return (data, callback) => execute(callback, {
            name: "CDLBREAKAWAY",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlclosingmarubozu = {
    requires: [],
    create: (params) => {
        verifyParams('cdlclosingmarubozu', params);
        return (data, callback) => execute(callback, {
            name: "CDLCLOSINGMARUBOZU",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlconcealbabyswall = {
    requires: [],
    create: (params) => {
        verifyParams('cdlconcealbabyswall', params);
        return (data, callback) => execute(callback, {
            name: "CDLCONCEALBABYSWALL",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlcounterattack = {
    requires: [],
    create: (params) => {
        verifyParams('cdlcounterattack', params);
        return (data, callback) => execute(callback, {
            name: "CDLCOUNTERATTACK",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdldarkcloudcover = {
    requires: ['optInPenetration'],
    create: (params) => {
        verifyParams('cdldarkcloudcover', params);
        return (data, callback) => execute(callback, {
            name: "CDLDARKCLOUDCOVER",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            optInPenetration: params.optInPenetration
        });
    }
}
methods.cdldoji = {
    requires: [],
    create: (params) => {
        verifyParams('cdldoji', params);
        return (data, callback) => execute(callback, {
            name: "CDLDOJI",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdldojistar = {
    requires: [],
    create: (params) => {
        verifyParams('cdldojistar', params);
        return (data, callback) => execute(callback, {
            name: "CDLDOJISTAR",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdldragonflydoji = {
    requires: [],
    create: (params) => {
        verifyParams('cdldragonflydoji', params);
        return (data, callback) => execute(callback, {
            name: "CDLDRAGONFLYDOJI",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlengulfing = {
    requires: [],
    create: (params) => {
        verifyParams('cdlengulfing', params);
        return (data, callback) => execute(callback, {
            name: "CDLENGULFING",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdleveningdojistar = {
    requires: ['optInPenetration'],
    create: (params) => {
        verifyParams('cdleveningdojistar', params);
        return (data, callback) => execute(callback, {
            name: "CDLEVENINGDOJISTAR",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            optInPenetration: params.optInPenetration
        });
    }
}
methods.cdleveningstar = {
    requires: ['optInPenetration'],
    create: (params) => {
        verifyParams('cdleveningstar', params);
        return (data, callback) => execute(callback, {
            name: "CDLEVENINGSTAR",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            optInPenetration: params.optInPenetration
        });
    }
}
methods.cdlgapsidesidewhite = {
    requires: [],
    create: (params) => {
        verifyParams('cdlgapsidesidewhite', params);
        return (data, callback) => execute(callback, {
            name: "CDLGAPSIDESIDEWHITE",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlgravestonedoji = {
    requires: [],
    create: (params) => {
        verifyParams('cdlgravestonedoji', params);
        return (data, callback) => execute(callback, {
            name: "CDLGRAVESTONEDOJI",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlhammer = {
    requires: [],
    create: (params) => {
        verifyParams('cdlhammer', params);
        return (data, callback) => execute(callback, {
            name: "CDLHAMMER",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlhangingman = {
    requires: [],
    create: (params) => {
        verifyParams('cdlhangingman', params);
        return (data, callback) => execute(callback, {
            name: "CDLHANGINGMAN",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlharami = {
    requires: [],
    create: (params) => {
        verifyParams('cdlharami', params);
        return (data, callback) => execute(callback, {
            name: "CDLHARAMI",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlharamicross = {
    requires: [],
    create: (params) => {
        verifyParams('cdlharamicross', params);
        return (data, callback) => execute(callback, {
            name: "CDLHARAMICROSS",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlhighwave = {
    requires: [],
    create: (params) => {
        verifyParams('cdlhighwave', params);
        return (data, callback) => execute(callback, {
            name: "CDLHIGHWAVE",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlhikkake = {
    requires: [],
    create: (params) => {
        verifyParams('cdlhikkake', params);
        return (data, callback) => execute(callback, {
            name: "CDLHIKKAKE",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlhikkakemod = {
    requires: [],
    create: (params) => {
        verifyParams('cdlhikkakemod', params);
        return (data, callback) => execute(callback, {
            name: "CDLHIKKAKEMOD",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlhomingpigeon = {
    requires: [],
    create: (params) => {
        verifyParams('cdlhomingpigeon', params);
        return (data, callback) => execute(callback, {
            name: "CDLHOMINGPIGEON",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlidentical3crows = {
    requires: [],
    create: (params) => {
        verifyParams('cdlidentical3crows', params);
        return (data, callback) => execute(callback, {
            name: "CDLIDENTICAL3CROWS",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlinneck = {
    requires: [],
    create: (params) => {
        verifyParams('cdlinneck', params);
        return (data, callback) => execute(callback, {
            name: "CDLINNECK",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlinvertedhammer = {
    requires: [],
    create: (params) => {
        verifyParams('cdlinvertedhammer', params);
        return (data, callback) => execute(callback, {
            name: "CDLINVERTEDHAMMER",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlkicking = {
    requires: [],
    create: (params) => {
        verifyParams('cdlkicking', params);
        return (data, callback) => execute(callback, {
            name: "CDLKICKING",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlkickingbylength = {
    requires: [],
    create: (params) => {
        verifyParams('cdlkickingbylength', params);
        return (data, callback) => execute(callback, {
            name: "CDLKICKINGBYLENGTH",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlladderbottom = {
    requires: [],
    create: (params) => {
        verifyParams('cdlladderbottom', params);
        return (data, callback) => execute(callback, {
            name: "CDLLADDERBOTTOM",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdllongleggeddoji = {
    requires: [],
    create: (params) => {
        verifyParams('cdllongleggeddoji', params);
        return (data, callback) => execute(callback, {
            name: "CDLLONGLEGGEDDOJI",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdllongline = {
    requires: [],
    create: (params) => {
        verifyParams('cdllongline', params);
        return (data, callback) => execute(callback, {
            name: "CDLLONGLINE",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlmarubozu = {
    requires: [],
    create: (params) => {
        verifyParams('cdlmarubozu', params);
        return (data, callback) => execute(callback, {
            name: "CDLMARUBOZU",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlmatchinglow = {
    requires: [],
    create: (params) => {
        verifyParams('cdlmatchinglow', params);
        return (data, callback) => execute(callback, {
            name: "CDLMATCHINGLOW",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlmathold = {
    requires: ['optInPenetration'],
    create: (params) => {
        verifyParams('cdlmathold', params);
        return (data, callback) => execute(callback, {
            name: "CDLMATHOLD",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            optInPenetration: params.optInPenetration
        });
    }
}
methods.cdlmorningdojistar = {
    requires: ['optInPenetration'],
    create: (params) => {
        verifyParams('cdlmorningdojistar', params);
        return (data, callback) => execute(callback, {
            name: "CDLMORNINGDOJISTAR",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            optInPenetration: params.optInPenetration
        });
    }
}
methods.cdlmorningstar = {
    requires: ['optInPenetration'],
    create: (params) => {
        verifyParams('cdlmorningstar', params);
        return (data, callback) => execute(callback, {
            name: "CDLMORNINGSTAR",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            optInPenetration: params.optInPenetration
        });
    }
}
methods.cdlonneck = {
    requires: [],
    create: (params) => {
        verifyParams('cdlonneck', params);
        return (data, callback) => execute(callback, {
            name: "CDLONNECK",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlpiercing = {
    requires: [],
    create: (params) => {
        verifyParams('cdlpiercing', params);
        return (data, callback) => execute(callback, {
            name: "CDLPIERCING",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlrickshawman = {
    requires: [],
    create: (params) => {
        verifyParams('cdlrickshawman', params);
        return (data, callback) => execute(callback, {
            name: "CDLRICKSHAWMAN",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlrisefall3methods = {
    requires: [],
    create: (params) => {
        verifyParams('cdlrisefall3methods', params);
        return (data, callback) => execute(callback, {
            name: "CDLRISEFALL3METHODS",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlseparatinglines = {
    requires: [],
    create: (params) => {
        verifyParams('cdlseparatinglines', params);
        return (data, callback) => execute(callback, {
            name: "CDLSEPARATINGLINES",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlshootingstar = {
    requires: [],
    create: (params) => {
        verifyParams('cdlshootingstar', params);
        return (data, callback) => execute(callback, {
            name: "CDLSHOOTINGSTAR",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlshortline = {
    requires: [],
    create: (params) => {
        verifyParams('cdlshortline', params);
        return (data, callback) => execute(callback, {
            name: "CDLSHORTLINE",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlspinningtop = {
    requires: [],
    create: (params) => {
        verifyParams('cdlspinningtop', params);
        return (data, callback) => execute(callback, {
            name: "CDLSPINNINGTOP",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlstalledpattern = {
    requires: [],
    create: (params) => {
        verifyParams('cdlstalledpattern', params);
        return (data, callback) => execute(callback, {
            name: "CDLSTALLEDPATTERN",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlsticksandwich = {
    requires: [],
    create: (params) => {
        verifyParams('cdlsticksandwich', params);
        return (data, callback) => execute(callback, {
            name: "CDLSTICKSANDWICH",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdltakuri = {
    requires: [],
    create: (params) => {
        verifyParams('cdltakuri', params);
        return (data, callback) => execute(callback, {
            name: "CDLTAKURI",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdltasukigap = {
    requires: [],
    create: (params) => {
        verifyParams('cdltasukigap', params);
        return (data, callback) => execute(callback, {
            name: "CDLTASUKIGAP",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlthrusting = {
    requires: [],
    create: (params) => {
        verifyParams('cdlthrusting', params);
        return (data, callback) => execute(callback, {
            name: "CDLTHRUSTING",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdltristar = {
    requires: [],
    create: (params) => {
        verifyParams('cdltristar', params);
        return (data, callback) => execute(callback, {
            name: "CDLTRISTAR",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlunique3river = {
    requires: [],
    create: (params) => {
        verifyParams('cdlunique3river', params);
        return (data, callback) => execute(callback, {
            name: "CDLUNIQUE3RIVER",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlupsidegap2crows = {
    requires: [],
    create: (params) => {
        verifyParams('cdlupsidegap2crows', params);
        return (data, callback) => execute(callback, {
            name: "CDLUPSIDEGAP2CROWS",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}
methods.cdlxsidegap3methods = {
    requires: [],
    create: (params) => {
        verifyParams('cdlxsidegap3methods', params);
        return (data, callback) => execute(callback, {
            name: "CDLXSIDEGAP3METHODS",
            startIdx: 0,
            endIdx: data.close.length - 1,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close
        });
    }
}

//////////////////////////////Pattern Recognition//////////////////////////////

methods.accbands = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('accbands', params);

        return (data, callback) => execute(callback, {
            name: "ACCBANDS",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.ad = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('accbands', params);

        return (data, callback) => execute(callback, {
            name: "AD",
            high: data.high,
            low: data.low,
            close: data.close,
            volume: data.volume,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.adosc = {
    requires: ['optInFastPeriod', 'optInSlowPeriod'],
    create: (params) => {
        verifyParams('adosc', params);

        return (data, callback) => execute(callback, {
            name: "ADOSC",
            high: data.high,
            low: data.low,
            close: data.close,
            volume: data.volume,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInFastPeriod: params.optInFastPeriod,
            optInSlowPeriod: params.optInSlowPeriod
        });
    }
}

methods.adx = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('adx', params);

        return (data, callback) => execute(callback, {
            name: "ADX",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.adxr = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('adxr', params);

        return (data, callback) => execute(callback, {
            name: "ADXR",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.apo = {
    requires: ['optInFastPeriod', 'optInSlowPeriod', 'optInMAType'],
    create: (params) => {
        verifyParams('apo', params);

        return (data, callback) => execute(callback, {
            name: "APO",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.length - 1,
            optInFastPeriod: params.optInFastPeriod,
            optInSlowPeriod: params.optInSlowPeriod,
            optInMAType: params.optInMAType
        });
    }
}

methods.aroon = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('aroon', params);

        return (data, callback) => execute(callback, {
            name: "AROON",
            high: data.high,
            low: data.low,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.aroonosc = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('aroonosc', params);

        return (data, callback) => execute(callback, {
            name: "AROONOSC",
            high: data.high,
            low: data.low,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.atr = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('atr', params);

        return (data, callback) => execute(callback, {
            name: "ATR",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.avgprice = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('avgprice', params);

        return (data, callback) => execute(callback, {
            name: "AVGPRICE",
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.open.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.bbands = {
    requires: ['optInTimePeriod', 'optInNbDevUp', 'optInNbDevDn', 'optInMAType'],
    create: (params) => {
        verifyParams('bbands', params);

        return (data, callback) => execute(callback, {
            name: "BBANDS",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod,
            optInNbDevUp: params.optInNbDevUp,
            optInNbDevDn: params.optInNbDevDn,
            optInMAType: params.optInMAType
        });
    }
}

///////////////////////////////////////////////////////////////


// this.beta = function(data_0, data_1, period) {
//     return talibWrapper({
//         name: "BETA",
//         inReal0: data_0,
//         inReal1: data_1,
//         startIdx: 0,
//         endIdx: data_0.length - 1,
//         optInTimePeriod: period
//     });
// };

methods.bop = {
    requires: [],
    create: (params) => {
        verifyParams('bop', params);

        return (data, callback) => execute(callback, {
            name: "BOP",
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1
        });
    }
}

methods.cci = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('cci', params);

        return (data, callback) => execute(callback, {
            name: "CCI",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.cmo = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('cmo', params);

        return (data, callback) => execute(callback, {
            name: "CMO",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

// this.correl = function(data_0, data_1, period) {
//     return talibWrapper({
//         name: "CORREL",
//         inReal0: data_0,
//         inReal1: data_1,
//         startIdx: 0,
//         endIdx: data_0.length - 1,
//         optInTimePeriod: period
//     });
// };

methods.dema = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('dema', params);

        return (data, callback) => execute(callback, {
            name: "DEMA",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.dx = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('dx', params);

        return (data, callback) => execute(callback, {
            name: "DX",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.ema = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('ema', params);

        return (data, callback) => execute(callback, {
            name: "EMA",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.ht_dcperiod = {
    requires: [],
    create: (params) => {
        verifyParams('ht_dcperiod', params);

        return (data, callback) => execute(callback, {
            name: "HT_DCPERIOD",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1
        });
    }
}

methods.ht_dcphase = {
    requires: [],
    create: (params) => {
        verifyParams('ht_dcphase', params);

        return (data, callback) => execute(callback, {
            name: "HT_DCPHASE",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1
        });
    }
}

methods.ht_phasor = {
    requires: [],
    create: (params) => {
        verifyParams('ht_phasor', params);

        return (data, callback) => execute(callback, {
            name: "HT_PHASOR",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1
        });
    }
}

methods.ht_sine = {
    requires: [],
    create: (params) => {
        verifyParams('ht_sine', params);

        return (data, callback) => execute(callback, {
            name: "HT_SINE",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1
        });
    }
}


methods.ht_trendline = {
    requires: [],
    create: (params) => {
        verifyParams('ht_trendline', params);

        return (data, callback) => execute(callback, {
            name: "HT_TRENDLINE",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1
        });
    }
}

methods.ht_trendmode = {
    requires: [],
    create: (params) => {
        verifyParams('ht_trendmode', params);

        return (data, callback) => execute(callback, {
            name: "HT_TRENDMODE",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1
        });
    }
}

methods.imi = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('imi', params);

        return (data, callback) => execute(callback, {
            name: "IMI",
            open: data.open,
            close: data.close,
            startIdx: 0,
            endIdx: data.open.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.kama = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('kama', params);

        return (data, callback) => execute(callback, {
            name: "KAMA",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.linearreg = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('linearreg', params);

        return (data, callback) => execute(callback, {
            name: "LINEARREG",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.linearreg_angle = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('linearreg_angle', params);

        return (data, callback) => execute(callback, {
            name: "LINEARREG_ANGLE",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.linearreg_intercept = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('linearreg_intercept', params);

        return (data, callback) => execute(callback, {
            name: "LINEARREG_INTERCEPT",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.linearreg_slope = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('linearreg_slope', params);

        return (data, callback) => execute(callback, {
            name: "LINEARREG_SLOPE",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.ma = {
    requires: ['optInTimePeriod', 'optInMAType'],
    create: (params) => {
        verifyParams('ma', params);

        return (data, callback) => execute(callback, {
            name: "MA",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod,
            optInMAType: params.optInMAType
        });
    }
}

methods.macd = {
    requires: ['optInFastPeriod', 'optInSlowPeriod', 'optInSignalPeriod'],
    create: (params) => {
        verifyParams('macd', params);

        return (data, callback) => execute(callback, {
            name: "MACD",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInFastPeriod: params.optInFastPeriod,
            optInSlowPeriod: params.optInSlowPeriod,
            optInSignalPeriod: params.optInSignalPeriod
        });
    }
}

methods.macdext = {
    requires: [
        'optInFastPeriod',
        'optInFastMAType',
        'optInSlowPeriod',
        'optInSlowMAType',
        'optInSignalPeriod',
        'optInSignalMAType'
    ],
    create: (params) => {
        verifyParams('macdext', params);

        return (data, callback) => execute(callback, {
            name: "MACDEXT",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInFastPeriod: params.optInFastPeriod,
            optInFastMAType: params.optInFastMAType,
            optInSlowPeriod: params.optInSlowPeriod,
            optInSlowMAType: params.optInSlowMAType,
            optInSignalPeriod: params.optInSignalPeriod,
            optInSignalMAType: params.optInSignalMAType
        });
    }
}

methods.macdfix = {
    requires: ['optInSignalPeriod'],
    create: (params) => {
        verifyParams('macdfix', params);

        return (data, callback) => execute(callback, {
            name: "MACDFIX",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInSignalPeriod: params.optInSignalPeriod
        });
    }
}

methods.mama = {
    requires: ['optInFastLimit', 'optInSlowLimit'],
    create: (params) => {
        verifyParams('mama', params);

        return (data, callback) => execute(callback, {
            name: "MAMA",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInFastLimit: params.optInFastLimit,
            optInSlowLimit: params.optInSlowLimit
        });
    }
}

methods.mavp = {
    requires: ['inPeriods', 'optInMinPeriod', 'optInMaxPeriod', 'optInMAType'],
    create: (params) => {
        verifyParams('mavp', params);

        return (data, callback) => execute(callback, {
            name: "MAVP",
            inReal: data.close,
            inPeriods: params.inPeriods,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInMinPeriod: params.optInMinPeriod,
            optInMaxPeriod: params.optInMaxPeriod,
            optInMAType: params.optInMAType
        });
    }
}


methods.max = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('max', params);

        return (data, callback) => execute(callback, {
            name: "MAX",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}


methods.maxindex = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('maxindex', params);

        return (data, callback) => execute(callback, {
            name: "MAXINDEX",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.medprice = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('medprice', params);

        return (data, callback) => execute(callback, {
            name: "MEDPRICE",
            high: data.high,
            low: data.low,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.mfi = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('mfi', params);

        return (data, callback) => execute(callback, {
            name: "MFI",
            high: data.high,
            low: data.low,
            close: data.close,
            volume: data.volume,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.midpoint = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('midpoint', params);

        return (data, callback) => execute(callback, {
            name: "MIDPOINT",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.midprice = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('midprice', params);

        return (data, callback) => execute(callback, {
            name: "MIDPRICE",
            high: data.high,
            low: data.low,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.min = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('min', params);

        return (data, callback) => execute(callback, {
            name: "MIN",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.minindex = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('minindex', params);

        return (data, callback) => execute(callback, {
            name: "MININDEX",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.minmax = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('minmax', params);

        return (data, callback) => execute(callback, {
            name: "MINMAX",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.minmaxindex = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('minmaxindex', params);

        return (data, callback) => execute(callback, {
            name: "MINMAXINDEX",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.minus_di = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('minus_di', params);

        return (data, callback) => execute(callback, {
            name: "MINUS_DI",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.minus_dm = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('minus_dm', params);

        return (data, callback) => execute(callback, {
            name: "MINUS_DM",
            high: data.high,
            low: data.low,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.mom = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('mom', params);

        return (data, callback) => execute(callback, {
            name: "MOM",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.natr = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('natr', params);

        return (data, callback) => execute(callback, {
            name: "NATR",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.obv = {
    requires: [],
    create: (params) => {
        verifyParams('obv', params);

        return (data, callback) => execute(callback, {
            name: "OBV",
            inReal: data.close,
            volume: data.volume,
            startIdx: 0,
            endIdx: data.close.length - 1
        });
    }
}

methods.plus_di = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('plus_di', params);

        return (data, callback) => execute(callback, {
            name: "PLUS_DI",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.plus_dm = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('plus_dm', params);

        return (data, callback) => execute(callback, {
            name: "PLUS_DM",
            high: data.high,
            low: data.low,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.ppo = {
    requires: ['optInFastPeriod', 'optInSlowPeriod', 'optInMAType'],
    create: (params) => {
        verifyParams('ppo', params);

        return (data, callback) => execute(callback, {
            name: "PPO",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInFastPeriod: params.optInFastPeriod,
            optInSlowPeriod: params.optInSlowPeriod,
            optInMAType: params.optInMAType
        });
    }
}

methods.roc = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('roc', params);

        return (data, callback) => execute(callback, {
            name: "ROC",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.rocp = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('rocp', params);

        return (data, callback) => execute(callback, {
            name: "ROCP",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.rocr = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('rocr', params);

        return (data, callback) => execute(callback, {
            name: "ROCR",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.rocr100 = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('rocr100', params);

        return (data, callback) => execute(callback, {
            name: "ROCR100",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.rsi = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('rsi', params);

        return (data, callback) => execute(callback, {
            name: "RSI",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.sar = {
    requires: ['optInAcceleration', 'optInMaximum'],
    create: (params) => {
        verifyParams('sar', params);

        return (data, callback) => execute(callback, {
            name: "SAR",
            high: data.high,
            low: data.low,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInAcceleration: params.optInAcceleration,
            optInMaximum: params.optInMaximum
        });
    }
}

methods.sarext = {
    requires: [
        'optInStartValue',
        'optInOffsetOnReverse',
        'optInAccelerationInitLong',
        'optInAccelerationLong',
        'optInAccelerationMaxLong',
        'optInAccelerationInitShort',
        'optInAccelerationShort',
        'optInAccelerationMaxShort'

    ],
    create: (params) => {
        verifyParams('sarext', params);

        return (data, callback) => execute(callback, {
            name: "SAREXT",
            high: data.high,
            low: data.low,
            startIdx: 0,
            endIdx: data.high.length - 1,

            optInStartValue: params.optInStartValue,
            optInOffsetOnReverse: params.optInOffsetOnReverse,
            optInAccelerationInitLong: params.optInAccelerationInitLong,
            optInAccelerationLong: params.optInAccelerationLong,
            optInAccelerationMaxLong: params.optInAccelerationMaxLong,
            optInAccelerationInitShort: params.optInAccelerationInitShort,
            optInAccelerationShort: params.optInAccelerationShort,
            optInAccelerationMaxShort: params.optInAccelerationMaxShort
        });
    }
}

methods.sma = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('sma', params);

        return (data, callback) => execute(callback, {
            name: "SMA",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.stddev = {
    requires: ['optInTimePeriod', 'optInNbDev'],
    create: (params) => {
        verifyParams('stddev', params);

        return (data, callback) => execute(callback, {
            name: "STDDEV",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod,
            optInNbDev: params.optInNbDev
        });
    }
}

methods.stoch = {
    requires: [
        'optInFastK_Period',
        'optInSlowK_Period',
        'optInSlowK_MAType',
        'optInSlowD_Period',
        'optInSlowD_MAType'
    ],
    create: (params) => {
        verifyParams('stoch', params);

        return (data, callback) => execute(callback, {
            name: "STOCH",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,

            optInFastK_Period: params.optInFastK_Period,
            optInSlowK_Period: params.optInSlowK_Period,
            optInSlowK_MAType: params.optInSlowK_MAType,
            optInSlowD_Period: params.optInSlowD_Period,
            optInSlowD_MAType: params.optInSlowD_MAType
        });
    }
}


methods.stochf = {
    requires: [
        'optInFastK_Period',
        'optInFastD_Period',
        'optInFastD_MAType'
    ],
    create: (params) => {
        verifyParams('stochf', params);

        return (data, callback) => execute(callback, {
            name: "STOCHF",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,

            optInFastK_Period: params.optInFastK_Period,
            optInFastD_Period: params.optInFastD_Period,
            optInFastD_MAType: params.optInFastD_MAType
        });
    }
}

methods.stochrsi = {
    requires: [
        'optInTimePeriod',
        'optInFastK_Period',
        'optInFastD_Period',
        'optInFastD_MAType'
    ],
    create: (params) => {
        verifyParams('stochrsi', params);

        return (data, callback) => execute(callback, {
            name: "STOCHRSI",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,

            optInTimePeriod: params.optInTimePeriod,
            optInFastK_Period: params.optInFastK_Period,
            optInFastD_Period: params.optInFastD_Period,
            optInFastD_MAType: params.optInFastD_MAType
        });
    }
}

methods.t3 = {
    requires: [
        'optInTimePeriod',
        'optInFastK_Period',
        'optInFastD_Period',
        'optInFastD_MAType'
    ],
    create: (params) => {
        verifyParams('t3', params);

        return (data, callback) => execute(callback, {
            name: "T3",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod,
            optInVFactor: params.optInVFactor
        });
    }
}

methods.tema = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('tema', params);

        return (data, callback) => execute(callback, {
            name: "TEMA",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.trange = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('trange', params);

        return (data, callback) => execute(callback, {
            name: "TRANGE",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.trima = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('trima', params);

        return (data, callback) => execute(callback, {
            name: "TRIMA",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.trix = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('trix', params);

        return (data, callback) => execute(callback, {
            name: "TRIX",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.tsf = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('tsf', params);

        return (data, callback) => execute(callback, {
            name: "TSF",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.typprice = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('typprice', params);

        return (data, callback) => execute(callback, {
            name: "TYPPRICE",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.ultosc = {
    requires: ['optInTimePeriod1', 'optInTimePeriod2', 'optInTimePeriod3'],
    create: (params) => {
        verifyParams('ultosc', params);

        return (data, callback) => execute(callback, {
            name: "ULTOSC",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod1: params.optInTimePeriod1,
            optInTimePeriod2: params.optInTimePeriod2,
            optInTimePeriod3: params.optInTimePeriod3
        });
    }
}

methods.variance = {
    requires: ['optInTimePeriod', 'optInNbDev'],
    create: (params) => {
        verifyParams('variance', params);

        return (data, callback) => execute(callback, {
            name: "VAR",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod,
            optInNbDev: params.optInTimePeriod
        });
    }
}

methods.wclprice = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('wclprice', params);

        return (data, callback) => execute(callback, {
            name: "WCLPRICE",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.willr = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('willr', params);

        return (data, callback) => execute(callback, {
            name: "WILLR",
            high: data.high,
            low: data.low,
            close: data.close,
            startIdx: 0,
            endIdx: data.high.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

methods.wma = {
    requires: ['optInTimePeriod'],
    create: (params) => {
        verifyParams('wma', params);

        return (data, callback) => execute(callback, {
            name: "WMA",
            inReal: data.close,
            startIdx: 0,
            endIdx: data.close.length - 1,
            optInTimePeriod: params.optInTimePeriod
        });
    }
}

module.exports = methods;
/*
         GNU LESSER GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007

 Copyright (C) 2007 Free Software Foundation, Inc. <http://fsf.org/>
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.


  This version of the GNU Lesser General Public License incorporates
the terms and conditions of version 3 of the GNU General Public
License, supplemented by the additional permissions listed below.

  0. Additional Definitions.

  As used herein, "this License" refers to version 3 of the GNU Lesser
General Public License, and the "GNU GPL" refers to version 3 of the GNU
General Public License.

  "The Library" refers to a covered work governed by this License,
other than an Application or a Combined Work as defined below.

  An "Application" is any work that makes use of an interface provided
by the Library, but which is not otherwise based on the Library.
Defining a subclass of a class defined by the Library is deemed a mode
of using an interface provided by the Library.

  A "Combined Work" is a work produced by combining or linking an
Application with the Library.  The particular version of the Library
with which the Combined Work was made is also called the "Linked
Version".

  The "Minimal Corresponding Source" for a Combined Work means the
Corresponding Source for the Combined Work, excluding any source code
for portions of the Combined Work that, considered in isolation, are
based on the Application, and not on the Linked Version.

  The "Corresponding Application Code" for a Combined Work means the
object code and/or source code for the Application, including any data
and utility programs needed for reproducing the Combined Work from the
Application, but excluding the System Libraries of the Combined Work.

  1. Exception to Section 3 of the GNU GPL.

  You may convey a covered work under sections 3 and 4 of this License
without being bound by section 3 of the GNU GPL.

  2. Conveying Modified Versions.

  If you modify a copy of the Library, and, in your modifications, a
facility refers to a function or data to be supplied by an Application
that uses the facility (other than as an argument passed when the
facility is invoked), then you may convey a copy of the modified
version:

   a) under this License, provided that you make a good faith effort to
   ensure that, in the event an Application does not supply the
   function or data, the facility still operates, and performs
   whatever part of its purpose remains meaningful, or

   b) under the GNU GPL, with none of the additional permissions of
   this License applicable to that copy.

  3. Object Code Incorporating Material from Library Header Files.

  The object code form of an Application may incorporate material from
a header file that is part of the Library.  You may convey such object
code under terms of your choice, provided that, if the incorporated
material is not limited to numerical parameters, data structure
layouts and accessors, or small macros, inline functions and templates
(ten or fewer lines in length), you do both of the following:

   a) Give prominent notice with each copy of the object code that the
   Library is used in it and that the Library and its use are
   covered by this License.

   b) Accompany the object code with a copy of the GNU GPL and this license
   document.

  4. Combined Works.

  You may convey a Combined Work under terms of your choice that,
taken together, effectively do not restrict modification of the
portions of the Library contained in the Combined Work and reverse
engineering for debugging such modifications, if you also do each of
the following:

   a) Give prominent notice with each copy of the Combined Work that
   the Library is used in it and that the Library and its use are
   covered by this License.

   b) Accompany the Combined Work with a copy of the GNU GPL and this license
   document.

   c) For a Combined Work that displays copyright notices during
   execution, include the copyright notice for the Library among
   these notices, as well as a reference directing the user to the
   copies of the GNU GPL and this license document.

   d) Do one of the following:

       0) Convey the Minimal Corresponding Source under the terms of this
       License, and the Corresponding Application Code in a form
       suitable for, and under terms that permit, the user to
       recombine or relink the Application with a modified version of
       the Linked Version to produce a modified Combined Work, in the
       manner specified by section 6 of the GNU GPL for conveying
       Corresponding Source.

       1) Use a suitable shared library mechanism for linking with the
       Library.  A suitable mechanism is one that (a) uses at run time
       a copy of the Library already present on the user's computer
       system, and (b) will operate properly with a modified version
       of the Library that is interface-compatible with the Linked
       Version.

   e) Provide Installation Information, but only if you would otherwise
   be required to provide such information under section 6 of the
   GNU GPL, and only to the extent that such information is
   necessary to install and execute a modified version of the
   Combined Work produced by recombining or relinking the
   Application with a modified version of the Linked Version. (If
   you use option 4d0, the Installation Information must accompany
   the Minimal Corresponding Source and Corresponding Application
   Code. If you use option 4d1, you must provide the Installation
   Information in the manner specified by section 6 of the GNU GPL
   for conveying Corresponding Source.)

  5. Combined Libraries.

  You may place library facilities that are a work based on the
Library side by side in a single library together with other library
facilities that are not Applications and are not covered by this
License, and convey such a combined library under terms of your
choice, if you do both of the following:

   a) Accompany the combined library with a copy of the same work based
   on the Library, uncombined with any other library facilities,
   conveyed under the terms of this License.

   b) Give prominent notice with the combined library that part of it
   is a work based on the Library, and explaining where to find the
   accompanying uncombined form of the same work.

  6. Revised Versions of the GNU Lesser General Public License.

  The Free Software Foundation may publish revised and/or new versions
of the GNU Lesser General Public License from time to time. Such new
versions will be similar in spirit to the present version, but may
differ in detail to address new problems or concerns.

  Each version is given a distinguishing version number. If the
Library as you received it specifies that a certain numbered version
of the GNU Lesser General Public License "or any later version"
applies to it, you have the option of following the terms and
conditions either of that published version or of any later version
published by the Free Software Foundation. If the Library as you
received it does not specify a version number of the GNU Lesser
General Public License, you may choose any version of the GNU Lesser
General Public License ever published by the Free Software Foundation.

  If the Library as you received it specifies that a proxy can decide
whether future versions of the GNU Lesser General Public License shall
apply, that proxy's public statement of acceptance of any version is
permanent authorization for you to choose that version for the
Library.
*/
