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
    var both = [];
    estravese.traverse(ast, {
        enter: function (node) {
            var items = {
                visitorType: "enter",
                loc: node.loc
            };
            enters.push(items);
            both.push(items);
        },
        leave: function (node) {
            var items = {
                visitorType: "leave",
                loc: node.loc
            };
            leaves.push(items);
            both.push(items);
        }
    });
    return {
        both: both,
        enter: enters,
        leave: leaves
    };
};