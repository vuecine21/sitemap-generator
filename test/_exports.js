var vm = require("vm");
var fs = require("fs");

/**
 * This is a work around module for requiring vanilla js
 * ref {@link https://stackoverflow.com/questions/5171213/load-vanilla-javascript-libraries-into-node-js}
 * @param {*} path 
 * @param {*} context 
 */
module.exports = function(path, context) {
  context = context || {};
  var data = fs.readFileSync(path);
  vm.runInNewContext(data, context, path);
  return context;
}