const EventEmitter=require('node:events');
class TrailingStop extends EventEmitter{constructor({trail,initialPrice,onTrigger}){super();this.trail=trail;this.isLive=true;this.onTrigger=onTrigger;this.previousPrice=initialPrice;this.trailingPoint=initialPrice-this.trail;}
updatePrice(price){if(!this.isLive){return;}
if(price>this.trailingPoint+this.trail){this.trailingPoint=price-this.trail;}
this.previousPrice=price;if(price<=this.trailingPoint){this.trigger();}}
updateTrail(trail){if(!this.isLive){return;}
this.trail=trail;this.trailingPoint=this.previousPrice-this.trail;this.updatePrice(this.previousPrice);}
trigger(){if(!this.isLive){return;}
this.isLive=false;if(this.onTrigger){this.onTrigger(this.previousPrice);}
this.emit('trigger',this.previousPrice);}}
module.exports=TrailingStop;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
