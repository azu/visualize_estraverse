/**
 * Created by azu on 2014/03/23.
 * LICENSE : MIT
 */
"use strict";
var textArea = document.getElementById("code-area");
var editor = CodeMirror.fromTextArea(textArea, {
    mode: "javascript",
    value: "var AST = 'is tree'",
    lineNumbers: true
});

var traverseSteper = require("./traverseSteper");
function highlight(locs) {
    if (locs.length == 0) {
        return;
    }
    var loc = locs.pop();
    selectLoc(loc, function () {
        setTimeout(function () {
            highlight(locs);
        }, 300);
    })
}
function selectLoc(loc, callback) {
    editor.setSelection({line: loc.start.line - 1, ch: loc.start.column}, {line: loc.end.line - 1, ch: loc.end.column});
    callback();
}
document.getElementById("enter-button").addEventListener("click", function () {
    var editingCode = editor.getValue();
    var nodes = traverseSteper(editingCode);
    var enterLocs = nodes.enter;
    highlight(enterLocs.reverse());
});
document.getElementById("leave-button").addEventListener("click", function () {
    var editingCode = editor.getValue();
    var nodes = traverseSteper(editingCode);
    var levesLoc = nodes.leave;
    highlight(levesLoc.reverse());
});