/**
 * Created by azu on 2014/03/23.
 * LICENSE : MIT
 */
"use strict";
var esprima = require("esprima");
var estravese = require("estraverse");
module.exports = function (code) {
    var ast = esprima.parse(code, {loc: true});
    var enters = [];
    var leaves = [];
    estravese.traverse(ast, {
        enter: function (node) {
            enters.push(node.loc);
        },
        leave: function (node) {
            leaves.push(node.loc);
        }
    });
    return {
        enter: enters,
        leave: leaves
    };
};