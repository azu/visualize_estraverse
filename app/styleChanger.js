/**
 * Created by azu on 2014/03/24.
 * LICENSE : MIT
 */
"use strict";
var styleElement;
module.exports.insert = function (cssText) {
    if (styleElement == null) {
        styleElement = document.createElement('style');
        styleElement.type = "text/css";
        document.getElementsByTagName('head').item(0).appendChild(styleElement);
    }
    var sheet = styleElement.sheet;
    if (sheet.cssRules.length > 0) {
        styleElement.sheet.deleteRule(0);
    }
    styleElement.sheet.insertRule(cssText, 0);

};

module.exports.dispose = function () {
    if (styleElement != null) {
        styleElement.parentNode.removeChild(styleElement);
        styleElement = null;
    }
};
