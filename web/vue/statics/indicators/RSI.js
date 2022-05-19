exports.Indicator = function () {

var SMMA=require('./SMMA.js');var Indicator=function(settings){this.input='candle';this.lastClose=null;this.weight=settings.interval;this.avgU=new SMMA(this.weight);this.avgD=new SMMA(this.weight);this.u=0;this.d=0;this.rs=0;this.result=0;this.age=0;}
Indicator.prototype.update=function(candle){var currentClose=candle.close;if(this.lastClose===null){this.lastClose=currentClose;this.age++;return;}
if(currentClose>this.lastClose){this.u=currentClose-this.lastClose;this.d=0;}else{this.u=0;this.d=this.lastClose-currentClose;}
this.avgU.update(this.u);this.avgD.update(this.d);this.rs=this.avgU.result/this.avgD.result;this.result=100-(100/(1+this.rs));if(this.avgD.result===0&&this.avgU.result!==0){this.result=100;}else if(this.avgD.result===0){this.result=0;}
this.lastClose=currentClose;this.age++;}
};
require('./RSI.js')() //require itself and run the exports object
