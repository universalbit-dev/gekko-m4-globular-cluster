/*
 * Linear regression curve
 */

const _ = require('underscore');
var Indicator = function(settings) {
  this.input = 'price';
  this.depth = settings;
  this.result = false;
  this.age = 0;
  this.history = [];
  this.x = [];
  
  for (var i = 0; i < this.depth; i++) {
      this.history.push(0.0);
      this.x.push(i);
  }
    _.bindAll(this,_.functions(this));
};

Indicator.prototype.update = function(price) {
  
  // We need sufficient history to get the right result. 
  if(this.result === false && this.age < this.depth) {

    this.history[this.age] = price;
    this.age++;
    this.result = false;
    return;
  }

  this.age++;
  for (var i = 0; i < (this.depth - 1); i++) {
      this.history[i] = this.history[i+1];
  }
  this.history[this.depth-1] = price;
  this.calculate(price);
  return;
}

function linreg(values_x, values_y) {
    var sum_x = 0;
    var sum_y = 0;
    var sum_xy = 0;
    var sum_xx = 0;
    var count = 0;

    var x = 0;
    var y = 0;
    var values_length = values_x.length;

    if (values_length != values_y.length) {
        throw new Error('The parameters values_x and values_y need to have same size!');
    }
    
    if (values_length === 0) {
        return [ [], [] ];
    }

    for (var v = 0; v < values_length; v++) {
        x = values_x[v];
        y = values_y[v];
        sum_x += x;
        sum_y += y;
        sum_xx += x*x;
        sum_xy += x*y;
        count++;
    }

    var m = (count*sum_xy - sum_x*sum_y) / (count*sum_xx - sum_x*sum_x);
    var b = (sum_y/count) - (m*sum_x)/count;

    return [m, b];
}

Indicator.prototype.calculate = function(price) {

    // get the reg
    var reg = linreg(this.x, this.history);

    // y = a * x + b
    this.result = ((this.depth-1) * reg[0]) + reg[1];
}

module.exports = Indicator;
