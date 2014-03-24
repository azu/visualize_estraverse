/**
 * Created by azu on 2014/03/23.
 * LICENSE : MIT
 */
"use strict";
var styleChanger = require("./styleChanger");
var textArea = document.getElementById("code-area");
var editor = CodeMirror.fromTextArea(textArea, {
    mode: "javascript",
    lineNumbers: true
});
require("./hash-injector")(editor);
var traverseSteper = require("./traverseSteper");
function highlight(locs) {
    if (locs.length == 0) {
        styleChanger.dispose();
        return;
    }
    var loc = locs.pop();
    selectLoc(loc, function () {
        setTimeout(function () {
            highlight(locs);
        }, 300);
    })
}
function selectLoc(item, callback) {
    var loc = item.loc;
    if (item.visitorType == "enter") {
        styleChanger.insert(".CodeMirror-selected { background: rgb(255, 102, 102); }");
    } else if (item.visitorType == "leave") {
        styleChanger.insert(".CodeMirror-selected { background: rgb(81, 207, 207); }");
    }
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
document.getElementById("both-button").addEventListener("click", function () {
    var editingCode = editor.getValue();
    var nodes = traverseSteper(editingCode);
    var bothLoc = nodes.both;
    highlight(bothLoc.reverse());
});
document.getElementById("create-permanent").addEventListener("click", function (event) {
    event.preventDefault();
    location.hash = encodeURIComponent(editor.getValue());
});
