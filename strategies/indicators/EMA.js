const _ = require('underscore');
var Indicator = function(weight) {
  this.input = 'price';
  this.weight = weight;
  this.result = false;
  this.age = 0;
    _.bindAll(this,_.functions(this));
};

Indicator.prototype.update = function(price) {

  if(this.result === false)
    this.result = price;

  this.age++;
  this.calculate(price);

  return this.result;
}

Indicator.prototype.calculate = function(price) {

  var k = 2 / (this.weight + 1);
  var y = this.result;
  this.result = price * k + y * (1 - k);
}

module.exports = Indicator;

