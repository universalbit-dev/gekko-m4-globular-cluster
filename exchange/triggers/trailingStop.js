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
