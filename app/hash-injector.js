/**
 * Created by azu on 2014/03/24.
 * LICENSE : MIT
 */
"use strict";
module.exports = function (editor) {
    var hash = location.hash;
    if(hash) {
        var trimed = hash[0] === "#" ? hash.substring(1) : hash;
        editor.setValue(decodeURIComponent(trimed));
    }
};