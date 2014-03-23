(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./traverseSteper":2}],2:[function(require,module,exports){
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
},{"esprima":3,"estraverse":4}],3:[function(require,module,exports){
/*
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true plusplus:true */
/*global esprima:true, define:true, exports:true, window: true,
throwError: true, createLiteral: true, generateStatement: true,
parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
parseFunctionDeclaration: true, parseFunctionExpression: true,
parseFunctionSourceElements: true, parseVariableIdentifier: true,
parseLeftHandSideExpression: true,
parseStatement: true, parseSourceElement: true */

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.esprima = {}));
    }
}(this, function (exports) {
    'use strict';

    var Token,
        TokenName,
        Syntax,
        PropertyKind,
        Messages,
        Regex,
        source,
        strict,
        index,
        lineNumber,
        lineStart,
        length,
        buffer,
        state,
        extra;

    Token = {
        BooleanLiteral: 1,
        EOF: 2,
        Identifier: 3,
        Keyword: 4,
        NullLiteral: 5,
        NumericLiteral: 6,
        Punctuator: 7,
        StringLiteral: 8
    };

    TokenName = {};
    TokenName[Token.BooleanLiteral] = 'Boolean';
    TokenName[Token.EOF] = '<end>';
    TokenName[Token.Identifier] = 'Identifier';
    TokenName[Token.Keyword] = 'Keyword';
    TokenName[Token.NullLiteral] = 'Null';
    TokenName[Token.NumericLiteral] = 'Numeric';
    TokenName[Token.Punctuator] = 'Punctuator';
    TokenName[Token.StringLiteral] = 'String';

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    PropertyKind = {
        Data: 1,
        Get: 2,
        Set: 4
    };

    // Error messages should be identical to V8.
    Messages = {
        UnexpectedToken:  'Unexpected token %0',
        UnexpectedNumber:  'Unexpected number',
        UnexpectedString:  'Unexpected string',
        UnexpectedIdentifier:  'Unexpected identifier',
        UnexpectedReserved:  'Unexpected reserved word',
        UnexpectedEOS:  'Unexpected end of input',
        NewlineAfterThrow:  'Illegal newline after throw',
        InvalidRegExp: 'Invalid regular expression',
        UnterminatedRegExp:  'Invalid regular expression: missing /',
        InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
        InvalidLHSInForIn:  'Invalid left-hand side in for-in',
        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
        NoCatchOrFinally:  'Missing catch or finally after try',
        UnknownLabel: 'Undefined label \'%0\'',
        Redeclaration: '%0 \'%1\' has already been declared',
        IllegalContinue: 'Illegal continue statement',
        IllegalBreak: 'Illegal break statement',
        IllegalReturn: 'Illegal return statement',
        StrictModeWith:  'Strict mode code may not include a with statement',
        StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
        StrictVarName:  'Variable name may not be eval or arguments in strict mode',
        StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
        StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
        StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
        StrictDelete:  'Delete of an unqualified identifier in strict mode.',
        StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
        AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
        AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
        StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
        StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
        StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
        StrictReservedWord:  'Use of future reserved word in strict mode'
    };

    // See also tools/generate-unicode-regex.py.
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
        NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
    };

    // Ensure the condition is true, otherwise throw an error.
    // This is only to have a better contract semantic, i.e. another safety net
    // to catch a logic error. The condition shall be fulfilled in normal case.
    // Do NOT use this to enforce a certain condition on any user input.

    function assert(condition, message) {
        if (!condition) {
            throw new Error('ASSERT: ' + message);
        }
    }

    function sliceSource(from, to) {
        return source.slice(from, to);
    }

    if (typeof 'esprima'[0] === 'undefined') {
        sliceSource = function sliceArraySource(from, to) {
            return source.slice(from, to).join('');
        };
    }

    function isDecimalDigit(ch) {
        return '0123456789'.indexOf(ch) >= 0;
    }

    function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
    }


    // 7.2 White Space

    function isWhiteSpace(ch) {
        return (ch === ' ') || (ch === '\u0009') || (ch === '\u000B') ||
            (ch === '\u000C') || (ch === '\u00A0') ||
            (ch.charCodeAt(0) >= 0x1680 &&
             '\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF'.indexOf(ch) >= 0);
    }

    // 7.3 Line Terminators

    function isLineTerminator(ch) {
        return (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029');
    }

    // 7.6 Identifier Names and Identifiers

    function isIdentifierStart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierStart.test(ch));
    }

    function isIdentifierPart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch >= '0') && (ch <= '9')) ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierPart.test(ch));
    }

    // 7.6.1.2 Future Reserved Words

    function isFutureReservedWord(id) {
        switch (id) {

        // Future reserved words.
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
            return true;
        }

        return false;
    }

    function isStrictModeReservedWord(id) {
        switch (id) {

        // Strict Mode reserved words.
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
            return true;
        }

        return false;
    }

    function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }

    // 7.6.1.1 Keywords

    function isKeyword(id) {
        var keyword = false;
        switch (id.length) {
        case 2:
            keyword = (id === 'if') || (id === 'in') || (id === 'do');
            break;
        case 3:
            keyword = (id === 'var') || (id === 'for') || (id === 'new') || (id === 'try');
            break;
        case 4:
            keyword = (id === 'this') || (id === 'else') || (id === 'case') || (id === 'void') || (id === 'with');
            break;
        case 5:
            keyword = (id === 'while') || (id === 'break') || (id === 'catch') || (id === 'throw');
            break;
        case 6:
            keyword = (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch');
            break;
        case 7:
            keyword = (id === 'default') || (id === 'finally');
            break;
        case 8:
            keyword = (id === 'function') || (id === 'continue') || (id === 'debugger');
            break;
        case 10:
            keyword = (id === 'instanceof');
            break;
        }

        if (keyword) {
            return true;
        }

        switch (id) {
        // Future reserved words.
        // 'const' is specialized as Keyword in V8.
        case 'const':
            return true;

        // For compatiblity to SpiderMonkey and ES.next
        case 'yield':
        case 'let':
            return true;
        }

        if (strict && isStrictModeReservedWord(id)) {
            return true;
        }

        return isFutureReservedWord(id);
    }

    // 7.4 Comments

    function skipComment() {
        var ch, blockComment, lineComment;

        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch)) {
                    lineComment = false;
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            ++index;
                            blockComment = false;
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    index += 2;
                    lineComment = true;
                } else if (ch === '*') {
                    index += 2;
                    blockComment = true;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function scanHexEscape(prefix) {
        var i, len, ch, code = 0;

        len = (prefix === 'u') ? 4 : 2;
        for (i = 0; i < len; ++i) {
            if (index < length && isHexDigit(source[index])) {
                ch = source[index++];
                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
            } else {
                return '';
            }
        }
        return String.fromCharCode(code);
    }

    function scanIdentifier() {
        var ch, start, id, restore;

        ch = source[index];
        if (!isIdentifierStart(ch)) {
            return;
        }

        start = index;
        if (ch === '\\') {
            ++index;
            if (source[index] !== 'u') {
                return;
            }
            ++index;
            restore = index;
            ch = scanHexEscape('u');
            if (ch) {
                if (ch === '\\' || !isIdentifierStart(ch)) {
                    return;
                }
                id = ch;
            } else {
                index = restore;
                id = 'u';
            }
        } else {
            id = source[index++];
        }

        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }
            if (ch === '\\') {
                ++index;
                if (source[index] !== 'u') {
                    return;
                }
                ++index;
                restore = index;
                ch = scanHexEscape('u');
                if (ch) {
                    if (ch === '\\' || !isIdentifierPart(ch)) {
                        return;
                    }
                    id += ch;
                } else {
                    index = restore;
                    id += 'u';
                }
            } else {
                id += source[index++];
            }
        }

        // There is no keyword or literal with only one character.
        // Thus, it must be an identifier.
        if (id.length === 1) {
            return {
                type: Token.Identifier,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (isKeyword(id)) {
            return {
                type: Token.Keyword,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.1 Null Literals

        if (id === 'null') {
            return {
                type: Token.NullLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.2 Boolean Literals

        if (id === 'true' || id === 'false') {
            return {
                type: Token.BooleanLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        return {
            type: Token.Identifier,
            value: id,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.7 Punctuators

    function scanPunctuator() {
        var start = index,
            ch1 = source[index],
            ch2,
            ch3,
            ch4;

        // Check for most common single-character punctuators.

        if (ch1 === ';' || ch1 === '{' || ch1 === '}') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === ',' || ch1 === '(' || ch1 === ')') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Dot (.) can also start a floating-point number, hence the need
        // to check the next character.

        ch2 = source[index + 1];
        if (ch1 === '.' && !isDecimalDigit(ch2)) {
            return {
                type: Token.Punctuator,
                value: source[index++],
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Peek more characters.

        ch3 = source[index + 2];
        ch4 = source[index + 3];

        // 4-character punctuator: >>>=

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            if (ch4 === '=') {
                index += 4;
                return {
                    type: Token.Punctuator,
                    value: '>>>=',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // 3-character punctuators: === !== >>> <<= >>=

        if (ch1 === '=' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '===',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '!' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '!==',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>>',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '<<=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 2-character punctuators: <= >= == != ++ -- << >> && ||
        // += -= *= %= &= |= ^= /=

        if (ch2 === '=') {
            if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        if (ch1 === ch2 && ('+-<>&|'.indexOf(ch1) >= 0)) {
            if ('+-<>&|'.indexOf(ch2) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // The remaining 1-character punctuators.

        if ('[]<>+-*%&|^!~?:=/'.indexOf(ch1) >= 0) {
            return {
                type: Token.Punctuator,
                value: source[index++],
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    }

    // 7.8.3 Numeric Literals

    function scanNumericLiteral() {
        var number, start, ch;

        ch = source[index];
        assert(isDecimalDigit(ch) || (ch === '.'),
            'Numeric literal must start with a decimal digit or a decimal point');

        start = index;
        number = '';
        if (ch !== '.') {
            number = source[index++];
            ch = source[index];

            // Hex number starts with '0x'.
            // Octal number starts with '0'.
            if (number === '0') {
                if (ch === 'x' || ch === 'X') {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isHexDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }

                    if (number.length <= 2) {
                        // only 0x
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 16),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                } else if (isOctalDigit(ch)) {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isOctalDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 8),
                        octal: true,
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                }

                // decimal number starts with '0' such as '09' is illegal.
                if (isDecimalDigit(ch)) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            }

            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += source[index++];
            }
        }

        if (ch === '.') {
            number += source[index++];
            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += source[index++];
            }
        }

        if (ch === 'e' || ch === 'E') {
            number += source[index++];

            ch = source[index];
            if (ch === '+' || ch === '-') {
                number += source[index++];
            }

            ch = source[index];
            if (isDecimalDigit(ch)) {
                number += source[index++];
                while (index < length) {
                    ch = source[index];
                    if (!isDecimalDigit(ch)) {
                        break;
                    }
                    number += source[index++];
                }
            } else {
                ch = 'character ' + ch;
                if (index >= length) {
                    ch = '<end>';
                }
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        if (index < length) {
            ch = source[index];
            if (isIdentifierStart(ch)) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(number),
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.8.4 String Literals

    function scanStringLiteral() {
        var str = '', quote, start, ch, code, unescaped, restore, octal = false;

        quote = source[index];
        assert((quote === '\'' || quote === '"'),
            'String literal must starts with a quote');

        start = index;
        ++index;

        while (index < length) {
            ch = source[index++];

            if (ch === quote) {
                quote = '';
                break;
            } else if (ch === '\\') {
                ch = source[index++];
                if (!isLineTerminator(ch)) {
                    switch (ch) {
                    case 'n':
                        str += '\n';
                        break;
                    case 'r':
                        str += '\r';
                        break;
                    case 't':
                        str += '\t';
                        break;
                    case 'u':
                    case 'x':
                        restore = index;
                        unescaped = scanHexEscape(ch);
                        if (unescaped) {
                            str += unescaped;
                        } else {
                            index = restore;
                            str += ch;
                        }
                        break;
                    case 'b':
                        str += '\b';
                        break;
                    case 'f':
                        str += '\f';
                        break;
                    case 'v':
                        str += '\x0B';
                        break;

                    default:
                        if (isOctalDigit(ch)) {
                            code = '01234567'.indexOf(ch);

                            // \0 is not octal escape sequence
                            if (code !== 0) {
                                octal = true;
                            }

                            if (index < length && isOctalDigit(source[index])) {
                                octal = true;
                                code = code * 8 + '01234567'.indexOf(source[index++]);

                                // 3 digits are only allowed when string starts
                                // with 0, 1, 2, 3
                                if ('0123'.indexOf(ch) >= 0 &&
                                        index < length &&
                                        isOctalDigit(source[index])) {
                                    code = code * 8 + '01234567'.indexOf(source[index++]);
                                }
                            }
                            str += String.fromCharCode(code);
                        } else {
                            str += ch;
                        }
                        break;
                    }
                } else {
                    ++lineNumber;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                }
            } else if (isLineTerminator(ch)) {
                break;
            } else {
                str += ch;
            }
        }

        if (quote !== '') {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    function scanRegExp() {
        var str, ch, start, pattern, flags, value, classMarker = false, restore, terminated = false;

        buffer = null;
        skipComment();

        start = index;
        ch = source[index];
        assert(ch === '/', 'Regular expression literal must start with a slash');
        str = source[index++];

        while (index < length) {
            ch = source[index++];
            str += ch;
            if (ch === '\\') {
                ch = source[index++];
                // ECMA-262 7.8.5
                if (isLineTerminator(ch)) {
                    throwError({}, Messages.UnterminatedRegExp);
                }
                str += ch;
            } else if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '/') {
                    terminated = true;
                    break;
                } else if (ch === '[') {
                    classMarker = true;
                } else if (isLineTerminator(ch)) {
                    throwError({}, Messages.UnterminatedRegExp);
                }
            }
        }

        if (!terminated) {
            throwError({}, Messages.UnterminatedRegExp);
        }

        // Exclude leading and trailing slash.
        pattern = str.substr(1, str.length - 2);

        flags = '';
        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }

            ++index;
            if (ch === '\\' && index < length) {
                ch = source[index];
                if (ch === 'u') {
                    ++index;
                    restore = index;
                    ch = scanHexEscape('u');
                    if (ch) {
                        flags += ch;
                        str += '\\u';
                        for (; restore < index; ++restore) {
                            str += source[restore];
                        }
                    } else {
                        index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                } else {
                    str += '\\';
                }
            } else {
                flags += ch;
                str += ch;
            }
        }

        try {
            value = new RegExp(pattern, flags);
        } catch (e) {
            throwError({}, Messages.InvalidRegExp);
        }

        return {
            literal: str,
            value: value,
            range: [start, index]
        };
    }

    function isIdentifierName(token) {
        return token.type === Token.Identifier ||
            token.type === Token.Keyword ||
            token.type === Token.BooleanLiteral ||
            token.type === Token.NullLiteral;
    }

    function advance() {
        var ch, token;

        skipComment();

        if (index >= length) {
            return {
                type: Token.EOF,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [index, index]
            };
        }

        token = scanPunctuator();
        if (typeof token !== 'undefined') {
            return token;
        }

        ch = source[index];

        if (ch === '\'' || ch === '"') {
            return scanStringLiteral();
        }

        if (ch === '.' || isDecimalDigit(ch)) {
            return scanNumericLiteral();
        }

        token = scanIdentifier();
        if (typeof token !== 'undefined') {
            return token;
        }

        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    function lex() {
        var token;

        if (buffer) {
            index = buffer.range[1];
            lineNumber = buffer.lineNumber;
            lineStart = buffer.lineStart;
            token = buffer;
            buffer = null;
            return token;
        }

        buffer = null;
        return advance();
    }

    function lookahead() {
        var pos, line, start;

        if (buffer !== null) {
            return buffer;
        }

        pos = index;
        line = lineNumber;
        start = lineStart;
        buffer = advance();
        index = pos;
        lineNumber = line;
        lineStart = start;

        return buffer;
    }

    // Return true if there is a line terminator before the next token.

    function peekLineTerminator() {
        var pos, line, start, found;

        pos = index;
        line = lineNumber;
        start = lineStart;
        skipComment();
        found = lineNumber !== line;
        index = pos;
        lineNumber = line;
        lineStart = start;

        return found;
    }

    // Throw an exception

    function throwError(token, messageFormat) {
        var error,
            args = Array.prototype.slice.call(arguments, 2),
            msg = messageFormat.replace(
                /%(\d)/g,
                function (whole, index) {
                    return args[index] || '';
                }
            );

        if (typeof token.lineNumber === 'number') {
            error = new Error('Line ' + token.lineNumber + ': ' + msg);
            error.index = token.range[0];
            error.lineNumber = token.lineNumber;
            error.column = token.range[0] - lineStart + 1;
        } else {
            error = new Error('Line ' + lineNumber + ': ' + msg);
            error.index = index;
            error.lineNumber = lineNumber;
            error.column = index - lineStart + 1;
        }

        throw error;
    }

    function throwErrorTolerant() {
        try {
            throwError.apply(null, arguments);
        } catch (e) {
            if (extra.errors) {
                extra.errors.push(e);
            } else {
                throw e;
            }
        }
    }


    // Throw an exception because of the token.

    function throwUnexpected(token) {
        if (token.type === Token.EOF) {
            throwError(token, Messages.UnexpectedEOS);
        }

        if (token.type === Token.NumericLiteral) {
            throwError(token, Messages.UnexpectedNumber);
        }

        if (token.type === Token.StringLiteral) {
            throwError(token, Messages.UnexpectedString);
        }

        if (token.type === Token.Identifier) {
            throwError(token, Messages.UnexpectedIdentifier);
        }

        if (token.type === Token.Keyword) {
            if (isFutureReservedWord(token.value)) {
                throwError(token, Messages.UnexpectedReserved);
            } else if (strict && isStrictModeReservedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictReservedWord);
                return;
            }
            throwError(token, Messages.UnexpectedToken, token.value);
        }

        // BooleanLiteral, NullLiteral, or Punctuator.
        throwError(token, Messages.UnexpectedToken, token.value);
    }

    // Expect the next token to match the specified punctuator.
    // If not, an exception will be thrown.

    function expect(value) {
        var token = lex();
        if (token.type !== Token.Punctuator || token.value !== value) {
            throwUnexpected(token);
        }
    }

    // Expect the next token to match the specified keyword.
    // If not, an exception will be thrown.

    function expectKeyword(keyword) {
        var token = lex();
        if (token.type !== Token.Keyword || token.value !== keyword) {
            throwUnexpected(token);
        }
    }

    // Return true if the next token matches the specified punctuator.

    function match(value) {
        var token = lookahead();
        return token.type === Token.Punctuator && token.value === value;
    }

    // Return true if the next token matches the specified keyword

    function matchKeyword(keyword) {
        var token = lookahead();
        return token.type === Token.Keyword && token.value === keyword;
    }

    // Return true if the next token is an assignment operator

    function matchAssign() {
        var token = lookahead(),
            op = token.value;

        if (token.type !== Token.Punctuator) {
            return false;
        }
        return op === '=' ||
            op === '*=' ||
            op === '/=' ||
            op === '%=' ||
            op === '+=' ||
            op === '-=' ||
            op === '<<=' ||
            op === '>>=' ||
            op === '>>>=' ||
            op === '&=' ||
            op === '^=' ||
            op === '|=';
    }

    function consumeSemicolon() {
        var token, line;

        // Catch the very common case first.
        if (source[index] === ';') {
            lex();
            return;
        }

        line = lineNumber;
        skipComment();
        if (lineNumber !== line) {
            return;
        }

        if (match(';')) {
            lex();
            return;
        }

        token = lookahead();
        if (token.type !== Token.EOF && !match('}')) {
            throwUnexpected(token);
        }
    }

    // Return true if provided expression is LeftHandSideExpression

    function isLeftHandSide(expr) {
        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
    }

    // 11.1.4 Array Initialiser

    function parseArrayInitialiser() {
        var elements = [];

        expect('[');

        while (!match(']')) {
            if (match(',')) {
                lex();
                elements.push(null);
            } else {
                elements.push(parseAssignmentExpression());

                if (!match(']')) {
                    expect(',');
                }
            }
        }

        expect(']');

        return {
            type: Syntax.ArrayExpression,
            elements: elements
        };
    }

    // 11.1.5 Object Initialiser

    function parsePropertyFunction(param, first) {
        var previousStrict, body;

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (first && strict && isRestrictedWord(param[0].name)) {
            throwErrorTolerant(first, Messages.StrictParamName);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionExpression,
            id: null,
            params: param,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    function parseObjectPropertyKey() {
        var token = lex();

        // Note: This function is called only from parseObjectProperty(), where
        // EOF and Punctuator tokens are already filtered out.

        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseObjectProperty() {
        var token, key, id, param;

        token = lookahead();

        if (token.type === Token.Identifier) {

            id = parseObjectPropertyKey();

            // Property Assignment: Getter and Setter.

            if (token.value === 'get' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                expect(')');
                return {
                    type: Syntax.Property,
                    key: key,
                    value: parsePropertyFunction([]),
                    kind: 'get'
                };
            } else if (token.value === 'set' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                token = lookahead();
                if (token.type !== Token.Identifier) {
                    expect(')');
                    throwErrorTolerant(token, Messages.UnexpectedToken, token.value);
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction([]),
                        kind: 'set'
                    };
                } else {
                    param = [ parseVariableIdentifier() ];
                    expect(')');
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction(param, token),
                        kind: 'set'
                    };
                }
            } else {
                expect(':');
                return {
                    type: Syntax.Property,
                    key: id,
                    value: parseAssignmentExpression(),
                    kind: 'init'
                };
            }
        } else if (token.type === Token.EOF || token.type === Token.Punctuator) {
            throwUnexpected(token);
        } else {
            key = parseObjectPropertyKey();
            expect(':');
            return {
                type: Syntax.Property,
                key: key,
                value: parseAssignmentExpression(),
                kind: 'init'
            };
        }
    }

    function parseObjectInitialiser() {
        var properties = [], property, name, kind, map = {}, toString = String;

        expect('{');

        while (!match('}')) {
            property = parseObjectProperty();

            if (property.key.type === Syntax.Identifier) {
                name = property.key.name;
            } else {
                name = toString(property.key.value);
            }
            kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;
            if (Object.prototype.hasOwnProperty.call(map, name)) {
                if (map[name] === PropertyKind.Data) {
                    if (strict && kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                    } else if (kind !== PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    }
                } else {
                    if (kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    } else if (map[name] & kind) {
                        throwErrorTolerant({}, Messages.AccessorGetSet);
                    }
                }
                map[name] |= kind;
            } else {
                map[name] = kind;
            }

            properties.push(property);

            if (!match('}')) {
                expect(',');
            }
        }

        expect('}');

        return {
            type: Syntax.ObjectExpression,
            properties: properties
        };
    }

    // 11.1.6 The Grouping Operator

    function parseGroupExpression() {
        var expr;

        expect('(');

        expr = parseExpression();

        expect(')');

        return expr;
    }


    // 11.1 Primary Expressions

    function parsePrimaryExpression() {
        var token = lookahead(),
            type = token.type;

        if (type === Token.Identifier) {
            return {
                type: Syntax.Identifier,
                name: lex().value
            };
        }

        if (type === Token.StringLiteral || type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(lex());
        }

        if (type === Token.Keyword) {
            if (matchKeyword('this')) {
                lex();
                return {
                    type: Syntax.ThisExpression
                };
            }

            if (matchKeyword('function')) {
                return parseFunctionExpression();
            }
        }

        if (type === Token.BooleanLiteral) {
            lex();
            token.value = (token.value === 'true');
            return createLiteral(token);
        }

        if (type === Token.NullLiteral) {
            lex();
            token.value = null;
            return createLiteral(token);
        }

        if (match('[')) {
            return parseArrayInitialiser();
        }

        if (match('{')) {
            return parseObjectInitialiser();
        }

        if (match('(')) {
            return parseGroupExpression();
        }

        if (match('/') || match('/=')) {
            return createLiteral(scanRegExp());
        }

        return throwUnexpected(lex());
    }

    // 11.2 Left-Hand-Side Expressions

    function parseArguments() {
        var args = [];

        expect('(');

        if (!match(')')) {
            while (index < length) {
                args.push(parseAssignmentExpression());
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return args;
    }

    function parseNonComputedProperty() {
        var token = lex();

        if (!isIdentifierName(token)) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseNonComputedMember() {
        expect('.');

        return parseNonComputedProperty();
    }

    function parseComputedMember() {
        var expr;

        expect('[');

        expr = parseExpression();

        expect(']');

        return expr;
    }

    function parseNewExpression() {
        var expr;

        expectKeyword('new');

        expr = {
            type: Syntax.NewExpression,
            callee: parseLeftHandSideExpression(),
            'arguments': []
        };

        if (match('(')) {
            expr['arguments'] = parseArguments();
        }

        return expr;
    }

    function parseLeftHandSideExpressionAllowCall() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            }
        }

        return expr;
    }


    function parseLeftHandSideExpression() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            }
        }

        return expr;
    }

    // 11.3 Postfix Expressions

    function parsePostfixExpression() {
        var expr = parseLeftHandSideExpressionAllowCall(), token;

        token = lookahead();
        if (token.type !== Token.Punctuator) {
            return expr;
        }

        if ((match('++') || match('--')) && !peekLineTerminator()) {
            // 11.3.1, 11.3.2
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPostfix);
            }
            if (!isLeftHandSide(expr)) {
                throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: lex().value,
                argument: expr,
                prefix: false
            };
        }

        return expr;
    }

    // 11.4 Unary Operators

    function parseUnaryExpression() {
        var token, expr;

        token = lookahead();
        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
            return parsePostfixExpression();
        }

        if (match('++') || match('--')) {
            token = lex();
            expr = parseUnaryExpression();
            // 11.4.4, 11.4.5
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPrefix);
            }

            if (!isLeftHandSide(expr)) {
                throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: token.value,
                argument: expr,
                prefix: true
            };
            return expr;
        }

        if (match('+') || match('-') || match('~') || match('!')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression(),
                prefix: true
            };
            return expr;
        }

        if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression(),
                prefix: true
            };
            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                throwErrorTolerant({}, Messages.StrictDelete);
            }
            return expr;
        }

        return parsePostfixExpression();
    }

    // 11.5 Multiplicative Operators

    function parseMultiplicativeExpression() {
        var expr = parseUnaryExpression();

        while (match('*') || match('/') || match('%')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseUnaryExpression()
            };
        }

        return expr;
    }

    // 11.6 Additive Operators

    function parseAdditiveExpression() {
        var expr = parseMultiplicativeExpression();

        while (match('+') || match('-')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseMultiplicativeExpression()
            };
        }

        return expr;
    }

    // 11.7 Bitwise Shift Operators

    function parseShiftExpression() {
        var expr = parseAdditiveExpression();

        while (match('<<') || match('>>') || match('>>>')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseAdditiveExpression()
            };
        }

        return expr;
    }
    // 11.8 Relational Operators

    function parseRelationalExpression() {
        var expr, previousAllowIn;

        previousAllowIn = state.allowIn;
        state.allowIn = true;

        expr = parseShiftExpression();

        while (match('<') || match('>') || match('<=') || match('>=') || (previousAllowIn && matchKeyword('in')) || matchKeyword('instanceof')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseShiftExpression()
            };
        }

        state.allowIn = previousAllowIn;
        return expr;
    }

    // 11.9 Equality Operators

    function parseEqualityExpression() {
        var expr = parseRelationalExpression();

        while (match('==') || match('!=') || match('===') || match('!==')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseRelationalExpression()
            };
        }

        return expr;
    }

    // 11.10 Binary Bitwise Operators

    function parseBitwiseANDExpression() {
        var expr = parseEqualityExpression();

        while (match('&')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '&',
                left: expr,
                right: parseEqualityExpression()
            };
        }

        return expr;
    }

    function parseBitwiseXORExpression() {
        var expr = parseBitwiseANDExpression();

        while (match('^')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '^',
                left: expr,
                right: parseBitwiseANDExpression()
            };
        }

        return expr;
    }

    function parseBitwiseORExpression() {
        var expr = parseBitwiseXORExpression();

        while (match('|')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '|',
                left: expr,
                right: parseBitwiseXORExpression()
            };
        }

        return expr;
    }

    // 11.11 Binary Logical Operators

    function parseLogicalANDExpression() {
        var expr = parseBitwiseORExpression();

        while (match('&&')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '&&',
                left: expr,
                right: parseBitwiseORExpression()
            };
        }

        return expr;
    }

    function parseLogicalORExpression() {
        var expr = parseLogicalANDExpression();

        while (match('||')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '||',
                left: expr,
                right: parseLogicalANDExpression()
            };
        }

        return expr;
    }

    // 11.12 Conditional Operator

    function parseConditionalExpression() {
        var expr, previousAllowIn, consequent;

        expr = parseLogicalORExpression();

        if (match('?')) {
            lex();
            previousAllowIn = state.allowIn;
            state.allowIn = true;
            consequent = parseAssignmentExpression();
            state.allowIn = previousAllowIn;
            expect(':');

            expr = {
                type: Syntax.ConditionalExpression,
                test: expr,
                consequent: consequent,
                alternate: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.13 Assignment Operators

    function parseAssignmentExpression() {
        var token, expr;

        token = lookahead();
        expr = parseConditionalExpression();

        if (matchAssign()) {
            // LeftHandSideExpression
            if (!isLeftHandSide(expr)) {
                throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
            }

            // 11.13.1
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant(token, Messages.StrictLHSAssignment);
            }

            expr = {
                type: Syntax.AssignmentExpression,
                operator: lex().value,
                left: expr,
                right: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.14 Comma Operator

    function parseExpression() {
        var expr = parseAssignmentExpression();

        if (match(',')) {
            expr = {
                type: Syntax.SequenceExpression,
                expressions: [ expr ]
            };

            while (index < length) {
                if (!match(',')) {
                    break;
                }
                lex();
                expr.expressions.push(parseAssignmentExpression());
            }

        }
        return expr;
    }

    // 12.1 Block

    function parseStatementList() {
        var list = [],
            statement;

        while (index < length) {
            if (match('}')) {
                break;
            }
            statement = parseSourceElement();
            if (typeof statement === 'undefined') {
                break;
            }
            list.push(statement);
        }

        return list;
    }

    function parseBlock() {
        var block;

        expect('{');

        block = parseStatementList();

        expect('}');

        return {
            type: Syntax.BlockStatement,
            body: block
        };
    }

    // 12.2 Variable Statement

    function parseVariableIdentifier() {
        var token = lex();

        if (token.type !== Token.Identifier) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseVariableDeclaration(kind) {
        var id = parseVariableIdentifier(),
            init = null;

        // 12.2.1
        if (strict && isRestrictedWord(id.name)) {
            throwErrorTolerant({}, Messages.StrictVarName);
        }

        if (kind === 'const') {
            expect('=');
            init = parseAssignmentExpression();
        } else if (match('=')) {
            lex();
            init = parseAssignmentExpression();
        }

        return {
            type: Syntax.VariableDeclarator,
            id: id,
            init: init
        };
    }

    function parseVariableDeclarationList(kind) {
        var list = [];

        do {
            list.push(parseVariableDeclaration(kind));
            if (!match(',')) {
                break;
            }
            lex();
        } while (index < length);

        return list;
    }

    function parseVariableStatement() {
        var declarations;

        expectKeyword('var');

        declarations = parseVariableDeclarationList();

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: 'var'
        };
    }

    // kind may be `const` or `let`
    // Both are experimental and not in the specification yet.
    // see http://wiki.ecmascript.org/doku.php?id=harmony:const
    // and http://wiki.ecmascript.org/doku.php?id=harmony:let
    function parseConstLetDeclaration(kind) {
        var declarations;

        expectKeyword(kind);

        declarations = parseVariableDeclarationList(kind);

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: kind
        };
    }

    // 12.3 Empty Statement

    function parseEmptyStatement() {
        expect(';');

        return {
            type: Syntax.EmptyStatement
        };
    }

    // 12.4 Expression Statement

    function parseExpressionStatement() {
        var expr = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 12.5 If statement

    function parseIfStatement() {
        var test, consequent, alternate;

        expectKeyword('if');

        expect('(');

        test = parseExpression();

        expect(')');

        consequent = parseStatement();

        if (matchKeyword('else')) {
            lex();
            alternate = parseStatement();
        } else {
            alternate = null;
        }

        return {
            type: Syntax.IfStatement,
            test: test,
            consequent: consequent,
            alternate: alternate
        };
    }

    // 12.6 Iteration Statements

    function parseDoWhileStatement() {
        var body, test, oldInIteration;

        expectKeyword('do');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        if (match(';')) {
            lex();
        }

        return {
            type: Syntax.DoWhileStatement,
            body: body,
            test: test
        };
    }

    function parseWhileStatement() {
        var test, body, oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return {
            type: Syntax.WhileStatement,
            test: test,
            body: body
        };
    }

    function parseForVariableDeclaration() {
        var token = lex();

        return {
            type: Syntax.VariableDeclaration,
            declarations: parseVariableDeclarationList(),
            kind: token.value
        };
    }

    function parseForStatement() {
        var init, test, update, left, right, body, oldInIteration;

        init = test = update = null;

        expectKeyword('for');

        expect('(');

        if (match(';')) {
            lex();
        } else {
            if (matchKeyword('var') || matchKeyword('let')) {
                state.allowIn = false;
                init = parseForVariableDeclaration();
                state.allowIn = true;

                if (init.declarations.length === 1 && matchKeyword('in')) {
                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            } else {
                state.allowIn = false;
                init = parseExpression();
                state.allowIn = true;

                if (matchKeyword('in')) {
                    // LeftHandSideExpression
                    if (!isLeftHandSide(init)) {
                        throwErrorTolerant({}, Messages.InvalidLHSInForIn);
                    }

                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            }

            if (typeof left === 'undefined') {
                expect(';');
            }
        }

        if (typeof left === 'undefined') {

            if (!match(';')) {
                test = parseExpression();
            }
            expect(';');

            if (!match(')')) {
                update = parseExpression();
            }
        }

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        if (typeof left === 'undefined') {
            return {
                type: Syntax.ForStatement,
                init: init,
                test: test,
                update: update,
                body: body
            };
        }

        return {
            type: Syntax.ForInStatement,
            left: left,
            right: right,
            body: body,
            each: false
        };
    }

    // 12.7 The continue statement

    function parseContinueStatement() {
        var token, label = null;

        expectKeyword('continue');

        // Optimize the most common form: 'continue;'.
        if (source[index] === ';') {
            lex();

            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !state.inIteration) {
            throwError({}, Messages.IllegalContinue);
        }

        return {
            type: Syntax.ContinueStatement,
            label: label
        };
    }

    // 12.8 The break statement

    function parseBreakStatement() {
        var token, label = null;

        expectKeyword('break');

        // Optimize the most common form: 'break;'.
        if (source[index] === ';') {
            lex();

            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
        }

        return {
            type: Syntax.BreakStatement,
            label: label
        };
    }

    // 12.9 The return statement

    function parseReturnStatement() {
        var token, argument = null;

        expectKeyword('return');

        if (!state.inFunctionBody) {
            throwErrorTolerant({}, Messages.IllegalReturn);
        }

        // 'return' followed by a space and an identifier is very common.
        if (source[index] === ' ') {
            if (isIdentifierStart(source[index + 1])) {
                argument = parseExpression();
                consumeSemicolon();
                return {
                    type: Syntax.ReturnStatement,
                    argument: argument
                };
            }
        }

        if (peekLineTerminator()) {
            return {
                type: Syntax.ReturnStatement,
                argument: null
            };
        }

        if (!match(';')) {
            token = lookahead();
            if (!match('}') && token.type !== Token.EOF) {
                argument = parseExpression();
            }
        }

        consumeSemicolon();

        return {
            type: Syntax.ReturnStatement,
            argument: argument
        };
    }

    // 12.10 The with statement

    function parseWithStatement() {
        var object, body;

        if (strict) {
            throwErrorTolerant({}, Messages.StrictModeWith);
        }

        expectKeyword('with');

        expect('(');

        object = parseExpression();

        expect(')');

        body = parseStatement();

        return {
            type: Syntax.WithStatement,
            object: object,
            body: body
        };
    }

    // 12.10 The swith statement

    function parseSwitchCase() {
        var test,
            consequent = [],
            statement;

        if (matchKeyword('default')) {
            lex();
            test = null;
        } else {
            expectKeyword('case');
            test = parseExpression();
        }
        expect(':');

        while (index < length) {
            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                break;
            }
            statement = parseStatement();
            if (typeof statement === 'undefined') {
                break;
            }
            consequent.push(statement);
        }

        return {
            type: Syntax.SwitchCase,
            test: test,
            consequent: consequent
        };
    }

    function parseSwitchStatement() {
        var discriminant, cases, clause, oldInSwitch, defaultFound;

        expectKeyword('switch');

        expect('(');

        discriminant = parseExpression();

        expect(')');

        expect('{');

        cases = [];

        if (match('}')) {
            lex();
            return {
                type: Syntax.SwitchStatement,
                discriminant: discriminant,
                cases: cases
            };
        }

        oldInSwitch = state.inSwitch;
        state.inSwitch = true;
        defaultFound = false;

        while (index < length) {
            if (match('}')) {
                break;
            }
            clause = parseSwitchCase();
            if (clause.test === null) {
                if (defaultFound) {
                    throwError({}, Messages.MultipleDefaultsInSwitch);
                }
                defaultFound = true;
            }
            cases.push(clause);
        }

        state.inSwitch = oldInSwitch;

        expect('}');

        return {
            type: Syntax.SwitchStatement,
            discriminant: discriminant,
            cases: cases
        };
    }

    // 12.13 The throw statement

    function parseThrowStatement() {
        var argument;

        expectKeyword('throw');

        if (peekLineTerminator()) {
            throwError({}, Messages.NewlineAfterThrow);
        }

        argument = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ThrowStatement,
            argument: argument
        };
    }

    // 12.14 The try statement

    function parseCatchClause() {
        var param;

        expectKeyword('catch');

        expect('(');
        if (match(')')) {
            throwUnexpected(lookahead());
        }

        param = parseVariableIdentifier();
        // 12.14.1
        if (strict && isRestrictedWord(param.name)) {
            throwErrorTolerant({}, Messages.StrictCatchVariable);
        }

        expect(')');

        return {
            type: Syntax.CatchClause,
            param: param,
            body: parseBlock()
        };
    }

    function parseTryStatement() {
        var block, handlers = [], finalizer = null;

        expectKeyword('try');

        block = parseBlock();

        if (matchKeyword('catch')) {
            handlers.push(parseCatchClause());
        }

        if (matchKeyword('finally')) {
            lex();
            finalizer = parseBlock();
        }

        if (handlers.length === 0 && !finalizer) {
            throwError({}, Messages.NoCatchOrFinally);
        }

        return {
            type: Syntax.TryStatement,
            block: block,
            guardedHandlers: [],
            handlers: handlers,
            finalizer: finalizer
        };
    }

    // 12.15 The debugger statement

    function parseDebuggerStatement() {
        expectKeyword('debugger');

        consumeSemicolon();

        return {
            type: Syntax.DebuggerStatement
        };
    }

    // 12 Statements

    function parseStatement() {
        var token = lookahead(),
            expr,
            labeledBody;

        if (token.type === Token.EOF) {
            throwUnexpected(token);
        }

        if (token.type === Token.Punctuator) {
            switch (token.value) {
            case ';':
                return parseEmptyStatement();
            case '{':
                return parseBlock();
            case '(':
                return parseExpressionStatement();
            default:
                break;
            }
        }

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'break':
                return parseBreakStatement();
            case 'continue':
                return parseContinueStatement();
            case 'debugger':
                return parseDebuggerStatement();
            case 'do':
                return parseDoWhileStatement();
            case 'for':
                return parseForStatement();
            case 'function':
                return parseFunctionDeclaration();
            case 'if':
                return parseIfStatement();
            case 'return':
                return parseReturnStatement();
            case 'switch':
                return parseSwitchStatement();
            case 'throw':
                return parseThrowStatement();
            case 'try':
                return parseTryStatement();
            case 'var':
                return parseVariableStatement();
            case 'while':
                return parseWhileStatement();
            case 'with':
                return parseWithStatement();
            default:
                break;
            }
        }

        expr = parseExpression();

        // 12.12 Labelled Statements
        if ((expr.type === Syntax.Identifier) && match(':')) {
            lex();

            if (Object.prototype.hasOwnProperty.call(state.labelSet, expr.name)) {
                throwError({}, Messages.Redeclaration, 'Label', expr.name);
            }

            state.labelSet[expr.name] = true;
            labeledBody = parseStatement();
            delete state.labelSet[expr.name];

            return {
                type: Syntax.LabeledStatement,
                label: expr,
                body: labeledBody
            };
        }

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 13 Function Definition

    function parseFunctionSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted,
            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody;

        expect('{');

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        oldLabelSet = state.labelSet;
        oldInIteration = state.inIteration;
        oldInSwitch = state.inSwitch;
        oldInFunctionBody = state.inFunctionBody;

        state.labelSet = {};
        state.inIteration = false;
        state.inSwitch = false;
        state.inFunctionBody = true;

        while (index < length) {
            if (match('}')) {
                break;
            }
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }

        expect('}');

        state.labelSet = oldLabelSet;
        state.inIteration = oldInIteration;
        state.inSwitch = oldInSwitch;
        state.inFunctionBody = oldInFunctionBody;

        return {
            type: Syntax.BlockStatement,
            body: sourceElements
        };
    }

    function parseFunctionDeclaration() {
        var id, param, params = [], body, token, stricted, firstRestricted, message, previousStrict, paramSet;

        expectKeyword('function');
        token = lookahead();
        id = parseVariableIdentifier();
        if (strict) {
            if (isRestrictedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictFunctionName);
            }
        } else {
            if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }

        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead();
                param = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[param.name] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionDeclaration,
            id: id,
            params: params,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    function parseFunctionExpression() {
        var token, id = null, stricted, firstRestricted, message, param, params = [], body, previousStrict, paramSet;

        expectKeyword('function');

        if (!match('(')) {
            token = lookahead();
            id = parseVariableIdentifier();
            if (strict) {
                if (isRestrictedWord(token.value)) {
                    throwErrorTolerant(token, Messages.StrictFunctionName);
                }
            } else {
                if (isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }

        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead();
                param = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[param.name] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionExpression,
            id: id,
            params: params,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    // 14 Program

    function parseSourceElement() {
        var token = lookahead();

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'const':
            case 'let':
                return parseConstLetDeclaration(token.value);
            case 'function':
                return parseFunctionDeclaration();
            default:
                return parseStatement();
            }
        }

        if (token.type !== Token.EOF) {
            return parseStatement();
        }
    }

    function parseSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted;

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        while (index < length) {
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }
        return sourceElements;
    }

    function parseProgram() {
        var program;
        strict = false;
        program = {
            type: Syntax.Program,
            body: parseSourceElements()
        };
        return program;
    }

    // The following functions are needed only when the option to preserve
    // the comments is active.

    function addComment(type, value, start, end, loc) {
        assert(typeof start === 'number', 'Comment must have valid position');

        // Because the way the actual token is scanned, often the comments
        // (if any) are skipped twice during the lexical analysis.
        // Thus, we need to skip adding a comment if the comment array already
        // handled it.
        if (extra.comments.length > 0) {
            if (extra.comments[extra.comments.length - 1].range[1] > start) {
                return;
            }
        }

        extra.comments.push({
            type: type,
            value: value,
            range: [start, end],
            loc: loc
        });
    }

    function scanComment() {
        var comment, ch, loc, start, blockComment, lineComment;

        comment = '';
        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch)) {
                    loc.end = {
                        line: lineNumber,
                        column: index - lineStart - 1
                    };
                    lineComment = false;
                    addComment('Line', comment, start, index - 1, loc);
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                    comment = '';
                } else if (index >= length) {
                    lineComment = false;
                    comment += ch;
                    loc.end = {
                        line: lineNumber,
                        column: length - lineStart
                    };
                    addComment('Line', comment, start, length, loc);
                } else {
                    comment += ch;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                        comment += '\r\n';
                    } else {
                        comment += ch;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    comment += ch;
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            comment = comment.substr(0, comment.length - 1);
                            blockComment = false;
                            ++index;
                            loc.end = {
                                line: lineNumber,
                                column: index - lineStart
                            };
                            addComment('Block', comment, start, index, loc);
                            comment = '';
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart
                        }
                    };
                    start = index;
                    index += 2;
                    lineComment = true;
                    if (index >= length) {
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        lineComment = false;
                        addComment('Line', comment, start, index, loc);
                    }
                } else if (ch === '*') {
                    start = index;
                    index += 2;
                    blockComment = true;
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart - 2
                        }
                    };
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function filterCommentLocation() {
        var i, entry, comment, comments = [];

        for (i = 0; i < extra.comments.length; ++i) {
            entry = extra.comments[i];
            comment = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                comment.range = entry.range;
            }
            if (extra.loc) {
                comment.loc = entry.loc;
            }
            comments.push(comment);
        }

        extra.comments = comments;
    }

    function collectToken() {
        var start, loc, token, range, value;

        skipComment();
        start = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        token = extra.advance();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        if (token.type !== Token.EOF) {
            range = [token.range[0], token.range[1]];
            value = sliceSource(token.range[0], token.range[1]);
            extra.tokens.push({
                type: TokenName[token.type],
                value: value,
                range: range,
                loc: loc
            });
        }

        return token;
    }

    function collectRegex() {
        var pos, loc, regex, token;

        skipComment();

        pos = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        regex = extra.scanRegExp();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        // Pop the previous token, which is likely '/' or '/='
        if (extra.tokens.length > 0) {
            token = extra.tokens[extra.tokens.length - 1];
            if (token.range[0] === pos && token.type === 'Punctuator') {
                if (token.value === '/' || token.value === '/=') {
                    extra.tokens.pop();
                }
            }
        }

        extra.tokens.push({
            type: 'RegularExpression',
            value: regex.literal,
            range: [pos, index],
            loc: loc
        });

        return regex;
    }

    function filterTokenLocation() {
        var i, entry, token, tokens = [];

        for (i = 0; i < extra.tokens.length; ++i) {
            entry = extra.tokens[i];
            token = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                token.range = entry.range;
            }
            if (extra.loc) {
                token.loc = entry.loc;
            }
            tokens.push(token);
        }

        extra.tokens = tokens;
    }

    function createLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value
        };
    }

    function createRawLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value,
            raw: sliceSource(token.range[0], token.range[1])
        };
    }

    function createLocationMarker() {
        var marker = {};

        marker.range = [index, index];
        marker.loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            },
            end: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        marker.end = function () {
            this.range[1] = index;
            this.loc.end.line = lineNumber;
            this.loc.end.column = index - lineStart;
        };

        marker.applyGroup = function (node) {
            if (extra.range) {
                node.groupRange = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.groupLoc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        marker.apply = function (node) {
            if (extra.range) {
                node.range = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.loc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        return marker;
    }

    function trackGroupExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();
        expect('(');

        expr = parseExpression();

        expect(')');

        marker.end();
        marker.applyGroup(expr);

        return expr;
    }

    function trackLeftHandSideExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function trackLeftHandSideExpressionAllowCall() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
                marker.end();
                marker.apply(expr);
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function filterGroup(node) {
        var n, i, entry;

        n = (Object.prototype.toString.apply(node) === '[object Array]') ? [] : {};
        for (i in node) {
            if (node.hasOwnProperty(i) && i !== 'groupRange' && i !== 'groupLoc') {
                entry = node[i];
                if (entry === null || typeof entry !== 'object' || entry instanceof RegExp) {
                    n[i] = entry;
                } else {
                    n[i] = filterGroup(entry);
                }
            }
        }
        return n;
    }

    function wrapTrackingFunction(range, loc) {

        return function (parseFunction) {

            function isBinary(node) {
                return node.type === Syntax.LogicalExpression ||
                    node.type === Syntax.BinaryExpression;
            }

            function visit(node) {
                var start, end;

                if (isBinary(node.left)) {
                    visit(node.left);
                }
                if (isBinary(node.right)) {
                    visit(node.right);
                }

                if (range) {
                    if (node.left.groupRange || node.right.groupRange) {
                        start = node.left.groupRange ? node.left.groupRange[0] : node.left.range[0];
                        end = node.right.groupRange ? node.right.groupRange[1] : node.right.range[1];
                        node.range = [start, end];
                    } else if (typeof node.range === 'undefined') {
                        start = node.left.range[0];
                        end = node.right.range[1];
                        node.range = [start, end];
                    }
                }
                if (loc) {
                    if (node.left.groupLoc || node.right.groupLoc) {
                        start = node.left.groupLoc ? node.left.groupLoc.start : node.left.loc.start;
                        end = node.right.groupLoc ? node.right.groupLoc.end : node.right.loc.end;
                        node.loc = {
                            start: start,
                            end: end
                        };
                    } else if (typeof node.loc === 'undefined') {
                        node.loc = {
                            start: node.left.loc.start,
                            end: node.right.loc.end
                        };
                    }
                }
            }

            return function () {
                var marker, node;

                skipComment();

                marker = createLocationMarker();
                node = parseFunction.apply(null, arguments);
                marker.end();

                if (range && typeof node.range === 'undefined') {
                    marker.apply(node);
                }

                if (loc && typeof node.loc === 'undefined') {
                    marker.apply(node);
                }

                if (isBinary(node)) {
                    visit(node);
                }

                return node;
            };
        };
    }

    function patch() {

        var wrapTracking;

        if (extra.comments) {
            extra.skipComment = skipComment;
            skipComment = scanComment;
        }

        if (extra.raw) {
            extra.createLiteral = createLiteral;
            createLiteral = createRawLiteral;
        }

        if (extra.range || extra.loc) {

            extra.parseGroupExpression = parseGroupExpression;
            extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
            extra.parseLeftHandSideExpressionAllowCall = parseLeftHandSideExpressionAllowCall;
            parseGroupExpression = trackGroupExpression;
            parseLeftHandSideExpression = trackLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = trackLeftHandSideExpressionAllowCall;

            wrapTracking = wrapTrackingFunction(extra.range, extra.loc);

            extra.parseAdditiveExpression = parseAdditiveExpression;
            extra.parseAssignmentExpression = parseAssignmentExpression;
            extra.parseBitwiseANDExpression = parseBitwiseANDExpression;
            extra.parseBitwiseORExpression = parseBitwiseORExpression;
            extra.parseBitwiseXORExpression = parseBitwiseXORExpression;
            extra.parseBlock = parseBlock;
            extra.parseFunctionSourceElements = parseFunctionSourceElements;
            extra.parseCatchClause = parseCatchClause;
            extra.parseComputedMember = parseComputedMember;
            extra.parseConditionalExpression = parseConditionalExpression;
            extra.parseConstLetDeclaration = parseConstLetDeclaration;
            extra.parseEqualityExpression = parseEqualityExpression;
            extra.parseExpression = parseExpression;
            extra.parseForVariableDeclaration = parseForVariableDeclaration;
            extra.parseFunctionDeclaration = parseFunctionDeclaration;
            extra.parseFunctionExpression = parseFunctionExpression;
            extra.parseLogicalANDExpression = parseLogicalANDExpression;
            extra.parseLogicalORExpression = parseLogicalORExpression;
            extra.parseMultiplicativeExpression = parseMultiplicativeExpression;
            extra.parseNewExpression = parseNewExpression;
            extra.parseNonComputedProperty = parseNonComputedProperty;
            extra.parseObjectProperty = parseObjectProperty;
            extra.parseObjectPropertyKey = parseObjectPropertyKey;
            extra.parsePostfixExpression = parsePostfixExpression;
            extra.parsePrimaryExpression = parsePrimaryExpression;
            extra.parseProgram = parseProgram;
            extra.parsePropertyFunction = parsePropertyFunction;
            extra.parseRelationalExpression = parseRelationalExpression;
            extra.parseStatement = parseStatement;
            extra.parseShiftExpression = parseShiftExpression;
            extra.parseSwitchCase = parseSwitchCase;
            extra.parseUnaryExpression = parseUnaryExpression;
            extra.parseVariableDeclaration = parseVariableDeclaration;
            extra.parseVariableIdentifier = parseVariableIdentifier;

            parseAdditiveExpression = wrapTracking(extra.parseAdditiveExpression);
            parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
            parseBitwiseANDExpression = wrapTracking(extra.parseBitwiseANDExpression);
            parseBitwiseORExpression = wrapTracking(extra.parseBitwiseORExpression);
            parseBitwiseXORExpression = wrapTracking(extra.parseBitwiseXORExpression);
            parseBlock = wrapTracking(extra.parseBlock);
            parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
            parseCatchClause = wrapTracking(extra.parseCatchClause);
            parseComputedMember = wrapTracking(extra.parseComputedMember);
            parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
            parseConstLetDeclaration = wrapTracking(extra.parseConstLetDeclaration);
            parseEqualityExpression = wrapTracking(extra.parseEqualityExpression);
            parseExpression = wrapTracking(extra.parseExpression);
            parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
            parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
            parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
            parseLeftHandSideExpression = wrapTracking(parseLeftHandSideExpression);
            parseLogicalANDExpression = wrapTracking(extra.parseLogicalANDExpression);
            parseLogicalORExpression = wrapTracking(extra.parseLogicalORExpression);
            parseMultiplicativeExpression = wrapTracking(extra.parseMultiplicativeExpression);
            parseNewExpression = wrapTracking(extra.parseNewExpression);
            parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
            parseObjectProperty = wrapTracking(extra.parseObjectProperty);
            parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
            parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
            parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
            parseProgram = wrapTracking(extra.parseProgram);
            parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
            parseRelationalExpression = wrapTracking(extra.parseRelationalExpression);
            parseStatement = wrapTracking(extra.parseStatement);
            parseShiftExpression = wrapTracking(extra.parseShiftExpression);
            parseSwitchCase = wrapTracking(extra.parseSwitchCase);
            parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
            parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
            parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);
        }

        if (typeof extra.tokens !== 'undefined') {
            extra.advance = advance;
            extra.scanRegExp = scanRegExp;

            advance = collectToken;
            scanRegExp = collectRegex;
        }
    }

    function unpatch() {
        if (typeof extra.skipComment === 'function') {
            skipComment = extra.skipComment;
        }

        if (extra.raw) {
            createLiteral = extra.createLiteral;
        }

        if (extra.range || extra.loc) {
            parseAdditiveExpression = extra.parseAdditiveExpression;
            parseAssignmentExpression = extra.parseAssignmentExpression;
            parseBitwiseANDExpression = extra.parseBitwiseANDExpression;
            parseBitwiseORExpression = extra.parseBitwiseORExpression;
            parseBitwiseXORExpression = extra.parseBitwiseXORExpression;
            parseBlock = extra.parseBlock;
            parseFunctionSourceElements = extra.parseFunctionSourceElements;
            parseCatchClause = extra.parseCatchClause;
            parseComputedMember = extra.parseComputedMember;
            parseConditionalExpression = extra.parseConditionalExpression;
            parseConstLetDeclaration = extra.parseConstLetDeclaration;
            parseEqualityExpression = extra.parseEqualityExpression;
            parseExpression = extra.parseExpression;
            parseForVariableDeclaration = extra.parseForVariableDeclaration;
            parseFunctionDeclaration = extra.parseFunctionDeclaration;
            parseFunctionExpression = extra.parseFunctionExpression;
            parseGroupExpression = extra.parseGroupExpression;
            parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = extra.parseLeftHandSideExpressionAllowCall;
            parseLogicalANDExpression = extra.parseLogicalANDExpression;
            parseLogicalORExpression = extra.parseLogicalORExpression;
            parseMultiplicativeExpression = extra.parseMultiplicativeExpression;
            parseNewExpression = extra.parseNewExpression;
            parseNonComputedProperty = extra.parseNonComputedProperty;
            parseObjectProperty = extra.parseObjectProperty;
            parseObjectPropertyKey = extra.parseObjectPropertyKey;
            parsePrimaryExpression = extra.parsePrimaryExpression;
            parsePostfixExpression = extra.parsePostfixExpression;
            parseProgram = extra.parseProgram;
            parsePropertyFunction = extra.parsePropertyFunction;
            parseRelationalExpression = extra.parseRelationalExpression;
            parseStatement = extra.parseStatement;
            parseShiftExpression = extra.parseShiftExpression;
            parseSwitchCase = extra.parseSwitchCase;
            parseUnaryExpression = extra.parseUnaryExpression;
            parseVariableDeclaration = extra.parseVariableDeclaration;
            parseVariableIdentifier = extra.parseVariableIdentifier;
        }

        if (typeof extra.scanRegExp === 'function') {
            advance = extra.advance;
            scanRegExp = extra.scanRegExp;
        }
    }

    function stringToArray(str) {
        var length = str.length,
            result = [],
            i;
        for (i = 0; i < length; ++i) {
            result[i] = str.charAt(i);
        }
        return result;
    }

    function parse(code, options) {
        var program, toString;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        buffer = null;
        state = {
            allowIn: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false
        };

        extra = {};
        if (typeof options !== 'undefined') {
            extra.range = (typeof options.range === 'boolean') && options.range;
            extra.loc = (typeof options.loc === 'boolean') && options.loc;
            extra.raw = (typeof options.raw === 'boolean') && options.raw;
            if (typeof options.tokens === 'boolean' && options.tokens) {
                extra.tokens = [];
            }
            if (typeof options.comment === 'boolean' && options.comment) {
                extra.comments = [];
            }
            if (typeof options.tolerant === 'boolean' && options.tolerant) {
                extra.errors = [];
            }
        }

        if (length > 0) {
            if (typeof source[0] === 'undefined') {
                // Try first to convert to a string. This is good as fast path
                // for old IE which understands string indexing for string
                // literals only and not for string object.
                if (code instanceof String) {
                    source = code.valueOf();
                }

                // Force accessing the characters via an array.
                if (typeof source[0] === 'undefined') {
                    source = stringToArray(code);
                }
            }
        }

        patch();
        try {
            program = parseProgram();
            if (typeof extra.comments !== 'undefined') {
                filterCommentLocation();
                program.comments = extra.comments;
            }
            if (typeof extra.tokens !== 'undefined') {
                filterTokenLocation();
                program.tokens = extra.tokens;
            }
            if (typeof extra.errors !== 'undefined') {
                program.errors = extra.errors;
            }
            if (extra.range || extra.loc) {
                program.body = filterGroup(program.body);
            }
        } catch (e) {
            throw e;
        } finally {
            unpatch();
            extra = {};
        }

        return program;
    }

    // Sync with package.json.
    exports.version = '1.0.4';

    exports.parse = parse;

    // Deep copy.
    exports.Syntax = (function () {
        var name, types = {};

        if (typeof Object.create === 'function') {
            types = Object.create(null);
        }

        for (name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
                types[name] = Syntax[name];
            }
        }

        if (typeof Object.freeze === 'function') {
            Object.freeze(types);
        }

        return types;
    }());

}));
/* vim: set sw=4 ts=4 et tw=80 : */

},{}],4:[function(require,module,exports){
/*
  Copyright (C) 2012-2013 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*jslint vars:false, bitwise:true*/
/*jshint indent:4*/
/*global exports:true, define:true*/
(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.estraverse = {}));
    }
}(this, function (exports) {
    'use strict';

    var Syntax,
        isArray,
        VisitorOption,
        VisitorKeys,
        BREAK,
        SKIP;

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ClassBody: 'ClassBody',
        ClassDeclaration: 'ClassDeclaration',
        ClassExpression: 'ClassExpression',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DebuggerStatement: 'DebuggerStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        MethodDefinition: 'MethodDefinition',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        ObjectPattern: 'ObjectPattern',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement',
        YieldExpression: 'YieldExpression'
    };

    function ignoreJSHintError() { }

    isArray = Array.isArray;
    if (!isArray) {
        isArray = function isArray(array) {
            return Object.prototype.toString.call(array) === '[object Array]';
        };
    }

    function deepCopy(obj) {
        var ret = {}, key, val;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                val = obj[key];
                if (typeof val === 'object' && val !== null) {
                    ret[key] = deepCopy(val);
                } else {
                    ret[key] = val;
                }
            }
        }
        return ret;
    }

    function shallowCopy(obj) {
        var ret = {}, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    ignoreJSHintError(shallowCopy);

    // based on LLVM libc++ upper_bound / lower_bound
    // MIT License

    function upperBound(array, func) {
        var diff, len, i, current;

        len = array.length;
        i = 0;

        while (len) {
            diff = len >>> 1;
            current = i + diff;
            if (func(array[current])) {
                len = diff;
            } else {
                i = current + 1;
                len -= diff + 1;
            }
        }
        return i;
    }

    function lowerBound(array, func) {
        var diff, len, i, current;

        len = array.length;
        i = 0;

        while (len) {
            diff = len >>> 1;
            current = i + diff;
            if (func(array[current])) {
                i = current + 1;
                len -= diff + 1;
            } else {
                len = diff;
            }
        }
        return i;
    }
    ignoreJSHintError(lowerBound);

    VisitorKeys = {
        AssignmentExpression: ['left', 'right'],
        ArrayExpression: ['elements'],
        ArrayPattern: ['elements'],
        ArrowFunctionExpression: ['params', 'defaults', 'rest', 'body'],
        BlockStatement: ['body'],
        BinaryExpression: ['left', 'right'],
        BreakStatement: ['label'],
        CallExpression: ['callee', 'arguments'],
        CatchClause: ['param', 'body'],
        ClassBody: ['body'],
        ClassDeclaration: ['id', 'body', 'superClass'],
        ClassExpression: ['id', 'body', 'superClass'],
        ConditionalExpression: ['test', 'consequent', 'alternate'],
        ContinueStatement: ['label'],
        DebuggerStatement: [],
        DirectiveStatement: [],
        DoWhileStatement: ['body', 'test'],
        EmptyStatement: [],
        ExpressionStatement: ['expression'],
        ForStatement: ['init', 'test', 'update', 'body'],
        ForInStatement: ['left', 'right', 'body'],
        FunctionDeclaration: ['id', 'params', 'defaults', 'rest', 'body'],
        FunctionExpression: ['id', 'params', 'defaults', 'rest', 'body'],
        Identifier: [],
        IfStatement: ['test', 'consequent', 'alternate'],
        Literal: [],
        LabeledStatement: ['label', 'body'],
        LogicalExpression: ['left', 'right'],
        MemberExpression: ['object', 'property'],
        MethodDefinition: ['key', 'value'],
        NewExpression: ['callee', 'arguments'],
        ObjectExpression: ['properties'],
        ObjectPattern: ['properties'],
        Program: ['body'],
        Property: ['key', 'value'],
        ReturnStatement: ['argument'],
        SequenceExpression: ['expressions'],
        SwitchStatement: ['discriminant', 'cases'],
        SwitchCase: ['test', 'consequent'],
        ThisExpression: [],
        ThrowStatement: ['argument'],
        TryStatement: ['block', 'handlers', 'handler', 'guardedHandlers', 'finalizer'],
        UnaryExpression: ['argument'],
        UpdateExpression: ['argument'],
        VariableDeclaration: ['declarations'],
        VariableDeclarator: ['id', 'init'],
        WhileStatement: ['test', 'body'],
        WithStatement: ['object', 'body'],
        YieldExpression: ['argument']
    };

    // unique id
    BREAK = {};
    SKIP = {};

    VisitorOption = {
        Break: BREAK,
        Skip: SKIP
    };

    function Reference(parent, key) {
        this.parent = parent;
        this.key = key;
    }

    Reference.prototype.replace = function replace(node) {
        this.parent[this.key] = node;
    };

    function Element(node, path, wrap, ref) {
        this.node = node;
        this.path = path;
        this.wrap = wrap;
        this.ref = ref;
    }

    function Controller() { }

    // API:
    // return property path array from root to current node
    Controller.prototype.path = function path() {
        var i, iz, j, jz, result, element;

        function addToPath(result, path) {
            if (isArray(path)) {
                for (j = 0, jz = path.length; j < jz; ++j) {
                    result.push(path[j]);
                }
            } else {
                result.push(path);
            }
        }

        // root node
        if (!this.__current.path) {
            return null;
        }

        // first node is sentinel, second node is root element
        result = [];
        for (i = 2, iz = this.__leavelist.length; i < iz; ++i) {
            element = this.__leavelist[i];
            addToPath(result, element.path);
        }
        addToPath(result, this.__current.path);
        return result;
    };

    // API:
    // return array of parent elements
    Controller.prototype.parents = function parents() {
        var i, iz, result;

        // first node is sentinel
        result = [];
        for (i = 1, iz = this.__leavelist.length; i < iz; ++i) {
            result.push(this.__leavelist[i].node);
        }

        return result;
    };

    // API:
    // return current node
    Controller.prototype.current = function current() {
        return this.__current.node;
    };

    Controller.prototype.__execute = function __execute(callback, element) {
        var previous, result;

        result = undefined;

        previous  = this.__current;
        this.__current = element;
        this.__state = null;
        if (callback) {
            result = callback.call(this, element.node, this.__leavelist[this.__leavelist.length - 1].node);
        }
        this.__current = previous;

        return result;
    };

    // API:
    // notify control skip / break
    Controller.prototype.notify = function notify(flag) {
        this.__state = flag;
    };

    // API:
    // skip child nodes of current node
    Controller.prototype.skip = function () {
        this.notify(SKIP);
    };

    // API:
    // break traversals
    Controller.prototype['break'] = function () {
        this.notify(BREAK);
    };

    Controller.prototype.__initialize = function(root, visitor) {
        this.visitor = visitor;
        this.root = root;
        this.__worklist = [];
        this.__leavelist = [];
        this.__current = null;
        this.__state = null;
    };

    Controller.prototype.traverse = function traverse(root, visitor) {
        var worklist,
            leavelist,
            element,
            node,
            nodeType,
            ret,
            key,
            current,
            current2,
            candidates,
            candidate,
            sentinel;

        this.__initialize(root, visitor);

        sentinel = {};

        // reference
        worklist = this.__worklist;
        leavelist = this.__leavelist;

        // initialize
        worklist.push(new Element(root, null, null, null));
        leavelist.push(new Element(null, null, null, null));

        while (worklist.length) {
            element = worklist.pop();

            if (element === sentinel) {
                element = leavelist.pop();

                ret = this.__execute(visitor.leave, element);

                if (this.__state === BREAK || ret === BREAK) {
                    return;
                }
                continue;
            }

            if (element.node) {

                ret = this.__execute(visitor.enter, element);

                if (this.__state === BREAK || ret === BREAK) {
                    return;
                }

                worklist.push(sentinel);
                leavelist.push(element);

                if (this.__state === SKIP || ret === SKIP) {
                    continue;
                }

                node = element.node;
                nodeType = element.wrap || node.type;
                candidates = VisitorKeys[nodeType];

                current = candidates.length;
                while ((current -= 1) >= 0) {
                    key = candidates[current];
                    candidate = node[key];
                    if (!candidate) {
                        continue;
                    }

                    if (!isArray(candidate)) {
                        worklist.push(new Element(candidate, key, null, null));
                        continue;
                    }

                    current2 = candidate.length;
                    while ((current2 -= 1) >= 0) {
                        if (!candidate[current2]) {
                            continue;
                        }
                        if ((nodeType === Syntax.ObjectExpression || nodeType === Syntax.ObjectPattern) && 'properties' === candidates[current]) {
                            element = new Element(candidate[current2], [key, current2], 'Property', null);
                        } else {
                            element = new Element(candidate[current2], [key, current2], null, null);
                        }
                        worklist.push(element);
                    }
                }
            }
        }
    };

    Controller.prototype.replace = function replace(root, visitor) {
        var worklist,
            leavelist,
            node,
            nodeType,
            target,
            element,
            current,
            current2,
            candidates,
            candidate,
            sentinel,
            outer,
            key;

        this.__initialize(root, visitor);

        sentinel = {};

        // reference
        worklist = this.__worklist;
        leavelist = this.__leavelist;

        // initialize
        outer = {
            root: root
        };
        element = new Element(root, null, null, new Reference(outer, 'root'));
        worklist.push(element);
        leavelist.push(element);

        while (worklist.length) {
            element = worklist.pop();

            if (element === sentinel) {
                element = leavelist.pop();

                target = this.__execute(visitor.leave, element);

                // node may be replaced with null,
                // so distinguish between undefined and null in this place
                if (target !== undefined && target !== BREAK && target !== SKIP) {
                    // replace
                    element.ref.replace(target);
                }

                if (this.__state === BREAK || target === BREAK) {
                    return outer.root;
                }
                continue;
            }

            target = this.__execute(visitor.enter, element);

            // node may be replaced with null,
            // so distinguish between undefined and null in this place
            if (target !== undefined && target !== BREAK && target !== SKIP) {
                // replace
                element.ref.replace(target);
                element.node = target;
            }

            if (this.__state === BREAK || target === BREAK) {
                return outer.root;
            }

            // node may be null
            node = element.node;
            if (!node) {
                continue;
            }

            worklist.push(sentinel);
            leavelist.push(element);

            if (this.__state === SKIP || target === SKIP) {
                continue;
            }

            nodeType = element.wrap || node.type;
            candidates = VisitorKeys[nodeType];

            current = candidates.length;
            while ((current -= 1) >= 0) {
                key = candidates[current];
                candidate = node[key];
                if (!candidate) {
                    continue;
                }

                if (!isArray(candidate)) {
                    worklist.push(new Element(candidate, key, null, new Reference(node, key)));
                    continue;
                }

                current2 = candidate.length;
                while ((current2 -= 1) >= 0) {
                    if (!candidate[current2]) {
                        continue;
                    }
                    if (nodeType === Syntax.ObjectExpression && 'properties' === candidates[current]) {
                        element = new Element(candidate[current2], [key, current2], 'Property', new Reference(candidate, current2));
                    } else {
                        element = new Element(candidate[current2], [key, current2], null, new Reference(candidate, current2));
                    }
                    worklist.push(element);
                }
            }
        }

        return outer.root;
    };

    function traverse(root, visitor) {
        var controller = new Controller();
        return controller.traverse(root, visitor);
    }

    function replace(root, visitor) {
        var controller = new Controller();
        return controller.replace(root, visitor);
    }

    function extendCommentRange(comment, tokens) {
        var target;

        target = upperBound(tokens, function search(token) {
            return token.range[0] > comment.range[0];
        });

        comment.extendedRange = [comment.range[0], comment.range[1]];

        if (target !== tokens.length) {
            comment.extendedRange[1] = tokens[target].range[0];
        }

        target -= 1;
        if (target >= 0) {
            comment.extendedRange[0] = tokens[target].range[1];
        }

        return comment;
    }

    function attachComments(tree, providedComments, tokens) {
        // At first, we should calculate extended comment ranges.
        var comments = [], comment, len, i, cursor;

        if (!tree.range) {
            throw new Error('attachComments needs range information');
        }

        // tokens array is empty, we attach comments to tree as 'leadingComments'
        if (!tokens.length) {
            if (providedComments.length) {
                for (i = 0, len = providedComments.length; i < len; i += 1) {
                    comment = deepCopy(providedComments[i]);
                    comment.extendedRange = [0, tree.range[0]];
                    comments.push(comment);
                }
                tree.leadingComments = comments;
            }
            return tree;
        }

        for (i = 0, len = providedComments.length; i < len; i += 1) {
            comments.push(extendCommentRange(deepCopy(providedComments[i]), tokens));
        }

        // This is based on John Freeman's implementation.
        cursor = 0;
        traverse(tree, {
            enter: function (node) {
                var comment;

                while (cursor < comments.length) {
                    comment = comments[cursor];
                    if (comment.extendedRange[1] > node.range[0]) {
                        break;
                    }

                    if (comment.extendedRange[1] === node.range[0]) {
                        if (!node.leadingComments) {
                            node.leadingComments = [];
                        }
                        node.leadingComments.push(comment);
                        comments.splice(cursor, 1);
                    } else {
                        cursor += 1;
                    }
                }

                // already out of owned node
                if (cursor === comments.length) {
                    return VisitorOption.Break;
                }

                if (comments[cursor].extendedRange[0] > node.range[1]) {
                    return VisitorOption.Skip;
                }
            }
        });

        cursor = 0;
        traverse(tree, {
            leave: function (node) {
                var comment;

                while (cursor < comments.length) {
                    comment = comments[cursor];
                    if (node.range[1] < comment.extendedRange[0]) {
                        break;
                    }

                    if (node.range[1] === comment.extendedRange[0]) {
                        if (!node.trailingComments) {
                            node.trailingComments = [];
                        }
                        node.trailingComments.push(comment);
                        comments.splice(cursor, 1);
                    } else {
                        cursor += 1;
                    }
                }

                // already out of owned node
                if (cursor === comments.length) {
                    return VisitorOption.Break;
                }

                if (comments[cursor].extendedRange[0] > node.range[1]) {
                    return VisitorOption.Skip;
                }
            }
        });

        return tree;
    }

    exports.version = '1.3.3-dev';
    exports.Syntax = Syntax;
    exports.traverse = traverse;
    exports.replace = replace;
    exports.attachComments = attachComments;
    exports.VisitorKeys = VisitorKeys;
    exports.VisitorOption = VisitorOption;
    exports.Controller = Controller;
}));
/* vim: set sw=4 ts=4 et tw=80 : */

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYXp1L0Ryb3Bib3gvd29ya3NwYWNlL25vZGUvdmlzdWFsaXplX2VzdHJhdmVyc2Uvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9henUvRHJvcGJveC93b3Jrc3BhY2Uvbm9kZS92aXN1YWxpemVfZXN0cmF2ZXJzZS9hcHAvYXBwLmpzIiwiL1VzZXJzL2F6dS9Ecm9wYm94L3dvcmtzcGFjZS9ub2RlL3Zpc3VhbGl6ZV9lc3RyYXZlcnNlL2FwcC90cmF2ZXJzZVN0ZXBlci5qcyIsIi9Vc2Vycy9henUvRHJvcGJveC93b3Jrc3BhY2Uvbm9kZS92aXN1YWxpemVfZXN0cmF2ZXJzZS9ub2RlX21vZHVsZXMvZXNwcmltYS9lc3ByaW1hLmpzIiwiL1VzZXJzL2F6dS9Ecm9wYm94L3dvcmtzcGFjZS9ub2RlL3Zpc3VhbGl6ZV9lc3RyYXZlcnNlL25vZGVfbW9kdWxlcy9lc3RyYXZlcnNlL2VzdHJhdmVyc2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcDBIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENyZWF0ZWQgYnkgYXp1IG9uIDIwMTQvMDMvMjMuXG4gKiBMSUNFTlNFIDogTUlUXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIHRleHRBcmVhID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb2RlLWFyZWFcIik7XG52YXIgZWRpdG9yID0gQ29kZU1pcnJvci5mcm9tVGV4dEFyZWEodGV4dEFyZWEsIHtcbiAgICBtb2RlOiBcImphdmFzY3JpcHRcIixcbiAgICB2YWx1ZTogXCJ2YXIgQVNUID0gJ2lzIHRyZWUnXCIsXG4gICAgbGluZU51bWJlcnM6IHRydWVcbn0pO1xuXG52YXIgdHJhdmVyc2VTdGVwZXIgPSByZXF1aXJlKFwiLi90cmF2ZXJzZVN0ZXBlclwiKTtcbmZ1bmN0aW9uIGhpZ2hsaWdodChsb2NzKSB7XG4gICAgaWYgKGxvY3MubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbG9jID0gbG9jcy5wb3AoKTtcbiAgICBzZWxlY3RMb2MobG9jLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaGlnaGxpZ2h0KGxvY3MpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0pXG59XG5mdW5jdGlvbiBzZWxlY3RMb2MobG9jLCBjYWxsYmFjaykge1xuICAgIGVkaXRvci5zZXRTZWxlY3Rpb24oe2xpbmU6IGxvYy5zdGFydC5saW5lIC0gMSwgY2g6IGxvYy5zdGFydC5jb2x1bW59LCB7bGluZTogbG9jLmVuZC5saW5lIC0gMSwgY2g6IGxvYy5lbmQuY29sdW1ufSk7XG4gICAgY2FsbGJhY2soKTtcbn1cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZW50ZXItYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVkaXRpbmdDb2RlID0gZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgdmFyIG5vZGVzID0gdHJhdmVyc2VTdGVwZXIoZWRpdGluZ0NvZGUpO1xuICAgIHZhciBlbnRlckxvY3MgPSBub2Rlcy5lbnRlcjtcbiAgICBoaWdobGlnaHQoZW50ZXJMb2NzLnJldmVyc2UoKSk7XG59KTtcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhdmUtYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVkaXRpbmdDb2RlID0gZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgdmFyIG5vZGVzID0gdHJhdmVyc2VTdGVwZXIoZWRpdGluZ0NvZGUpO1xuICAgIHZhciBsZXZlc0xvYyA9IG5vZGVzLmxlYXZlO1xuICAgIGhpZ2hsaWdodChsZXZlc0xvYy5yZXZlcnNlKCkpO1xufSk7IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGF6dSBvbiAyMDE0LzAzLzIzLlxuICogTElDRU5TRSA6IE1JVFxuICovXG5cInVzZSBzdHJpY3RcIjtcbnZhciBlc3ByaW1hID0gcmVxdWlyZShcImVzcHJpbWFcIik7XG52YXIgZXN0cmF2ZXNlID0gcmVxdWlyZShcImVzdHJhdmVyc2VcIik7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjb2RlKSB7XG4gICAgdmFyIGFzdCA9IGVzcHJpbWEucGFyc2UoY29kZSwge2xvYzogdHJ1ZX0pO1xuICAgIHZhciBlbnRlcnMgPSBbXTtcbiAgICB2YXIgbGVhdmVzID0gW107XG4gICAgZXN0cmF2ZXNlLnRyYXZlcnNlKGFzdCwge1xuICAgICAgICBlbnRlcjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIGVudGVycy5wdXNoKG5vZGUubG9jKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGVhdmU6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBsZWF2ZXMucHVzaChub2RlLmxvYyk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgICBlbnRlcjogZW50ZXJzLFxuICAgICAgICBsZWF2ZTogbGVhdmVzXG4gICAgfTtcbn07IiwiLypcbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgTWF0aGlhcyBCeW5lbnMgPG1hdGhpYXNAcWl3aS5iZT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEpvb3N0LVdpbSBCb2VrZXN0ZWlqbiA8am9vc3Qtd2ltQGJvZWtlc3RlaWpuLm5sPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgS3JpcyBLb3dhbCA8a3Jpcy5rb3dhbEBjaXhhci5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBZdXN1a2UgU3V6dWtpIDx1dGF0YW5lLnRlYUBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBBcnBhZCBCb3Jzb3MgPGFycGFkLmJvcnNvc0Bnb29nbGVtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDExIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuXG4gIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICBtb2RpZmljYXRpb24sIGFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcblxuICAgICogUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4gICAgICBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuXG4gIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4gIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEVcbiAgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0VcbiAgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIDxDT1BZUklHSFQgSE9MREVSPiBCRSBMSUFCTEUgRk9SIEFOWVxuICBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7XG4gIExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORFxuICBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0ZcbiAgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiovXG5cbi8qanNsaW50IGJpdHdpc2U6dHJ1ZSBwbHVzcGx1czp0cnVlICovXG4vKmdsb2JhbCBlc3ByaW1hOnRydWUsIGRlZmluZTp0cnVlLCBleHBvcnRzOnRydWUsIHdpbmRvdzogdHJ1ZSxcbnRocm93RXJyb3I6IHRydWUsIGNyZWF0ZUxpdGVyYWw6IHRydWUsIGdlbmVyYXRlU3RhdGVtZW50OiB0cnVlLFxucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjogdHJ1ZSwgcGFyc2VCbG9jazogdHJ1ZSwgcGFyc2VFeHByZXNzaW9uOiB0cnVlLFxucGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uOiB0cnVlLCBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbjogdHJ1ZSxcbnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50czogdHJ1ZSwgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXI6IHRydWUsXG5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb246IHRydWUsXG5wYXJzZVN0YXRlbWVudDogdHJ1ZSwgcGFyc2VTb3VyY2VFbGVtZW50OiB0cnVlICovXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIFVuaXZlcnNhbCBNb2R1bGUgRGVmaW5pdGlvbiAoVU1EKSB0byBzdXBwb3J0IEFNRCwgQ29tbW9uSlMvTm9kZS5qcyxcbiAgICAvLyBSaGlubywgYW5kIHBsYWluIGJyb3dzZXIgbG9hZGluZy5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmFjdG9yeShleHBvcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5KChyb290LmVzcHJpbWEgPSB7fSkpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgVG9rZW4sXG4gICAgICAgIFRva2VuTmFtZSxcbiAgICAgICAgU3ludGF4LFxuICAgICAgICBQcm9wZXJ0eUtpbmQsXG4gICAgICAgIE1lc3NhZ2VzLFxuICAgICAgICBSZWdleCxcbiAgICAgICAgc291cmNlLFxuICAgICAgICBzdHJpY3QsXG4gICAgICAgIGluZGV4LFxuICAgICAgICBsaW5lTnVtYmVyLFxuICAgICAgICBsaW5lU3RhcnQsXG4gICAgICAgIGxlbmd0aCxcbiAgICAgICAgYnVmZmVyLFxuICAgICAgICBzdGF0ZSxcbiAgICAgICAgZXh0cmE7XG5cbiAgICBUb2tlbiA9IHtcbiAgICAgICAgQm9vbGVhbkxpdGVyYWw6IDEsXG4gICAgICAgIEVPRjogMixcbiAgICAgICAgSWRlbnRpZmllcjogMyxcbiAgICAgICAgS2V5d29yZDogNCxcbiAgICAgICAgTnVsbExpdGVyYWw6IDUsXG4gICAgICAgIE51bWVyaWNMaXRlcmFsOiA2LFxuICAgICAgICBQdW5jdHVhdG9yOiA3LFxuICAgICAgICBTdHJpbmdMaXRlcmFsOiA4XG4gICAgfTtcblxuICAgIFRva2VuTmFtZSA9IHt9O1xuICAgIFRva2VuTmFtZVtUb2tlbi5Cb29sZWFuTGl0ZXJhbF0gPSAnQm9vbGVhbic7XG4gICAgVG9rZW5OYW1lW1Rva2VuLkVPRl0gPSAnPGVuZD4nO1xuICAgIFRva2VuTmFtZVtUb2tlbi5JZGVudGlmaWVyXSA9ICdJZGVudGlmaWVyJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uS2V5d29yZF0gPSAnS2V5d29yZCc7XG4gICAgVG9rZW5OYW1lW1Rva2VuLk51bGxMaXRlcmFsXSA9ICdOdWxsJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uTnVtZXJpY0xpdGVyYWxdID0gJ051bWVyaWMnO1xuICAgIFRva2VuTmFtZVtUb2tlbi5QdW5jdHVhdG9yXSA9ICdQdW5jdHVhdG9yJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uU3RyaW5nTGl0ZXJhbF0gPSAnU3RyaW5nJztcblxuICAgIFN5bnRheCA9IHtcbiAgICAgICAgQXNzaWdubWVudEV4cHJlc3Npb246ICdBc3NpZ25tZW50RXhwcmVzc2lvbicsXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogJ0FycmF5RXhwcmVzc2lvbicsXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiAnQmxvY2tTdGF0ZW1lbnQnLFxuICAgICAgICBCaW5hcnlFeHByZXNzaW9uOiAnQmluYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiAnQnJlYWtTdGF0ZW1lbnQnLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogJ0NhbGxFeHByZXNzaW9uJyxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6ICdDYXRjaENsYXVzZScsXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogJ0NvbmRpdGlvbmFsRXhwcmVzc2lvbicsXG4gICAgICAgIENvbnRpbnVlU3RhdGVtZW50OiAnQ29udGludWVTdGF0ZW1lbnQnLFxuICAgICAgICBEb1doaWxlU3RhdGVtZW50OiAnRG9XaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIERlYnVnZ2VyU3RhdGVtZW50OiAnRGVidWdnZXJTdGF0ZW1lbnQnLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogJ0VtcHR5U3RhdGVtZW50JyxcbiAgICAgICAgRXhwcmVzc2lvblN0YXRlbWVudDogJ0V4cHJlc3Npb25TdGF0ZW1lbnQnLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6ICdGb3JTdGF0ZW1lbnQnLFxuICAgICAgICBGb3JJblN0YXRlbWVudDogJ0ZvckluU3RhdGVtZW50JyxcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgICBGdW5jdGlvbkV4cHJlc3Npb246ICdGdW5jdGlvbkV4cHJlc3Npb24nLFxuICAgICAgICBJZGVudGlmaWVyOiAnSWRlbnRpZmllcicsXG4gICAgICAgIElmU3RhdGVtZW50OiAnSWZTdGF0ZW1lbnQnLFxuICAgICAgICBMaXRlcmFsOiAnTGl0ZXJhbCcsXG4gICAgICAgIExhYmVsZWRTdGF0ZW1lbnQ6ICdMYWJlbGVkU3RhdGVtZW50JyxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246ICdMb2dpY2FsRXhwcmVzc2lvbicsXG4gICAgICAgIE1lbWJlckV4cHJlc3Npb246ICdNZW1iZXJFeHByZXNzaW9uJyxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogJ05ld0V4cHJlc3Npb24nLFxuICAgICAgICBPYmplY3RFeHByZXNzaW9uOiAnT2JqZWN0RXhwcmVzc2lvbicsXG4gICAgICAgIFByb2dyYW06ICdQcm9ncmFtJyxcbiAgICAgICAgUHJvcGVydHk6ICdQcm9wZXJ0eScsXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogJ1JldHVyblN0YXRlbWVudCcsXG4gICAgICAgIFNlcXVlbmNlRXhwcmVzc2lvbjogJ1NlcXVlbmNlRXhwcmVzc2lvbicsXG4gICAgICAgIFN3aXRjaFN0YXRlbWVudDogJ1N3aXRjaFN0YXRlbWVudCcsXG4gICAgICAgIFN3aXRjaENhc2U6ICdTd2l0Y2hDYXNlJyxcbiAgICAgICAgVGhpc0V4cHJlc3Npb246ICdUaGlzRXhwcmVzc2lvbicsXG4gICAgICAgIFRocm93U3RhdGVtZW50OiAnVGhyb3dTdGF0ZW1lbnQnLFxuICAgICAgICBUcnlTdGF0ZW1lbnQ6ICdUcnlTdGF0ZW1lbnQnLFxuICAgICAgICBVbmFyeUV4cHJlc3Npb246ICdVbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnVXBkYXRlRXhwcmVzc2lvbicsXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246ICdWYXJpYWJsZURlY2xhcmF0aW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiAnVmFyaWFibGVEZWNsYXJhdG9yJyxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6ICdXaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6ICdXaXRoU3RhdGVtZW50J1xuICAgIH07XG5cbiAgICBQcm9wZXJ0eUtpbmQgPSB7XG4gICAgICAgIERhdGE6IDEsXG4gICAgICAgIEdldDogMixcbiAgICAgICAgU2V0OiA0XG4gICAgfTtcblxuICAgIC8vIEVycm9yIG1lc3NhZ2VzIHNob3VsZCBiZSBpZGVudGljYWwgdG8gVjguXG4gICAgTWVzc2FnZXMgPSB7XG4gICAgICAgIFVuZXhwZWN0ZWRUb2tlbjogICdVbmV4cGVjdGVkIHRva2VuICUwJyxcbiAgICAgICAgVW5leHBlY3RlZE51bWJlcjogICdVbmV4cGVjdGVkIG51bWJlcicsXG4gICAgICAgIFVuZXhwZWN0ZWRTdHJpbmc6ICAnVW5leHBlY3RlZCBzdHJpbmcnLFxuICAgICAgICBVbmV4cGVjdGVkSWRlbnRpZmllcjogICdVbmV4cGVjdGVkIGlkZW50aWZpZXInLFxuICAgICAgICBVbmV4cGVjdGVkUmVzZXJ2ZWQ6ICAnVW5leHBlY3RlZCByZXNlcnZlZCB3b3JkJyxcbiAgICAgICAgVW5leHBlY3RlZEVPUzogICdVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dCcsXG4gICAgICAgIE5ld2xpbmVBZnRlclRocm93OiAgJ0lsbGVnYWwgbmV3bGluZSBhZnRlciB0aHJvdycsXG4gICAgICAgIEludmFsaWRSZWdFeHA6ICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbicsXG4gICAgICAgIFVudGVybWluYXRlZFJlZ0V4cDogICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbjogbWlzc2luZyAvJyxcbiAgICAgICAgSW52YWxpZExIU0luQXNzaWdubWVudDogICdJbnZhbGlkIGxlZnQtaGFuZCBzaWRlIGluIGFzc2lnbm1lbnQnLFxuICAgICAgICBJbnZhbGlkTEhTSW5Gb3JJbjogICdJbnZhbGlkIGxlZnQtaGFuZCBzaWRlIGluIGZvci1pbicsXG4gICAgICAgIE11bHRpcGxlRGVmYXVsdHNJblN3aXRjaDogJ01vcmUgdGhhbiBvbmUgZGVmYXVsdCBjbGF1c2UgaW4gc3dpdGNoIHN0YXRlbWVudCcsXG4gICAgICAgIE5vQ2F0Y2hPckZpbmFsbHk6ICAnTWlzc2luZyBjYXRjaCBvciBmaW5hbGx5IGFmdGVyIHRyeScsXG4gICAgICAgIFVua25vd25MYWJlbDogJ1VuZGVmaW5lZCBsYWJlbCBcXCclMFxcJycsXG4gICAgICAgIFJlZGVjbGFyYXRpb246ICclMCBcXCclMVxcJyBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkJyxcbiAgICAgICAgSWxsZWdhbENvbnRpbnVlOiAnSWxsZWdhbCBjb250aW51ZSBzdGF0ZW1lbnQnLFxuICAgICAgICBJbGxlZ2FsQnJlYWs6ICdJbGxlZ2FsIGJyZWFrIHN0YXRlbWVudCcsXG4gICAgICAgIElsbGVnYWxSZXR1cm46ICdJbGxlZ2FsIHJldHVybiBzdGF0ZW1lbnQnLFxuICAgICAgICBTdHJpY3RNb2RlV2l0aDogICdTdHJpY3QgbW9kZSBjb2RlIG1heSBub3QgaW5jbHVkZSBhIHdpdGggc3RhdGVtZW50JyxcbiAgICAgICAgU3RyaWN0Q2F0Y2hWYXJpYWJsZTogICdDYXRjaCB2YXJpYWJsZSBtYXkgbm90IGJlIGV2YWwgb3IgYXJndW1lbnRzIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0VmFyTmFtZTogICdWYXJpYWJsZSBuYW1lIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RQYXJhbU5hbWU6ICAnUGFyYW1ldGVyIG5hbWUgZXZhbCBvciBhcmd1bWVudHMgaXMgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RQYXJhbUR1cGU6ICdTdHJpY3QgbW9kZSBmdW5jdGlvbiBtYXkgbm90IGhhdmUgZHVwbGljYXRlIHBhcmFtZXRlciBuYW1lcycsXG4gICAgICAgIFN0cmljdEZ1bmN0aW9uTmFtZTogICdGdW5jdGlvbiBuYW1lIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RPY3RhbExpdGVyYWw6ICAnT2N0YWwgbGl0ZXJhbHMgYXJlIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlLicsXG4gICAgICAgIFN0cmljdERlbGV0ZTogICdEZWxldGUgb2YgYW4gdW5xdWFsaWZpZWQgaWRlbnRpZmllciBpbiBzdHJpY3QgbW9kZS4nLFxuICAgICAgICBTdHJpY3REdXBsaWNhdGVQcm9wZXJ0eTogICdEdXBsaWNhdGUgZGF0YSBwcm9wZXJ0eSBpbiBvYmplY3QgbGl0ZXJhbCBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIEFjY2Vzc29yRGF0YVByb3BlcnR5OiAgJ09iamVjdCBsaXRlcmFsIG1heSBub3QgaGF2ZSBkYXRhIGFuZCBhY2Nlc3NvciBwcm9wZXJ0eSB3aXRoIHRoZSBzYW1lIG5hbWUnLFxuICAgICAgICBBY2Nlc3NvckdldFNldDogICdPYmplY3QgbGl0ZXJhbCBtYXkgbm90IGhhdmUgbXVsdGlwbGUgZ2V0L3NldCBhY2Nlc3NvcnMgd2l0aCB0aGUgc2FtZSBuYW1lJyxcbiAgICAgICAgU3RyaWN0TEhTQXNzaWdubWVudDogICdBc3NpZ25tZW50IHRvIGV2YWwgb3IgYXJndW1lbnRzIGlzIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0TEhTUG9zdGZpeDogICdQb3N0Zml4IGluY3JlbWVudC9kZWNyZW1lbnQgbWF5IG5vdCBoYXZlIGV2YWwgb3IgYXJndW1lbnRzIG9wZXJhbmQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RMSFNQcmVmaXg6ICAnUHJlZml4IGluY3JlbWVudC9kZWNyZW1lbnQgbWF5IG5vdCBoYXZlIGV2YWwgb3IgYXJndW1lbnRzIG9wZXJhbmQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RSZXNlcnZlZFdvcmQ6ICAnVXNlIG9mIGZ1dHVyZSByZXNlcnZlZCB3b3JkIGluIHN0cmljdCBtb2RlJ1xuICAgIH07XG5cbiAgICAvLyBTZWUgYWxzbyB0b29scy9nZW5lcmF0ZS11bmljb2RlLXJlZ2V4LnB5LlxuICAgIFJlZ2V4ID0ge1xuICAgICAgICBOb25Bc2NpaUlkZW50aWZpZXJTdGFydDogbmV3IFJlZ0V4cCgnW1xceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTI3XFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjEtXFx1MDU4N1xcdTA1ZDAtXFx1MDVlYVxcdTA1ZjAtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwOGEwXFx1MDhhMi1cXHUwOGFjXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5NzdcXHUwOTc5LVxcdTA5N2ZcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzM1xcdTBjMzUtXFx1MGMzOVxcdTBjM2RcXHUwYzU4XFx1MGM1OVxcdTBjNjBcXHUwYzYxXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDYwXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjBcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3N1xcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWNcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWMxLVxcdTE5YzdcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTktXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEyZFxcdTIxMmYtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTJlMmZcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDlkLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmRcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmY2NcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5N1xcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTc4ZVxcdWE3OTAtXFx1YTc5M1xcdWE3YTAtXFx1YTdhYVxcdWE3ZjgtXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhODAtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWJjMC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXScpLFxuICAgICAgICBOb25Bc2NpaUlkZW50aWZpZXJQYXJ0OiBuZXcgUmVnRXhwKCdbXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzMDAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDgzLVxcdTA0ODdcXHUwNDhhLVxcdTA1MjdcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDU5MS1cXHUwNWJkXFx1MDViZlxcdTA1YzFcXHUwNWMyXFx1MDVjNFxcdTA1YzVcXHUwNWM3XFx1MDVkMC1cXHUwNWVhXFx1MDVmMC1cXHUwNWYyXFx1MDYxMC1cXHUwNjFhXFx1MDYyMC1cXHUwNjY5XFx1MDY2ZS1cXHUwNmQzXFx1MDZkNS1cXHUwNmRjXFx1MDZkZi1cXHUwNmU4XFx1MDZlYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTAtXFx1MDc0YVxcdTA3NGQtXFx1MDdiMVxcdTA3YzAtXFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MmRcXHUwODQwLVxcdTA4NWJcXHUwOGEwXFx1MDhhMi1cXHUwOGFjXFx1MDhlNC1cXHUwOGZlXFx1MDkwMC1cXHUwOTYzXFx1MDk2Ni1cXHUwOTZmXFx1MDk3MS1cXHUwOTc3XFx1MDk3OS1cXHUwOTdmXFx1MDk4MS1cXHUwOTgzXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliYy1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWNiLVxcdTA5Y2VcXHUwOWQ3XFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTNcXHUwOWU2LVxcdTA5ZjFcXHUwYTAxLVxcdTBhMDNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhM2NcXHUwYTNlLVxcdTBhNDJcXHUwYTQ3XFx1MGE0OFxcdTBhNGItXFx1MGE0ZFxcdTBhNTFcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE2Ni1cXHUwYTc1XFx1MGE4MS1cXHUwYTgzXFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJjLVxcdTBhYzVcXHUwYWM3LVxcdTBhYzlcXHUwYWNiLVxcdTBhY2RcXHUwYWQwXFx1MGFlMC1cXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGIwMS1cXHUwYjAzXFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2MtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NlxcdTBiNTdcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2M1xcdTBiNjYtXFx1MGI2ZlxcdTBiNzFcXHUwYjgyXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQwXFx1MGJkN1xcdTBiZTYtXFx1MGJlZlxcdTBjMDEtXFx1MGMwM1xcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzM1xcdTBjMzUtXFx1MGMzOVxcdTBjM2QtXFx1MGM0NFxcdTBjNDYtXFx1MGM0OFxcdTBjNGEtXFx1MGM0ZFxcdTBjNTVcXHUwYzU2XFx1MGM1OFxcdTBjNTlcXHUwYzYwLVxcdTBjNjNcXHUwYzY2LVxcdTBjNmZcXHUwYzgyXFx1MGM4M1xcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmMtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNkZVxcdTBjZTAtXFx1MGNlM1xcdTBjZTYtXFx1MGNlZlxcdTBjZjFcXHUwY2YyXFx1MGQwMlxcdTBkMDNcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkLVxcdTBkNDRcXHUwZDQ2LVxcdTBkNDhcXHUwZDRhLVxcdTBkNGVcXHUwZDU3XFx1MGQ2MC1cXHUwZDYzXFx1MGQ2Ni1cXHUwZDZmXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4MlxcdTBkODNcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGYyXFx1MGRmM1xcdTBlMDEtXFx1MGUzYVxcdTBlNDAtXFx1MGU0ZVxcdTBlNTAtXFx1MGU1OVxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWI5XFx1MGViYi1cXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlYzgtXFx1MGVjZFxcdTBlZDAtXFx1MGVkOVxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmM2UtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmNzEtXFx1MGY4NFxcdTBmODYtXFx1MGY5N1xcdTBmOTktXFx1MGZiY1xcdTBmYzZcXHUxMDAwLVxcdTEwNDlcXHUxMDUwLVxcdTEwOWRcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM1ZC1cXHUxMzVmXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y0XFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmYwXFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzE0XFx1MTcyMC1cXHUxNzM0XFx1MTc0MC1cXHUxNzUzXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc3MlxcdTE3NzNcXHUxNzgwLVxcdTE3ZDNcXHUxN2Q3XFx1MTdkY1xcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxODIwLVxcdTE4NzdcXHUxODgwLVxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWNcXHUxOTIwLVxcdTE5MmJcXHUxOTMwLVxcdTE5M2JcXHUxOTQ2LVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxOWQwLVxcdTE5ZDlcXHUxYTAwLVxcdTFhMWJcXHUxYTIwLVxcdTFhNWVcXHUxYTYwLVxcdTFhN2NcXHUxYTdmLVxcdTFhODlcXHUxYTkwLVxcdTFhOTlcXHUxYWE3XFx1MWIwMC1cXHUxYjRiXFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWI4MC1cXHUxYmYzXFx1MWMwMC1cXHUxYzM3XFx1MWM0MC1cXHUxYzQ5XFx1MWM0ZC1cXHUxYzdkXFx1MWNkMC1cXHUxY2QyXFx1MWNkNC1cXHUxY2Y2XFx1MWQwMC1cXHUxZGU2XFx1MWRmYy1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwMGNcXHUyMDBkXFx1MjAzZlxcdTIwNDBcXHUyMDU0XFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMGQwLVxcdTIwZGNcXHUyMGUxXFx1MjBlNS1cXHUyMGYwXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOS1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTJkXFx1MjEyZi1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkN2YtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTJkZTAtXFx1MmRmZlxcdTJlMmZcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMmZcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDk5XFx1MzA5YVxcdTMwOWQtXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZFxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZjY1xcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZlxcdWE2NzQtXFx1YTY3ZFxcdWE2N2YtXFx1YTY5N1xcdWE2OWYtXFx1YTZmMVxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTc4ZVxcdWE3OTAtXFx1YTc5M1xcdWE3YTAtXFx1YTdhYVxcdWE3ZjgtXFx1YTgyN1xcdWE4NDAtXFx1YTg3M1xcdWE4ODAtXFx1YThjNFxcdWE4ZDAtXFx1YThkOVxcdWE4ZTAtXFx1YThmN1xcdWE4ZmJcXHVhOTAwLVxcdWE5MmRcXHVhOTMwLVxcdWE5NTNcXHVhOTYwLVxcdWE5N2NcXHVhOTgwLVxcdWE5YzBcXHVhOWNmLVxcdWE5ZDlcXHVhYTAwLVxcdWFhMzZcXHVhYTQwLVxcdWFhNGRcXHVhYTUwLVxcdWFhNTlcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3YlxcdWFhODAtXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlZlxcdWFhZjItXFx1YWFmNlxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiYzAtXFx1YWJlYVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZC1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTAwLVxcdWZlMGZcXHVmZTIwLVxcdWZlMjZcXHVmZTMzXFx1ZmUzNFxcdWZlNGQtXFx1ZmU0ZlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMTAtXFx1ZmYxOVxcdWZmMjEtXFx1ZmYzYVxcdWZmM2ZcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNdJylcbiAgICB9O1xuXG4gICAgLy8gRW5zdXJlIHRoZSBjb25kaXRpb24gaXMgdHJ1ZSwgb3RoZXJ3aXNlIHRocm93IGFuIGVycm9yLlxuICAgIC8vIFRoaXMgaXMgb25seSB0byBoYXZlIGEgYmV0dGVyIGNvbnRyYWN0IHNlbWFudGljLCBpLmUuIGFub3RoZXIgc2FmZXR5IG5ldFxuICAgIC8vIHRvIGNhdGNoIGEgbG9naWMgZXJyb3IuIFRoZSBjb25kaXRpb24gc2hhbGwgYmUgZnVsZmlsbGVkIGluIG5vcm1hbCBjYXNlLlxuICAgIC8vIERvIE5PVCB1c2UgdGhpcyB0byBlbmZvcmNlIGEgY2VydGFpbiBjb25kaXRpb24gb24gYW55IHVzZXIgaW5wdXQuXG5cbiAgICBmdW5jdGlvbiBhc3NlcnQoY29uZGl0aW9uLCBtZXNzYWdlKSB7XG4gICAgICAgIGlmICghY29uZGl0aW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FTU0VSVDogJyArIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2xpY2VTb3VyY2UoZnJvbSwgdG8pIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5zbGljZShmcm9tLCB0byk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiAnZXNwcmltYSdbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHNsaWNlU291cmNlID0gZnVuY3Rpb24gc2xpY2VBcnJheVNvdXJjZShmcm9tLCB0bykge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZS5zbGljZShmcm9tLCB0bykuam9pbignJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEZWNpbWFsRGlnaXQoY2gpIHtcbiAgICAgICAgcmV0dXJuICcwMTIzNDU2Nzg5Jy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzSGV4RGlnaXQoY2gpIHtcbiAgICAgICAgcmV0dXJuICcwMTIzNDU2Nzg5YWJjZGVmQUJDREVGJy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzT2N0YWxEaWdpdChjaCkge1xuICAgICAgICByZXR1cm4gJzAxMjM0NTY3Jy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuXG4gICAgLy8gNy4yIFdoaXRlIFNwYWNlXG5cbiAgICBmdW5jdGlvbiBpc1doaXRlU3BhY2UoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyAnKSB8fCAoY2ggPT09ICdcXHUwMDA5JykgfHwgKGNoID09PSAnXFx1MDAwQicpIHx8XG4gICAgICAgICAgICAoY2ggPT09ICdcXHUwMDBDJykgfHwgKGNoID09PSAnXFx1MDBBMCcpIHx8XG4gICAgICAgICAgICAoY2guY2hhckNvZGVBdCgwKSA+PSAweDE2ODAgJiZcbiAgICAgICAgICAgICAnXFx1MTY4MFxcdTE4MEVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwQVxcdTIwMkZcXHUyMDVGXFx1MzAwMFxcdUZFRkYnLmluZGV4T2YoY2gpID49IDApO1xuICAgIH1cblxuICAgIC8vIDcuMyBMaW5lIFRlcm1pbmF0b3JzXG5cbiAgICBmdW5jdGlvbiBpc0xpbmVUZXJtaW5hdG9yKGNoKSB7XG4gICAgICAgIHJldHVybiAoY2ggPT09ICdcXG4nIHx8IGNoID09PSAnXFxyJyB8fCBjaCA9PT0gJ1xcdTIwMjgnIHx8IGNoID09PSAnXFx1MjAyOScpO1xuICAgIH1cblxuICAgIC8vIDcuNiBJZGVudGlmaWVyIE5hbWVzIGFuZCBJZGVudGlmaWVyc1xuXG4gICAgZnVuY3Rpb24gaXNJZGVudGlmaWVyU3RhcnQoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyQnKSB8fCAoY2ggPT09ICdfJykgfHwgKGNoID09PSAnXFxcXCcpIHx8XG4gICAgICAgICAgICAoY2ggPj0gJ2EnICYmIGNoIDw9ICd6JykgfHwgKGNoID49ICdBJyAmJiBjaCA8PSAnWicpIHx8XG4gICAgICAgICAgICAoKGNoLmNoYXJDb2RlQXQoMCkgPj0gMHg4MCkgJiYgUmVnZXguTm9uQXNjaWlJZGVudGlmaWVyU3RhcnQudGVzdChjaCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzSWRlbnRpZmllclBhcnQoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyQnKSB8fCAoY2ggPT09ICdfJykgfHwgKGNoID09PSAnXFxcXCcpIHx8XG4gICAgICAgICAgICAoY2ggPj0gJ2EnICYmIGNoIDw9ICd6JykgfHwgKGNoID49ICdBJyAmJiBjaCA8PSAnWicpIHx8XG4gICAgICAgICAgICAoKGNoID49ICcwJykgJiYgKGNoIDw9ICc5JykpIHx8XG4gICAgICAgICAgICAoKGNoLmNoYXJDb2RlQXQoMCkgPj0gMHg4MCkgJiYgUmVnZXguTm9uQXNjaWlJZGVudGlmaWVyUGFydC50ZXN0KGNoKSk7XG4gICAgfVxuXG4gICAgLy8gNy42LjEuMiBGdXR1cmUgUmVzZXJ2ZWQgV29yZHNcblxuICAgIGZ1bmN0aW9uIGlzRnV0dXJlUmVzZXJ2ZWRXb3JkKGlkKSB7XG4gICAgICAgIHN3aXRjaCAoaWQpIHtcblxuICAgICAgICAvLyBGdXR1cmUgcmVzZXJ2ZWQgd29yZHMuXG4gICAgICAgIGNhc2UgJ2NsYXNzJzpcbiAgICAgICAgY2FzZSAnZW51bSc6XG4gICAgICAgIGNhc2UgJ2V4cG9ydCc6XG4gICAgICAgIGNhc2UgJ2V4dGVuZHMnOlxuICAgICAgICBjYXNlICdpbXBvcnQnOlxuICAgICAgICBjYXNlICdzdXBlcic6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQoaWQpIHtcbiAgICAgICAgc3dpdGNoIChpZCkge1xuXG4gICAgICAgIC8vIFN0cmljdCBNb2RlIHJlc2VydmVkIHdvcmRzLlxuICAgICAgICBjYXNlICdpbXBsZW1lbnRzJzpcbiAgICAgICAgY2FzZSAnaW50ZXJmYWNlJzpcbiAgICAgICAgY2FzZSAncGFja2FnZSc6XG4gICAgICAgIGNhc2UgJ3ByaXZhdGUnOlxuICAgICAgICBjYXNlICdwcm90ZWN0ZWQnOlxuICAgICAgICBjYXNlICdwdWJsaWMnOlxuICAgICAgICBjYXNlICdzdGF0aWMnOlxuICAgICAgICBjYXNlICd5aWVsZCc6XG4gICAgICAgIGNhc2UgJ2xldCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1Jlc3RyaWN0ZWRXb3JkKGlkKSB7XG4gICAgICAgIHJldHVybiBpZCA9PT0gJ2V2YWwnIHx8IGlkID09PSAnYXJndW1lbnRzJztcbiAgICB9XG5cbiAgICAvLyA3LjYuMS4xIEtleXdvcmRzXG5cbiAgICBmdW5jdGlvbiBpc0tleXdvcmQoaWQpIHtcbiAgICAgICAgdmFyIGtleXdvcmQgPSBmYWxzZTtcbiAgICAgICAgc3dpdGNoIChpZC5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2lmJykgfHwgKGlkID09PSAnaW4nKSB8fCAoaWQgPT09ICdkbycpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICd2YXInKSB8fCAoaWQgPT09ICdmb3InKSB8fCAoaWQgPT09ICduZXcnKSB8fCAoaWQgPT09ICd0cnknKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAndGhpcycpIHx8IChpZCA9PT0gJ2Vsc2UnKSB8fCAoaWQgPT09ICdjYXNlJykgfHwgKGlkID09PSAndm9pZCcpIHx8IChpZCA9PT0gJ3dpdGgnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnd2hpbGUnKSB8fCAoaWQgPT09ICdicmVhaycpIHx8IChpZCA9PT0gJ2NhdGNoJykgfHwgKGlkID09PSAndGhyb3cnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAncmV0dXJuJykgfHwgKGlkID09PSAndHlwZW9mJykgfHwgKGlkID09PSAnZGVsZXRlJykgfHwgKGlkID09PSAnc3dpdGNoJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2RlZmF1bHQnKSB8fCAoaWQgPT09ICdmaW5hbGx5Jyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2Z1bmN0aW9uJykgfHwgKGlkID09PSAnY29udGludWUnKSB8fCAoaWQgPT09ICdkZWJ1Z2dlcicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTA6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnaW5zdGFuY2VvZicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoa2V5d29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKGlkKSB7XG4gICAgICAgIC8vIEZ1dHVyZSByZXNlcnZlZCB3b3Jkcy5cbiAgICAgICAgLy8gJ2NvbnN0JyBpcyBzcGVjaWFsaXplZCBhcyBLZXl3b3JkIGluIFY4LlxuICAgICAgICBjYXNlICdjb25zdCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICAvLyBGb3IgY29tcGF0aWJsaXR5IHRvIFNwaWRlck1vbmtleSBhbmQgRVMubmV4dFxuICAgICAgICBjYXNlICd5aWVsZCc6XG4gICAgICAgIGNhc2UgJ2xldCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKGlkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaXNGdXR1cmVSZXNlcnZlZFdvcmQoaWQpO1xuICAgIH1cblxuICAgIC8vIDcuNCBDb21tZW50c1xuXG4gICAgZnVuY3Rpb24gc2tpcENvbW1lbnQoKSB7XG4gICAgICAgIHZhciBjaCwgYmxvY2tDb21tZW50LCBsaW5lQ29tbWVudDtcblxuICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICAgICAgaWYgKGxpbmVDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGJsb2NrQ29tbWVudCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXHInICYmIHNvdXJjZVtpbmRleCArIDFdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc1doaXRlU3BhY2UoY2gpKSB7XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuSGV4RXNjYXBlKHByZWZpeCkge1xuICAgICAgICB2YXIgaSwgbGVuLCBjaCwgY29kZSA9IDA7XG5cbiAgICAgICAgbGVuID0gKHByZWZpeCA9PT0gJ3UnKSA/IDQgOiAyO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCAmJiBpc0hleERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiAxNiArICcwMTIzNDU2Nzg5YWJjZGVmJy5pbmRleE9mKGNoLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhbklkZW50aWZpZXIoKSB7XG4gICAgICAgIHZhciBjaCwgc3RhcnQsIGlkLCByZXN0b3JlO1xuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gIT09ICd1Jykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICByZXN0b3JlID0gaW5kZXg7XG4gICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgIGlmIChjaCkge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnIHx8ICFpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZCA9IGNoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgaWQgPSAndSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJQYXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIGlmIChzb3VyY2VbaW5kZXhdICE9PSAndScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgICAgICBpZiAoY2gpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgfHwgIWlzSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWQgKz0gY2g7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSByZXN0b3JlO1xuICAgICAgICAgICAgICAgICAgICBpZCArPSAndSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZCArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGVyZSBpcyBubyBrZXl3b3JkIG9yIGxpdGVyYWwgd2l0aCBvbmx5IG9uZSBjaGFyYWN0ZXIuXG4gICAgICAgIC8vIFRodXMsIGl0IG11c3QgYmUgYW4gaWRlbnRpZmllci5cbiAgICAgICAgaWYgKGlkLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0tleXdvcmQoaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLktleXdvcmQsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNy44LjEgTnVsbCBMaXRlcmFsc1xuXG4gICAgICAgIGlmIChpZCA9PT0gJ251bGwnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bGxMaXRlcmFsLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDcuOC4yIEJvb2xlYW4gTGl0ZXJhbHNcblxuICAgICAgICBpZiAoaWQgPT09ICd0cnVlJyB8fCBpZCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5Cb29sZWFuTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWQsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogVG9rZW4uSWRlbnRpZmllcixcbiAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDcuNyBQdW5jdHVhdG9yc1xuXG4gICAgZnVuY3Rpb24gc2NhblB1bmN0dWF0b3IoKSB7XG4gICAgICAgIHZhciBzdGFydCA9IGluZGV4LFxuICAgICAgICAgICAgY2gxID0gc291cmNlW2luZGV4XSxcbiAgICAgICAgICAgIGNoMixcbiAgICAgICAgICAgIGNoMyxcbiAgICAgICAgICAgIGNoNDtcblxuICAgICAgICAvLyBDaGVjayBmb3IgbW9zdCBjb21tb24gc2luZ2xlLWNoYXJhY3RlciBwdW5jdHVhdG9ycy5cblxuICAgICAgICBpZiAoY2gxID09PSAnOycgfHwgY2gxID09PSAneycgfHwgY2gxID09PSAnfScpIHtcbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGNoMSxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICcsJyB8fCBjaDEgPT09ICcoJyB8fCBjaDEgPT09ICcpJykge1xuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogY2gxLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRG90ICguKSBjYW4gYWxzbyBzdGFydCBhIGZsb2F0aW5nLXBvaW50IG51bWJlciwgaGVuY2UgdGhlIG5lZWRcbiAgICAgICAgLy8gdG8gY2hlY2sgdGhlIG5leHQgY2hhcmFjdGVyLlxuXG4gICAgICAgIGNoMiA9IHNvdXJjZVtpbmRleCArIDFdO1xuICAgICAgICBpZiAoY2gxID09PSAnLicgJiYgIWlzRGVjaW1hbERpZ2l0KGNoMikpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogc291cmNlW2luZGV4KytdLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUGVlayBtb3JlIGNoYXJhY3RlcnMuXG5cbiAgICAgICAgY2gzID0gc291cmNlW2luZGV4ICsgMl07XG4gICAgICAgIGNoNCA9IHNvdXJjZVtpbmRleCArIDNdO1xuXG4gICAgICAgIC8vIDQtY2hhcmFjdGVyIHB1bmN0dWF0b3I6ID4+Pj1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPicpIHtcbiAgICAgICAgICAgIGlmIChjaDQgPT09ICc9Jykge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj49JyxcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyAzLWNoYXJhY3RlciBwdW5jdHVhdG9yczogPT09ICE9PSA+Pj4gPDw9ID4+PVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc9JyAmJiBjaDIgPT09ICc9JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJz09PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnIScgJiYgY2gyID09PSAnPScgJiYgY2gzID09PSAnPScpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICchPT0nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJz4nICYmIGNoMiA9PT0gJz4nICYmIGNoMyA9PT0gJz4nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPj4+JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc8JyAmJiBjaDIgPT09ICc8JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJzw8PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPScpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj0nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gMi1jaGFyYWN0ZXIgcHVuY3R1YXRvcnM6IDw9ID49ID09ICE9ICsrIC0tIDw8ID4+ICYmIHx8XG4gICAgICAgIC8vICs9IC09ICo9ICU9ICY9IHw9IF49IC89XG5cbiAgICAgICAgaWYgKGNoMiA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpZiAoJzw+PSErLSolJnxeLycuaW5kZXhPZihjaDEpID49IDApIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjaDEgKyBjaDIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gY2gyICYmICgnKy08PiZ8Jy5pbmRleE9mKGNoMSkgPj0gMCkpIHtcbiAgICAgICAgICAgIGlmICgnKy08PiZ8Jy5pbmRleE9mKGNoMikgPj0gMCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNoMSArIGNoMixcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGUgcmVtYWluaW5nIDEtY2hhcmFjdGVyIHB1bmN0dWF0b3JzLlxuXG4gICAgICAgIGlmICgnW108PistKiUmfF4hfj86PS8nLmluZGV4T2YoY2gxKSA+PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHNvdXJjZVtpbmRleCsrXSxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIDcuOC4zIE51bWVyaWMgTGl0ZXJhbHNcblxuICAgIGZ1bmN0aW9uIHNjYW5OdW1lcmljTGl0ZXJhbCgpIHtcbiAgICAgICAgdmFyIG51bWJlciwgc3RhcnQsIGNoO1xuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KGlzRGVjaW1hbERpZ2l0KGNoKSB8fCAoY2ggPT09ICcuJyksXG4gICAgICAgICAgICAnTnVtZXJpYyBsaXRlcmFsIG11c3Qgc3RhcnQgd2l0aCBhIGRlY2ltYWwgZGlnaXQgb3IgYSBkZWNpbWFsIHBvaW50Jyk7XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgbnVtYmVyID0gJyc7XG4gICAgICAgIGlmIChjaCAhPT0gJy4nKSB7XG4gICAgICAgICAgICBudW1iZXIgPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgICAgIC8vIEhleCBudW1iZXIgc3RhcnRzIHdpdGggJzB4Jy5cbiAgICAgICAgICAgIC8vIE9jdGFsIG51bWJlciBzdGFydHMgd2l0aCAnMCcuXG4gICAgICAgICAgICBpZiAobnVtYmVyID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICd4JyB8fCBjaCA9PT0gJ1gnKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0hleERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChudW1iZXIubGVuZ3RoIDw9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgMHhcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uTnVtZXJpY0xpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VJbnQobnVtYmVyLCAxNiksXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChjaCkgfHwgaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUludChudW1iZXIsIDgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2N0YWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBkZWNpbWFsIG51bWJlciBzdGFydHMgd2l0aCAnMCcgc3VjaCBhcyAnMDknIGlzIGlsbGVnYWwuXG4gICAgICAgICAgICAgICAgaWYgKGlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKCFpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2ggPT09ICcuJykge1xuICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gJ2UnIHx8IGNoID09PSAnRScpIHtcbiAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChjaCA9PT0gJysnIHx8IGNoID09PSAnLScpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNoID0gJ2NoYXJhY3RlciAnICsgY2g7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjaCA9ICc8ZW5kPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiBwYXJzZUZsb2F0KG51bWJlciksXG4gICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyA3LjguNCBTdHJpbmcgTGl0ZXJhbHNcblxuICAgIGZ1bmN0aW9uIHNjYW5TdHJpbmdMaXRlcmFsKCkge1xuICAgICAgICB2YXIgc3RyID0gJycsIHF1b3RlLCBzdGFydCwgY2gsIGNvZGUsIHVuZXNjYXBlZCwgcmVzdG9yZSwgb2N0YWwgPSBmYWxzZTtcblxuICAgICAgICBxdW90ZSA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgIGFzc2VydCgocXVvdGUgPT09ICdcXCcnIHx8IHF1b3RlID09PSAnXCInKSxcbiAgICAgICAgICAgICdTdHJpbmcgbGl0ZXJhbCBtdXN0IHN0YXJ0cyB3aXRoIGEgcXVvdGUnKTtcblxuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICArK2luZGV4O1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgICAgIGlmIChjaCA9PT0gcXVvdGUpIHtcbiAgICAgICAgICAgICAgICBxdW90ZSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgaWYgKCFpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXHInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3UnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuZXNjYXBlZCA9IHNjYW5IZXhFc2NhcGUoY2gpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVuZXNjYXBlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSB1bmVzY2FwZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcYic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcZic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xceDBCJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUgPSAnMDEyMzQ1NjcnLmluZGV4T2YoY2gpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXFwwIGlzIG5vdCBvY3RhbCBlc2NhcGUgc2VxdWVuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvY3RhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoICYmIGlzT2N0YWxEaWdpdChzb3VyY2VbaW5kZXhdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvY3RhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUgPSBjb2RlICogOCArICcwMTIzNDU2NycuaW5kZXhPZihzb3VyY2VbaW5kZXgrK10pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDMgZGlnaXRzIGFyZSBvbmx5IGFsbG93ZWQgd2hlbiBzdHJpbmcgc3RhcnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdpdGggMCwgMSwgMiwgM1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJzAxMjMnLmluZGV4T2YoY2gpID49IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA8IGxlbmd0aCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzT2N0YWxEaWdpdChzb3VyY2VbaW5kZXhdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiA4ICsgJzAxMjM0NTY3Jy5pbmRleE9mKHNvdXJjZVtpbmRleCsrXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1b3RlICE9PSAnJykge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFRva2VuLlN0cmluZ0xpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogc3RyLFxuICAgICAgICAgICAgb2N0YWw6IG9jdGFsLFxuICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhblJlZ0V4cCgpIHtcbiAgICAgICAgdmFyIHN0ciwgY2gsIHN0YXJ0LCBwYXR0ZXJuLCBmbGFncywgdmFsdWUsIGNsYXNzTWFya2VyID0gZmFsc2UsIHJlc3RvcmUsIHRlcm1pbmF0ZWQgPSBmYWxzZTtcblxuICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KGNoID09PSAnLycsICdSZWd1bGFyIGV4cHJlc3Npb24gbGl0ZXJhbCBtdXN0IHN0YXJ0IHdpdGggYSBzbGFzaCcpO1xuICAgICAgICBzdHIgPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgLy8gRUNNQS0yNjIgNy44LjVcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW50ZXJtaW5hdGVkUmVnRXhwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGFzc01hcmtlcikge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTWFya2VyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtaW5hdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ1snKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTWFya2VyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVudGVybWluYXRlZFJlZ0V4cCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0ZXJtaW5hdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbnRlcm1pbmF0ZWRSZWdFeHApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhjbHVkZSBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaC5cbiAgICAgICAgcGF0dGVybiA9IHN0ci5zdWJzdHIoMSwgc3RyLmxlbmd0aCAtIDIpO1xuXG4gICAgICAgIGZsYWdzID0gJyc7XG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJQYXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgJiYgaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAndScpIHtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgcmVzdG9yZSA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmbGFncyArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxcXHUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICg7IHJlc3RvcmUgPCBpbmRleDsgKytyZXN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IHNvdXJjZVtyZXN0b3JlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzICs9ICd1JztcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxcXHUnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXFxcJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZsYWdzICs9IGNoO1xuICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ldyBSZWdFeHAocGF0dGVybiwgZmxhZ3MpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkUmVnRXhwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBsaXRlcmFsOiBzdHIsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0lkZW50aWZpZXJOYW1lKHRva2VuKSB7XG4gICAgICAgIHJldHVybiB0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyIHx8XG4gICAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkIHx8XG4gICAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbi5Cb29sZWFuTGl0ZXJhbCB8fFxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW4uTnVsbExpdGVyYWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWR2YW5jZSgpIHtcbiAgICAgICAgdmFyIGNoLCB0b2tlbjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uRU9GLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtpbmRleCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBzY2FuUHVuY3R1YXRvcigpO1xuICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgIGlmIChjaCA9PT0gJ1xcJycgfHwgY2ggPT09ICdcIicpIHtcbiAgICAgICAgICAgIHJldHVybiBzY2FuU3RyaW5nTGl0ZXJhbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoID09PSAnLicgfHwgaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICByZXR1cm4gc2Nhbk51bWVyaWNMaXRlcmFsKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IHNjYW5JZGVudGlmaWVyKCk7XG4gICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGV4KCkge1xuICAgICAgICB2YXIgdG9rZW47XG5cbiAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgICAgaW5kZXggPSBidWZmZXIucmFuZ2VbMV07XG4gICAgICAgICAgICBsaW5lTnVtYmVyID0gYnVmZmVyLmxpbmVOdW1iZXI7XG4gICAgICAgICAgICBsaW5lU3RhcnQgPSBidWZmZXIubGluZVN0YXJ0O1xuICAgICAgICAgICAgdG9rZW4gPSBidWZmZXI7XG4gICAgICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIGFkdmFuY2UoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb29rYWhlYWQoKSB7XG4gICAgICAgIHZhciBwb3MsIGxpbmUsIHN0YXJ0O1xuXG4gICAgICAgIGlmIChidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgICAgIH1cblxuICAgICAgICBwb3MgPSBpbmRleDtcbiAgICAgICAgbGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgIHN0YXJ0ID0gbGluZVN0YXJ0O1xuICAgICAgICBidWZmZXIgPSBhZHZhbmNlKCk7XG4gICAgICAgIGluZGV4ID0gcG9zO1xuICAgICAgICBsaW5lTnVtYmVyID0gbGluZTtcbiAgICAgICAgbGluZVN0YXJ0ID0gc3RhcnQ7XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGVyZSBpcyBhIGxpbmUgdGVybWluYXRvciBiZWZvcmUgdGhlIG5leHQgdG9rZW4uXG5cbiAgICBmdW5jdGlvbiBwZWVrTGluZVRlcm1pbmF0b3IoKSB7XG4gICAgICAgIHZhciBwb3MsIGxpbmUsIHN0YXJ0LCBmb3VuZDtcblxuICAgICAgICBwb3MgPSBpbmRleDtcbiAgICAgICAgbGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgIHN0YXJ0ID0gbGluZVN0YXJ0O1xuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBmb3VuZCA9IGxpbmVOdW1iZXIgIT09IGxpbmU7XG4gICAgICAgIGluZGV4ID0gcG9zO1xuICAgICAgICBsaW5lTnVtYmVyID0gbGluZTtcbiAgICAgICAgbGluZVN0YXJ0ID0gc3RhcnQ7XG5cbiAgICAgICAgcmV0dXJuIGZvdW5kO1xuICAgIH1cblxuICAgIC8vIFRocm93IGFuIGV4Y2VwdGlvblxuXG4gICAgZnVuY3Rpb24gdGhyb3dFcnJvcih0b2tlbiwgbWVzc2FnZUZvcm1hdCkge1xuICAgICAgICB2YXIgZXJyb3IsXG4gICAgICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSxcbiAgICAgICAgICAgIG1zZyA9IG1lc3NhZ2VGb3JtYXQucmVwbGFjZShcbiAgICAgICAgICAgICAgICAvJShcXGQpL2csXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHdob2xlLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1tpbmRleF0gfHwgJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBpZiAodHlwZW9mIHRva2VuLmxpbmVOdW1iZXIgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcignTGluZSAnICsgdG9rZW4ubGluZU51bWJlciArICc6ICcgKyBtc2cpO1xuICAgICAgICAgICAgZXJyb3IuaW5kZXggPSB0b2tlbi5yYW5nZVswXTtcbiAgICAgICAgICAgIGVycm9yLmxpbmVOdW1iZXIgPSB0b2tlbi5saW5lTnVtYmVyO1xuICAgICAgICAgICAgZXJyb3IuY29sdW1uID0gdG9rZW4ucmFuZ2VbMF0gLSBsaW5lU3RhcnQgKyAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJ0xpbmUgJyArIGxpbmVOdW1iZXIgKyAnOiAnICsgbXNnKTtcbiAgICAgICAgICAgIGVycm9yLmluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICBlcnJvci5saW5lTnVtYmVyID0gbGluZU51bWJlcjtcbiAgICAgICAgICAgIGVycm9yLmNvbHVtbiA9IGluZGV4IC0gbGluZVN0YXJ0ICsgMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRocm93RXJyb3JUb2xlcmFudCgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRocm93RXJyb3IuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLmVycm9ycykge1xuICAgICAgICAgICAgICAgIGV4dHJhLmVycm9ycy5wdXNoKGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvLyBUaHJvdyBhbiBleGNlcHRpb24gYmVjYXVzZSBvZiB0aGUgdG9rZW4uXG5cbiAgICBmdW5jdGlvbiB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pIHtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZEVPUyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uTnVtZXJpY0xpdGVyYWwpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWROdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRTdHJpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRJZGVudGlmaWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICBpZiAoaXNGdXR1cmVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFJlc2VydmVkKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RyaWN0ICYmIGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdFJlc2VydmVkV29yZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCB0b2tlbi52YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCb29sZWFuTGl0ZXJhbCwgTnVsbExpdGVyYWwsIG9yIFB1bmN0dWF0b3IuXG4gICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgdG9rZW4udmFsdWUpO1xuICAgIH1cblxuICAgIC8vIEV4cGVjdCB0aGUgbmV4dCB0b2tlbiB0byBtYXRjaCB0aGUgc3BlY2lmaWVkIHB1bmN0dWF0b3IuXG4gICAgLy8gSWYgbm90LCBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uXG5cbiAgICBmdW5jdGlvbiBleHBlY3QodmFsdWUpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yIHx8IHRva2VuLnZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEV4cGVjdCB0aGUgbmV4dCB0b2tlbiB0byBtYXRjaCB0aGUgc3BlY2lmaWVkIGtleXdvcmQuXG4gICAgLy8gSWYgbm90LCBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uXG5cbiAgICBmdW5jdGlvbiBleHBlY3RLZXl3b3JkKGtleXdvcmQpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5LZXl3b3JkIHx8IHRva2VuLnZhbHVlICE9PSBrZXl3b3JkKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlIG5leHQgdG9rZW4gbWF0Y2hlcyB0aGUgc3BlY2lmaWVkIHB1bmN0dWF0b3IuXG5cbiAgICBmdW5jdGlvbiBtYXRjaCh2YWx1ZSkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgcmV0dXJuIHRva2VuLnR5cGUgPT09IFRva2VuLlB1bmN0dWF0b3IgJiYgdG9rZW4udmFsdWUgPT09IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIG1hdGNoZXMgdGhlIHNwZWNpZmllZCBrZXl3b3JkXG5cbiAgICBmdW5jdGlvbiBtYXRjaEtleXdvcmQoa2V5d29yZCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgcmV0dXJuIHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQgJiYgdG9rZW4udmFsdWUgPT09IGtleXdvcmQ7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlIG5leHQgdG9rZW4gaXMgYW4gYXNzaWdubWVudCBvcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gbWF0Y2hBc3NpZ24oKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpLFxuICAgICAgICAgICAgb3AgPSB0b2tlbi52YWx1ZTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcCA9PT0gJz0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJyo9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcvPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnJT0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJys9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICctPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnPDw9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICc+Pj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJz4+Pj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJyY9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICdePScgfHxcbiAgICAgICAgICAgIG9wID09PSAnfD0nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbnN1bWVTZW1pY29sb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgbGluZTtcblxuICAgICAgICAvLyBDYXRjaCB0aGUgdmVyeSBjb21tb24gY2FzZSBmaXJzdC5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICc7Jykge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsaW5lID0gbGluZU51bWJlcjtcbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgaWYgKGxpbmVOdW1iZXIgIT09IGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YgJiYgIW1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiBwcm92aWRlZCBleHByZXNzaW9uIGlzIExlZnRIYW5kU2lkZUV4cHJlc3Npb25cblxuICAgIGZ1bmN0aW9uIGlzTGVmdEhhbmRTaWRlKGV4cHIpIHtcbiAgICAgICAgcmV0dXJuIGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIgfHwgZXhwci50eXBlID09PSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjtcbiAgICB9XG5cbiAgICAvLyAxMS4xLjQgQXJyYXkgSW5pdGlhbGlzZXJcblxuICAgIGZ1bmN0aW9uIHBhcnNlQXJyYXlJbml0aWFsaXNlcigpIHtcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gW107XG5cbiAgICAgICAgZXhwZWN0KCdbJyk7XG5cbiAgICAgICAgd2hpbGUgKCFtYXRjaCgnXScpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJywnKSkge1xuICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2gobnVsbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2gocGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKTtcblxuICAgICAgICAgICAgICAgIGlmICghbWF0Y2goJ10nKSkge1xuICAgICAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJ10nKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkFycmF5RXhwcmVzc2lvbixcbiAgICAgICAgICAgIGVsZW1lbnRzOiBlbGVtZW50c1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDExLjEuNSBPYmplY3QgSW5pdGlhbGlzZXJcblxuICAgIGZ1bmN0aW9uIHBhcnNlUHJvcGVydHlGdW5jdGlvbihwYXJhbSwgZmlyc3QpIHtcbiAgICAgICAgdmFyIHByZXZpb3VzU3RyaWN0LCBib2R5O1xuXG4gICAgICAgIHByZXZpb3VzU3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBib2R5ID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCk7XG4gICAgICAgIGlmIChmaXJzdCAmJiBzdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChwYXJhbVswXS5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KGZpcnN0LCBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHN0cmljdCA9IHByZXZpb3VzU3RyaWN0O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRnVuY3Rpb25FeHByZXNzaW9uLFxuICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtLFxuICAgICAgICAgICAgZGVmYXVsdHM6IFtdLFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIHJlc3Q6IG51bGwsXG4gICAgICAgICAgICBnZW5lcmF0b3I6IGZhbHNlLFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcblxuICAgICAgICAvLyBOb3RlOiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmx5IGZyb20gcGFyc2VPYmplY3RQcm9wZXJ0eSgpLCB3aGVyZVxuICAgICAgICAvLyBFT0YgYW5kIFB1bmN0dWF0b3IgdG9rZW5zIGFyZSBhbHJlYWR5IGZpbHRlcmVkIG91dC5cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCB8fCB0b2tlbi50eXBlID09PSBUb2tlbi5OdW1lcmljTGl0ZXJhbCkge1xuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VPYmplY3RQcm9wZXJ0eSgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBrZXksIGlkLCBwYXJhbTtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG5cbiAgICAgICAgICAgIGlkID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuXG4gICAgICAgICAgICAvLyBQcm9wZXJ0eSBBc3NpZ25tZW50OiBHZXR0ZXIgYW5kIFNldHRlci5cblxuICAgICAgICAgICAgaWYgKHRva2VuLnZhbHVlID09PSAnZ2V0JyAmJiAhbWF0Y2goJzonKSkge1xuICAgICAgICAgICAgICAgIGtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoJygnKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoJyknKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKFtdKSxcbiAgICAgICAgICAgICAgICAgICAga2luZDogJ2dldCdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0b2tlbi52YWx1ZSA9PT0gJ3NldCcgJiYgIW1hdGNoKCc6JykpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcoJyk7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgICAgICBleHBlY3QoJyknKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sIHRva2VuLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlUHJvcGVydHlGdW5jdGlvbihbXSksXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiAnc2V0J1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtID0gWyBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpIF07XG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCgnKScpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKHBhcmFtLCB0b2tlbiksXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiAnc2V0J1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCc6Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICBrZXk6IGlkLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgICAgICAgICBraW5kOiAnaW5pdCdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLkVPRiB8fCB0b2tlbi50eXBlID09PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuICAgICAgICAgICAgZXhwZWN0KCc6Jyk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgICAgIGtpbmQ6ICdpbml0J1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlT2JqZWN0SW5pdGlhbGlzZXIoKSB7XG4gICAgICAgIHZhciBwcm9wZXJ0aWVzID0gW10sIHByb3BlcnR5LCBuYW1lLCBraW5kLCBtYXAgPSB7fSwgdG9TdHJpbmcgPSBTdHJpbmc7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgd2hpbGUgKCFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICBwcm9wZXJ0eSA9IHBhcnNlT2JqZWN0UHJvcGVydHkoKTtcblxuICAgICAgICAgICAgaWYgKHByb3BlcnR5LmtleS50eXBlID09PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBwcm9wZXJ0eS5rZXkubmFtZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IHRvU3RyaW5nKHByb3BlcnR5LmtleS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBraW5kID0gKHByb3BlcnR5LmtpbmQgPT09ICdpbml0JykgPyBQcm9wZXJ0eUtpbmQuRGF0YSA6IChwcm9wZXJ0eS5raW5kID09PSAnZ2V0JykgPyBQcm9wZXJ0eUtpbmQuR2V0IDogUHJvcGVydHlLaW5kLlNldDtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobWFwLCBuYW1lKSkge1xuICAgICAgICAgICAgICAgIGlmIChtYXBbbmFtZV0gPT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdHJpY3QgJiYga2luZCA9PT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0RHVwbGljYXRlUHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtpbmQgIT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLkFjY2Vzc29yRGF0YVByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChraW5kID09PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5BY2Nlc3NvckRhdGFQcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWFwW25hbWVdICYga2luZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5BY2Nlc3NvckdldFNldCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWFwW25hbWVdIHw9IGtpbmQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1hcFtuYW1lXSA9IGtpbmQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByb3BlcnRpZXMucHVzaChwcm9wZXJ0eSk7XG5cbiAgICAgICAgICAgIGlmICghbWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnLCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5PYmplY3RFeHByZXNzaW9uLFxuICAgICAgICAgICAgcHJvcGVydGllczogcHJvcGVydGllc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDExLjEuNiBUaGUgR3JvdXBpbmcgT3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIHBhcnNlR3JvdXBFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG5cbiAgICAvLyAxMS4xIFByaW1hcnkgRXhwcmVzc2lvbnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpLFxuICAgICAgICAgICAgdHlwZSA9IHRva2VuLnR5cGU7XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgbmFtZTogbGV4KCkudmFsdWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCB8fCB0eXBlID09PSBUb2tlbi5OdW1lcmljTGl0ZXJhbCkge1xuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKGxleCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCd0aGlzJykpIHtcbiAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVGhpc0V4cHJlc3Npb25cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uQm9vbGVhbkxpdGVyYWwpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgdG9rZW4udmFsdWUgPSAodG9rZW4udmFsdWUgPT09ICd0cnVlJyk7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uTnVsbExpdGVyYWwpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgdG9rZW4udmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUFycmF5SW5pdGlhbGlzZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgneycpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VPYmplY3RJbml0aWFsaXNlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUdyb3VwRXhwcmVzc2lvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcvJykgfHwgbWF0Y2goJy89JykpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHNjYW5SZWdFeHAoKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhyb3dVbmV4cGVjdGVkKGxleCgpKTtcbiAgICB9XG5cbiAgICAvLyAxMS4yIExlZnQtSGFuZC1TaWRlIEV4cHJlc3Npb25zXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFyZ3VtZW50cygpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaChwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCkpO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHJldHVybiBhcmdzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG5cbiAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJOYW1lKHRva2VuKSkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VOb25Db21wdXRlZE1lbWJlcigpIHtcbiAgICAgICAgZXhwZWN0KCcuJyk7XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlQ29tcHV0ZWRNZW1iZXIoKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cGVjdCgnWycpO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJ10nKTtcblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU5ld0V4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ25ldycpO1xuXG4gICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcbiAgICAgICAgICAgIGNhbGxlZTogcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAnYXJndW1lbnRzJzogW11cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAobWF0Y2goJygnKSkge1xuICAgICAgICAgICAgZXhwclsnYXJndW1lbnRzJ10gPSBwYXJzZUFyZ3VtZW50cygpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHByID0gbWF0Y2hLZXl3b3JkKCduZXcnKSA/IHBhcnNlTmV3RXhwcmVzc2lvbigpIDogcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnLicpIHx8IG1hdGNoKCdbJykgfHwgbWF0Y2goJygnKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNhbGxlZTogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgJ2FyZ3VtZW50cyc6IHBhcnNlQXJndW1lbnRzKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cHIgPSBtYXRjaEtleXdvcmQoJ25ldycpID8gcGFyc2VOZXdFeHByZXNzaW9uKCkgOiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcuJykgfHwgbWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4zIFBvc3RmaXggRXhwcmVzc2lvbnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCksIHRva2VuO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgobWF0Y2goJysrJykgfHwgbWF0Y2goJy0tJykpICYmICFwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgLy8gMTEuMy4xLCAxMS4zLjJcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdExIU1Bvc3RmaXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShleHByKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVwZGF0ZUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBleHByLFxuICAgICAgICAgICAgICAgIHByZWZpeDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS40IFVuYXJ5IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VVbmFyeUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgZXhwcjtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvciAmJiB0b2tlbi50eXBlICE9PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcrKycpIHx8IG1hdGNoKCctLScpKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHBhcnNlVW5hcnlFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAvLyAxMS40LjQsIDExLjQuNVxuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyICYmIGlzUmVzdHJpY3RlZFdvcmQoZXhwci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0TEhTUHJlZml4KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShleHByKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVwZGF0ZUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IHRva2VuLnZhbHVlLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBleHByLFxuICAgICAgICAgICAgICAgIHByZWZpeDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcrJykgfHwgbWF0Y2goJy0nKSB8fCBtYXRjaCgnficpIHx8IG1hdGNoKCchJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVuYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IHBhcnNlVW5hcnlFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAgICAgcHJlZml4OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdkZWxldGUnKSB8fCBtYXRjaEtleXdvcmQoJ3ZvaWQnKSB8fCBtYXRjaEtleXdvcmQoJ3R5cGVvZicpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5VbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgICAgIHByZWZpeDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci5vcGVyYXRvciA9PT0gJ2RlbGV0ZScgJiYgZXhwci5hcmd1bWVudC50eXBlID09PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0RGVsZXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24oKTtcbiAgICB9XG5cbiAgICAvLyAxMS41IE11bHRpcGxpY2F0aXZlIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VVbmFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJyonKSB8fCBtYXRjaCgnLycpIHx8IG1hdGNoKCclJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlVW5hcnlFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS42IEFkZGl0aXZlIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJysnKSB8fCBtYXRjaCgnLScpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuNyBCaXR3aXNlIFNoaWZ0IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VTaGlmdEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJzw8JykgfHwgbWF0Y2goJz4+JykgfHwgbWF0Y2goJz4+PicpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuICAgIC8vIDExLjggUmVsYXRpb25hbCBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByLCBwcmV2aW91c0FsbG93SW47XG5cbiAgICAgICAgcHJldmlvdXNBbGxvd0luID0gc3RhdGUuYWxsb3dJbjtcbiAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHRydWU7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlU2hpZnRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCc8JykgfHwgbWF0Y2goJz4nKSB8fCBtYXRjaCgnPD0nKSB8fCBtYXRjaCgnPj0nKSB8fCAocHJldmlvdXNBbGxvd0luICYmIG1hdGNoS2V5d29yZCgnaW4nKSkgfHwgbWF0Y2hLZXl3b3JkKCdpbnN0YW5jZW9mJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlU2hpZnRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5hbGxvd0luID0gcHJldmlvdXNBbGxvd0luO1xuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS45IEVxdWFsaXR5IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnPT0nKSB8fCBtYXRjaCgnIT0nKSB8fCBtYXRjaCgnPT09JykgfHwgbWF0Y2goJyE9PScpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMCBCaW5hcnkgQml0d2lzZSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJyYnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnJicsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnXicpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICdeJyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnfCcpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICd8JyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMSBCaW5hcnkgTG9naWNhbCBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcmJicpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnJiYnLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJ3x8JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTG9naWNhbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICd8fCcsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTIgQ29uZGl0aW9uYWwgT3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciwgcHJldmlvdXNBbGxvd0luLCBjb25zZXF1ZW50O1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24oKTtcblxuICAgICAgICBpZiAobWF0Y2goJz8nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBwcmV2aW91c0FsbG93SW4gPSBzdGF0ZS5hbGxvd0luO1xuICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHRydWU7XG4gICAgICAgICAgICBjb25zZXF1ZW50ID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHByZXZpb3VzQWxsb3dJbjtcbiAgICAgICAgICAgIGV4cGVjdCgnOicpO1xuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgdGVzdDogZXhwcixcbiAgICAgICAgICAgICAgICBjb25zZXF1ZW50OiBjb25zZXF1ZW50LFxuICAgICAgICAgICAgICAgIGFsdGVybmF0ZTogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTMgQXNzaWdubWVudCBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgZXhwcjtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBleHByID0gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24oKTtcblxuICAgICAgICBpZiAobWF0Y2hBc3NpZ24oKSkge1xuICAgICAgICAgICAgLy8gTGVmdEhhbmRTaWRlRXhwcmVzc2lvblxuICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShleHByKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDExLjEzLjFcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdExIU0Fzc2lnbm1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTQgQ29tbWEgT3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlNlcXVlbmNlRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uczogWyBleHByIF1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghbWF0Y2goJywnKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgZXhwci5leHByZXNzaW9ucy5wdXNoKHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMi4xIEJsb2NrXG5cbiAgICBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudExpc3QoKSB7XG4gICAgICAgIHZhciBsaXN0ID0gW10sXG4gICAgICAgICAgICBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXRlbWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpc3QucHVzaChzdGF0ZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VCbG9jaygpIHtcbiAgICAgICAgdmFyIGJsb2NrO1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIGJsb2NrID0gcGFyc2VTdGF0ZW1lbnRMaXN0KCk7XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CbG9ja1N0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IGJsb2NrXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMiBWYXJpYWJsZSBTdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKGtpbmQpIHtcbiAgICAgICAgdmFyIGlkID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKSxcbiAgICAgICAgICAgIGluaXQgPSBudWxsO1xuXG4gICAgICAgIC8vIDEyLjIuMVxuICAgICAgICBpZiAoc3RyaWN0ICYmIGlzUmVzdHJpY3RlZFdvcmQoaWQubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0VmFyTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoa2luZCA9PT0gJ2NvbnN0Jykge1xuICAgICAgICAgICAgZXhwZWN0KCc9Jyk7XG4gICAgICAgICAgICBpbml0ID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCc9JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgaW5pdCA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yLFxuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgaW5pdDogaW5pdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qoa2luZCkge1xuICAgICAgICB2YXIgbGlzdCA9IFtdO1xuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGxpc3QucHVzaChwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24oa2luZCkpO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCgnLCcpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgfSB3aGlsZSAoaW5kZXggPCBsZW5ndGgpO1xuXG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBkZWNsYXJhdGlvbnM7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndmFyJyk7XG5cbiAgICAgICAgZGVjbGFyYXRpb25zID0gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCgpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucyxcbiAgICAgICAgICAgIGtpbmQ6ICd2YXInXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8ga2luZCBtYXkgYmUgYGNvbnN0YCBvciBgbGV0YFxuICAgIC8vIEJvdGggYXJlIGV4cGVyaW1lbnRhbCBhbmQgbm90IGluIHRoZSBzcGVjaWZpY2F0aW9uIHlldC5cbiAgICAvLyBzZWUgaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpjb25zdFxuICAgIC8vIGFuZCBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmxldFxuICAgIGZ1bmN0aW9uIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbihraW5kKSB7XG4gICAgICAgIHZhciBkZWNsYXJhdGlvbnM7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZChraW5kKTtcblxuICAgICAgICBkZWNsYXJhdGlvbnMgPSBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KGtpbmQpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucyxcbiAgICAgICAgICAgIGtpbmQ6IGtpbmRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4zIEVtcHR5IFN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VFbXB0eVN0YXRlbWVudCgpIHtcbiAgICAgICAgZXhwZWN0KCc7Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FbXB0eVN0YXRlbWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjQgRXhwcmVzc2lvbiBTdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvblN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50LFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZXhwclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjUgSWYgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUlmU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdGVzdCwgY29uc2VxdWVudCwgYWx0ZXJuYXRlO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2lmJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGNvbnNlcXVlbnQgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2Vsc2UnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBhbHRlcm5hdGUgPSBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWx0ZXJuYXRlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWZTdGF0ZW1lbnQsXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgY29uc2VxdWVudDogY29uc2VxdWVudCxcbiAgICAgICAgICAgIGFsdGVybmF0ZTogYWx0ZXJuYXRlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNiBJdGVyYXRpb24gU3RhdGVtZW50c1xuXG4gICAgZnVuY3Rpb24gcGFyc2VEb1doaWxlU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYm9keSwgdGVzdCwgb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZG8nKTtcblxuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aGlsZScpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkRvV2hpbGVTdGF0ZW1lbnQsXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgdGVzdDogdGVzdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlV2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0ZXN0LCBib2R5LCBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aGlsZScpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LldoaWxlU3RhdGVtZW50LFxuICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCgpLFxuICAgICAgICAgICAga2luZDogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZvclN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGluaXQsIHRlc3QsIHVwZGF0ZSwgbGVmdCwgcmlnaHQsIGJvZHksIG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGluaXQgPSB0ZXN0ID0gdXBkYXRlID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmb3InKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCd2YXInKSB8fCBtYXRjaEtleXdvcmQoJ2xldCcpKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGluaXQgPSBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIGlmIChpbml0LmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDEgJiYgbWF0Y2hLZXl3b3JkKCdpbicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gaW5pdDtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgICAgICAgICAgaW5pdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaW5pdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnaW4nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNMZWZ0SGFuZFNpZGUoaW5pdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luRm9ySW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQgPSBpbml0O1xuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgICAgICBpbml0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBleHBlY3QoJzsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcpIHtcblxuICAgICAgICAgICAgaWYgKCFtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXhwZWN0KCc7Jyk7XG5cbiAgICAgICAgICAgIGlmICghbWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgb2xkSW5JdGVyYXRpb24gPSBzdGF0ZS5pbkl0ZXJhdGlvbjtcbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSB0cnVlO1xuXG4gICAgICAgIGJvZHkgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgaWYgKHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguRm9yU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGluaXQ6IGluaXQsXG4gICAgICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgICAgICB1cGRhdGU6IHVwZGF0ZSxcbiAgICAgICAgICAgICAgICBib2R5OiBib2R5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Gb3JJblN0YXRlbWVudCxcbiAgICAgICAgICAgIGxlZnQ6IGxlZnQsXG4gICAgICAgICAgICByaWdodDogcmlnaHQsXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgZWFjaDogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi43IFRoZSBjb250aW51ZSBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlQ29udGludWVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiwgbGFiZWwgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2NvbnRpbnVlJyk7XG5cbiAgICAgICAgLy8gT3B0aW1pemUgdGhlIG1vc3QgY29tbW9uIGZvcm06ICdjb250aW51ZTsnLlxuICAgICAgICBpZiAoc291cmNlW2luZGV4XSA9PT0gJzsnKSB7XG4gICAgICAgICAgICBsZXgoKTtcblxuICAgICAgICAgICAgaWYgKCFzdGF0ZS5pbkl0ZXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxDb250aW51ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICBpZiAoIXN0YXRlLmluSXRlcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbENvbnRpbnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ29udGludWVTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgbGFiZWwgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuXG4gICAgICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS5sYWJlbFNldCwgbGFiZWwubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5Vbmtub3duTGFiZWwsIGxhYmVsLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIGlmIChsYWJlbCA9PT0gbnVsbCAmJiAhc3RhdGUuaW5JdGVyYXRpb24pIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxDb250aW51ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50LFxuICAgICAgICAgICAgbGFiZWw6IGxhYmVsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuOCBUaGUgYnJlYWsgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUJyZWFrU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGxhYmVsID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdicmVhaycpO1xuXG4gICAgICAgIC8vIE9wdGltaXplIHRoZSBtb3N0IGNvbW1vbiBmb3JtOiAnYnJlYWs7Jy5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICc7Jykge1xuICAgICAgICAgICAgbGV4KCk7XG5cbiAgICAgICAgICAgIGlmICghKHN0YXRlLmluSXRlcmF0aW9uIHx8IHN0YXRlLmluU3dpdGNoKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxCcmVhayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJyZWFrU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICBpZiAoIShzdGF0ZS5pbkl0ZXJhdGlvbiB8fCBzdGF0ZS5pblN3aXRjaCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQnJlYWspO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CcmVha1N0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICBsYWJlbCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG5cbiAgICAgICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLmxhYmVsU2V0LCBsYWJlbC5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVua25vd25MYWJlbCwgbGFiZWwubmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgaWYgKGxhYmVsID09PSBudWxsICYmICEoc3RhdGUuaW5JdGVyYXRpb24gfHwgc3RhdGUuaW5Td2l0Y2gpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQnJlYWspO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CcmVha1N0YXRlbWVudCxcbiAgICAgICAgICAgIGxhYmVsOiBsYWJlbFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjkgVGhlIHJldHVybiBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlUmV0dXJuU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGFyZ3VtZW50ID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdyZXR1cm4nKTtcblxuICAgICAgICBpZiAoIXN0YXRlLmluRnVuY3Rpb25Cb2R5KSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLklsbGVnYWxSZXR1cm4pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gJ3JldHVybicgZm9sbG93ZWQgYnkgYSBzcGFjZSBhbmQgYW4gaWRlbnRpZmllciBpcyB2ZXJ5IGNvbW1vbi5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICcgJykge1xuICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KHNvdXJjZVtpbmRleCArIDFdKSkge1xuICAgICAgICAgICAgICAgIGFyZ3VtZW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBhcmd1bWVudFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlJldHVyblN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2goJ30nKSAmJiB0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgICAgICBhcmd1bWVudCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguUmV0dXJuU3RhdGVtZW50LFxuICAgICAgICAgICAgYXJndW1lbnQ6IGFyZ3VtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMTAgVGhlIHdpdGggc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVdpdGhTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBvYmplY3QsIGJvZHk7XG5cbiAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RNb2RlV2l0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aXRoJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgb2JqZWN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5XaXRoU3RhdGVtZW50LFxuICAgICAgICAgICAgb2JqZWN0OiBvYmplY3QsXG4gICAgICAgICAgICBib2R5OiBib2R5XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMTAgVGhlIHN3aXRoIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VTd2l0Y2hDYXNlKCkge1xuICAgICAgICB2YXIgdGVzdCxcbiAgICAgICAgICAgIGNvbnNlcXVlbnQgPSBbXSxcbiAgICAgICAgICAgIHN0YXRlbWVudDtcblxuICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdkZWZhdWx0JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgdGVzdCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHBlY3RLZXl3b3JkKCdjYXNlJyk7XG4gICAgICAgICAgICB0ZXN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgIH1cbiAgICAgICAgZXhwZWN0KCc6Jyk7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSB8fCBtYXRjaEtleXdvcmQoJ2RlZmF1bHQnKSB8fCBtYXRjaEtleXdvcmQoJ2Nhc2UnKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RhdGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc2VxdWVudC5wdXNoKHN0YXRlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlN3aXRjaENhc2UsXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgY29uc2VxdWVudDogY29uc2VxdWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlU3dpdGNoU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgZGlzY3JpbWluYW50LCBjYXNlcywgY2xhdXNlLCBvbGRJblN3aXRjaCwgZGVmYXVsdEZvdW5kO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3N3aXRjaCcpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGRpc2NyaW1pbmFudCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIGNhc2VzID0gW107XG5cbiAgICAgICAgaWYgKG1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguU3dpdGNoU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGRpc2NyaW1pbmFudDogZGlzY3JpbWluYW50LFxuICAgICAgICAgICAgICAgIGNhc2VzOiBjYXNlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9sZEluU3dpdGNoID0gc3RhdGUuaW5Td2l0Y2g7XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gdHJ1ZTtcbiAgICAgICAgZGVmYXVsdEZvdW5kID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2xhdXNlID0gcGFyc2VTd2l0Y2hDYXNlKCk7XG4gICAgICAgICAgICBpZiAoY2xhdXNlLnRlc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdEZvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk11bHRpcGxlRGVmYXVsdHNJblN3aXRjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlZmF1bHRGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlcy5wdXNoKGNsYXVzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5pblN3aXRjaCA9IG9sZEluU3dpdGNoO1xuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguU3dpdGNoU3RhdGVtZW50LFxuICAgICAgICAgICAgZGlzY3JpbWluYW50OiBkaXNjcmltaW5hbnQsXG4gICAgICAgICAgICBjYXNlczogY2FzZXNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xMyBUaGUgdGhyb3cgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVRocm93U3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYXJndW1lbnQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndGhyb3cnKTtcblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk5ld2xpbmVBZnRlclRocm93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFyZ3VtZW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVGhyb3dTdGF0ZW1lbnQsXG4gICAgICAgICAgICBhcmd1bWVudDogYXJndW1lbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xNCBUaGUgdHJ5IHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VDYXRjaENsYXVzZSgpIHtcbiAgICAgICAgdmFyIHBhcmFtO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2NhdGNoJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG4gICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQobG9va2FoZWFkKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyYW0gPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuICAgICAgICAvLyAxMi4xNC4xXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChwYXJhbS5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RDYXRjaFZhcmlhYmxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQ2F0Y2hDbGF1c2UsXG4gICAgICAgICAgICBwYXJhbTogcGFyYW0sXG4gICAgICAgICAgICBib2R5OiBwYXJzZUJsb2NrKClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVRyeVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGJsb2NrLCBoYW5kbGVycyA9IFtdLCBmaW5hbGl6ZXIgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3RyeScpO1xuXG4gICAgICAgIGJsb2NrID0gcGFyc2VCbG9jaygpO1xuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2NhdGNoJykpIHtcbiAgICAgICAgICAgIGhhbmRsZXJzLnB1c2gocGFyc2VDYXRjaENsYXVzZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2ZpbmFsbHknKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBmaW5hbGl6ZXIgPSBwYXJzZUJsb2NrKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwICYmICFmaW5hbGl6ZXIpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk5vQ2F0Y2hPckZpbmFsbHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5UcnlTdGF0ZW1lbnQsXG4gICAgICAgICAgICBibG9jazogYmxvY2ssXG4gICAgICAgICAgICBndWFyZGVkSGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgaGFuZGxlcnM6IGhhbmRsZXJzLFxuICAgICAgICAgICAgZmluYWxpemVyOiBmaW5hbGl6ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xNSBUaGUgZGVidWdnZXIgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZURlYnVnZ2VyU3RhdGVtZW50KCkge1xuICAgICAgICBleHBlY3RLZXl3b3JkKCdkZWJ1Z2dlcicpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkRlYnVnZ2VyU3RhdGVtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIgU3RhdGVtZW50c1xuXG4gICAgZnVuY3Rpb24gcGFyc2VTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpLFxuICAgICAgICAgICAgZXhwcixcbiAgICAgICAgICAgIGxhYmVsZWRCb2R5O1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnOyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRW1wdHlTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3snOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUJsb2NrKCk7XG4gICAgICAgICAgICBjYXNlICcoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VFeHByZXNzaW9uU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW4udmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2JyZWFrJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VCcmVha1N0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnY29udGludWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUNvbnRpbnVlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdkZWJ1Z2dlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRGVidWdnZXJTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2RvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VEb1doaWxlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdmb3InOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZvclN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgIGNhc2UgJ2lmJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJZlN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAncmV0dXJuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VSZXR1cm5TdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3N3aXRjaCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3dpdGNoU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd0aHJvdyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVGhyb3dTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3RyeSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVHJ5U3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd2YXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVZhcmlhYmxlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd3aGlsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlV2hpbGVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3dpdGgnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVdpdGhTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgLy8gMTIuMTIgTGFiZWxsZWQgU3RhdGVtZW50c1xuICAgICAgICBpZiAoKGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIpICYmIG1hdGNoKCc6JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuXG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLmxhYmVsU2V0LCBleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuUmVkZWNsYXJhdGlvbiwgJ0xhYmVsJywgZXhwci5uYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RhdGUubGFiZWxTZXRbZXhwci5uYW1lXSA9IHRydWU7XG4gICAgICAgICAgICBsYWJlbGVkQm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGUubGFiZWxTZXRbZXhwci5uYW1lXTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTGFiZWxlZFN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogZXhwcixcbiAgICAgICAgICAgICAgICBib2R5OiBsYWJlbGVkQm9keVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBleHByXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTMgRnVuY3Rpb24gRGVmaW5pdGlvblxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCkge1xuICAgICAgICB2YXIgc291cmNlRWxlbWVudCwgc291cmNlRWxlbWVudHMgPSBbXSwgdG9rZW4sIGRpcmVjdGl2ZSwgZmlyc3RSZXN0cmljdGVkLFxuICAgICAgICAgICAgb2xkTGFiZWxTZXQsIG9sZEluSXRlcmF0aW9uLCBvbGRJblN3aXRjaCwgb2xkSW5GdW5jdGlvbkJvZHk7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VFbGVtZW50LmV4cHJlc3Npb24udHlwZSAhPT0gU3ludGF4LkxpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIG5vdCBkaXJlY3RpdmVcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpcmVjdGl2ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdICsgMSwgdG9rZW4ucmFuZ2VbMV0gLSAxKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUgPT09ICd1c2Ugc3RyaWN0Jykge1xuICAgICAgICAgICAgICAgIHN0cmljdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoZmlyc3RSZXN0cmljdGVkLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaXJzdFJlc3RyaWN0ZWQgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgb2xkTGFiZWxTZXQgPSBzdGF0ZS5sYWJlbFNldDtcbiAgICAgICAgb2xkSW5JdGVyYXRpb24gPSBzdGF0ZS5pbkl0ZXJhdGlvbjtcbiAgICAgICAgb2xkSW5Td2l0Y2ggPSBzdGF0ZS5pblN3aXRjaDtcbiAgICAgICAgb2xkSW5GdW5jdGlvbkJvZHkgPSBzdGF0ZS5pbkZ1bmN0aW9uQm9keTtcblxuICAgICAgICBzdGF0ZS5sYWJlbFNldCA9IHt9O1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5pblN3aXRjaCA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5pbkZ1bmN0aW9uQm9keSA9IHRydWU7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VFbGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHN0YXRlLmxhYmVsU2V0ID0gb2xkTGFiZWxTZXQ7XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gb2xkSW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gb2xkSW5Td2l0Y2g7XG4gICAgICAgIHN0YXRlLmluRnVuY3Rpb25Cb2R5ID0gb2xkSW5GdW5jdGlvbkJvZHk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CbG9ja1N0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IHNvdXJjZUVsZW1lbnRzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uKCkge1xuICAgICAgICB2YXIgaWQsIHBhcmFtLCBwYXJhbXMgPSBbXSwgYm9keSwgdG9rZW4sIHN0cmljdGVkLCBmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UsIHByZXZpb3VzU3RyaWN0LCBwYXJhbVNldDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmdW5jdGlvbicpO1xuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICBwYXJhbVNldCA9IHt9O1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyYW1TZXQsIHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgICAgICAgICAgIHBhcmFtU2V0W3BhcmFtLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoc3RyaWN0ICYmIGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJpY3QgJiYgc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RyaWN0ID0gcHJldmlvdXNTdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uLFxuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICAgICAgICBkZWZhdWx0czogW10sXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgcmVzdDogbnVsbCxcbiAgICAgICAgICAgIGdlbmVyYXRvcjogZmFsc2UsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGlkID0gbnVsbCwgc3RyaWN0ZWQsIGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSwgcGFyYW0sIHBhcmFtcyA9IFtdLCBib2R5LCBwcmV2aW91c1N0cmljdCwgcGFyYW1TZXQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZnVuY3Rpb24nKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdEZ1bmN0aW9uTmFtZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICBwYXJhbVNldCA9IHt9O1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyYW1TZXQsIHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgICAgICAgICAgIHBhcmFtU2V0W3BhcmFtLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoc3RyaWN0ICYmIGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJpY3QgJiYgc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RyaWN0ID0gcHJldmlvdXNTdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb24sXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICAgIGRlZmF1bHRzOiBbXSxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTQgUHJvZ3JhbVxuXG4gICAgZnVuY3Rpb24gcGFyc2VTb3VyY2VFbGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnY29uc3QnOlxuICAgICAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VDb25zdExldERlY2xhcmF0aW9uKHRva2VuLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVNvdXJjZUVsZW1lbnRzKCkge1xuICAgICAgICB2YXIgc291cmNlRWxlbWVudCwgc291cmNlRWxlbWVudHMgPSBbXSwgdG9rZW4sIGRpcmVjdGl2ZSwgZmlyc3RSZXN0cmljdGVkO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnRzLnB1c2goc291cmNlRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoc291cmNlRWxlbWVudC5leHByZXNzaW9uLnR5cGUgIT09IFN5bnRheC5MaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBub3QgZGlyZWN0aXZlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXJlY3RpdmUgPSBzbGljZVNvdXJjZSh0b2tlbi5yYW5nZVswXSArIDEsIHRva2VuLnJhbmdlWzFdIC0gMSk7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aXZlID09PSAndXNlIHN0cmljdCcpIHtcbiAgICAgICAgICAgICAgICBzdHJpY3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KGZpcnN0UmVzdHJpY3RlZCwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghZmlyc3RSZXN0cmljdGVkICYmIHRva2VuLm9jdGFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VFbGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc291cmNlRWxlbWVudHM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VQcm9ncmFtKCkge1xuICAgICAgICB2YXIgcHJvZ3JhbTtcbiAgICAgICAgc3RyaWN0ID0gZmFsc2U7XG4gICAgICAgIHByb2dyYW0gPSB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvZ3JhbSxcbiAgICAgICAgICAgIGJvZHk6IHBhcnNlU291cmNlRWxlbWVudHMoKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9XG5cbiAgICAvLyBUaGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBhcmUgbmVlZGVkIG9ubHkgd2hlbiB0aGUgb3B0aW9uIHRvIHByZXNlcnZlXG4gICAgLy8gdGhlIGNvbW1lbnRzIGlzIGFjdGl2ZS5cblxuICAgIGZ1bmN0aW9uIGFkZENvbW1lbnQodHlwZSwgdmFsdWUsIHN0YXJ0LCBlbmQsIGxvYykge1xuICAgICAgICBhc3NlcnQodHlwZW9mIHN0YXJ0ID09PSAnbnVtYmVyJywgJ0NvbW1lbnQgbXVzdCBoYXZlIHZhbGlkIHBvc2l0aW9uJyk7XG5cbiAgICAgICAgLy8gQmVjYXVzZSB0aGUgd2F5IHRoZSBhY3R1YWwgdG9rZW4gaXMgc2Nhbm5lZCwgb2Z0ZW4gdGhlIGNvbW1lbnRzXG4gICAgICAgIC8vIChpZiBhbnkpIGFyZSBza2lwcGVkIHR3aWNlIGR1cmluZyB0aGUgbGV4aWNhbCBhbmFseXNpcy5cbiAgICAgICAgLy8gVGh1cywgd2UgbmVlZCB0byBza2lwIGFkZGluZyBhIGNvbW1lbnQgaWYgdGhlIGNvbW1lbnQgYXJyYXkgYWxyZWFkeVxuICAgICAgICAvLyBoYW5kbGVkIGl0LlxuICAgICAgICBpZiAoZXh0cmEuY29tbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLmNvbW1lbnRzW2V4dHJhLmNvbW1lbnRzLmxlbmd0aCAtIDFdLnJhbmdlWzFdID4gc3RhcnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS5jb21tZW50cy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBlbmRdLFxuICAgICAgICAgICAgbG9jOiBsb2NcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhbkNvbW1lbnQoKSB7XG4gICAgICAgIHZhciBjb21tZW50LCBjaCwgbG9jLCBzdGFydCwgYmxvY2tDb21tZW50LCBsaW5lQ29tbWVudDtcblxuICAgICAgICBjb21tZW50ID0gJyc7XG4gICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgICAgICBpZiAobGluZUNvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0IC0gMVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGluZGV4IC0gMSwgbG9jKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGxlbmd0aCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGxlbmd0aCwgbG9jKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYmxvY2tDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4ICsgMV0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gY29tbWVudC5zdWJzdHIoMCwgY29tbWVudC5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0Jsb2NrJywgY29tbWVudCwgc3RhcnQsIGluZGV4LCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGluZGV4LCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrQ29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0IC0gMlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzV2hpdGVTcGFjZShjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAgJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckNvbW1lbnRMb2NhdGlvbigpIHtcbiAgICAgICAgdmFyIGksIGVudHJ5LCBjb21tZW50LCBjb21tZW50cyA9IFtdO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBleHRyYS5jb21tZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgZW50cnkgPSBleHRyYS5jb21tZW50c1tpXTtcbiAgICAgICAgICAgIGNvbW1lbnQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogZW50cnkudHlwZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZW50cnkudmFsdWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBjb21tZW50LnJhbmdlID0gZW50cnkucmFuZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgY29tbWVudC5sb2MgPSBlbnRyeS5sb2M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21tZW50cy5wdXNoKGNvbW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEuY29tbWVudHMgPSBjb21tZW50cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb2xsZWN0VG9rZW4oKSB7XG4gICAgICAgIHZhciBzdGFydCwgbG9jLCB0b2tlbiwgcmFuZ2UsIHZhbHVlO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGxvYyA9IHtcbiAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdG9rZW4gPSBleHRyYS5hZHZhbmNlKCk7XG4gICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHJhbmdlID0gW3Rva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXV07XG4gICAgICAgICAgICB2YWx1ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXSk7XG4gICAgICAgICAgICBleHRyYS50b2tlbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5OYW1lW3Rva2VuLnR5cGVdLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICByYW5nZTogcmFuZ2UsXG4gICAgICAgICAgICAgICAgbG9jOiBsb2NcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbGxlY3RSZWdleCgpIHtcbiAgICAgICAgdmFyIHBvcywgbG9jLCByZWdleCwgdG9rZW47XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcblxuICAgICAgICBwb3MgPSBpbmRleDtcbiAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZWdleCA9IGV4dHJhLnNjYW5SZWdFeHAoKTtcbiAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUG9wIHRoZSBwcmV2aW91cyB0b2tlbiwgd2hpY2ggaXMgbGlrZWx5ICcvJyBvciAnLz0nXG4gICAgICAgIGlmIChleHRyYS50b2tlbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdG9rZW4gPSBleHRyYS50b2tlbnNbZXh0cmEudG9rZW5zLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKHRva2VuLnJhbmdlWzBdID09PSBwb3MgJiYgdG9rZW4udHlwZSA9PT0gJ1B1bmN0dWF0b3InKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnZhbHVlID09PSAnLycgfHwgdG9rZW4udmFsdWUgPT09ICcvPScpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0cmEudG9rZW5zLnBvcCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dHJhLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6ICdSZWd1bGFyRXhwcmVzc2lvbicsXG4gICAgICAgICAgICB2YWx1ZTogcmVnZXgubGl0ZXJhbCxcbiAgICAgICAgICAgIHJhbmdlOiBbcG9zLCBpbmRleF0sXG4gICAgICAgICAgICBsb2M6IGxvY1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVnZXg7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyVG9rZW5Mb2NhdGlvbigpIHtcbiAgICAgICAgdmFyIGksIGVudHJ5LCB0b2tlbiwgdG9rZW5zID0gW107XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGV4dHJhLnRva2Vucy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgZW50cnkgPSBleHRyYS50b2tlbnNbaV07XG4gICAgICAgICAgICB0b2tlbiA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBlbnRyeS50eXBlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlbnRyeS52YWx1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIHRva2VuLnJhbmdlID0gZW50cnkucmFuZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4ubG9jID0gZW50cnkubG9jO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEudG9rZW5zID0gdG9rZW5zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxpdGVyYWwodG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MaXRlcmFsLFxuICAgICAgICAgICAgdmFsdWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlUmF3TGl0ZXJhbCh0b2tlbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogdG9rZW4udmFsdWUsXG4gICAgICAgICAgICByYXc6IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXSlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbk1hcmtlcigpIHtcbiAgICAgICAgdmFyIG1hcmtlciA9IHt9O1xuXG4gICAgICAgIG1hcmtlci5yYW5nZSA9IFtpbmRleCwgaW5kZXhdO1xuICAgICAgICBtYXJrZXIubG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtYXJrZXIuZW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5yYW5nZVsxXSA9IGluZGV4O1xuICAgICAgICAgICAgdGhpcy5sb2MuZW5kLmxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICAgICAgdGhpcy5sb2MuZW5kLmNvbHVtbiA9IGluZGV4IC0gbGluZVN0YXJ0O1xuICAgICAgICB9O1xuXG4gICAgICAgIG1hcmtlci5hcHBseUdyb3VwID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIG5vZGUuZ3JvdXBSYW5nZSA9IFt0aGlzLnJhbmdlWzBdLCB0aGlzLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBub2RlLmdyb3VwTG9jID0ge1xuICAgICAgICAgICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5sb2Muc3RhcnQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2Muc3RhcnQuY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGVuZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5sb2MuZW5kLmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHRoaXMubG9jLmVuZC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbWFya2VyLmFwcGx5ID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIG5vZGUucmFuZ2UgPSBbdGhpcy5yYW5nZVswXSwgdGhpcy5yYW5nZVsxXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5zdGFydC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5zdGFydC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZW5kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5lbmQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2MuZW5kLmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbWFya2VyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYWNrR3JvdXBFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgIG1hcmtlci5hcHBseUdyb3VwKGV4cHIpO1xuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIG1hcmtlciwgZXhwcjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBtYXJrZXIgPSBjcmVhdGVMb2NhdGlvbk1hcmtlcigpO1xuXG4gICAgICAgIGV4cHIgPSBtYXRjaEtleXdvcmQoJ25ldycpID8gcGFyc2VOZXdFeHByZXNzaW9uKCkgOiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcuJykgfHwgbWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpIHx8IG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjYWxsZWU6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgICdhcmd1bWVudHMnOiBwYXJzZUFyZ3VtZW50cygpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckdyb3VwKG5vZGUpIHtcbiAgICAgICAgdmFyIG4sIGksIGVudHJ5O1xuXG4gICAgICAgIG4gPSAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShub2RlKSA9PT0gJ1tvYmplY3QgQXJyYXldJykgPyBbXSA6IHt9O1xuICAgICAgICBmb3IgKGkgaW4gbm9kZSkge1xuICAgICAgICAgICAgaWYgKG5vZGUuaGFzT3duUHJvcGVydHkoaSkgJiYgaSAhPT0gJ2dyb3VwUmFuZ2UnICYmIGkgIT09ICdncm91cExvYycpIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IG5vZGVbaV07XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsIHx8IHR5cGVvZiBlbnRyeSAhPT0gJ29iamVjdCcgfHwgZW50cnkgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICAgICAgICAgICAgbltpXSA9IGVudHJ5O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5baV0gPSBmaWx0ZXJHcm91cChlbnRyeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdyYXBUcmFja2luZ0Z1bmN0aW9uKHJhbmdlLCBsb2MpIHtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHBhcnNlRnVuY3Rpb24pIHtcblxuICAgICAgICAgICAgZnVuY3Rpb24gaXNCaW5hcnkobm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLnR5cGUgPT09IFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbiB8fFxuICAgICAgICAgICAgICAgICAgICBub2RlLnR5cGUgPT09IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiB2aXNpdChub2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXJ0LCBlbmQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZS5sZWZ0KSkge1xuICAgICAgICAgICAgICAgICAgICB2aXNpdChub2RlLmxlZnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZS5yaWdodCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaXQobm9kZS5yaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmxlZnQuZ3JvdXBSYW5nZSB8fCBub2RlLnJpZ2h0Lmdyb3VwUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbm9kZS5sZWZ0Lmdyb3VwUmFuZ2UgPyBub2RlLmxlZnQuZ3JvdXBSYW5nZVswXSA6IG5vZGUubGVmdC5yYW5nZVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IG5vZGUucmlnaHQuZ3JvdXBSYW5nZSA/IG5vZGUucmlnaHQuZ3JvdXBSYW5nZVsxXSA6IG5vZGUucmlnaHQucmFuZ2VbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnJhbmdlID0gW3N0YXJ0LCBlbmRdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBub2RlLnJhbmdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQucmFuZ2VbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSBub2RlLnJpZ2h0LnJhbmdlWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5yYW5nZSA9IFtzdGFydCwgZW5kXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobG9jKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmxlZnQuZ3JvdXBMb2MgfHwgbm9kZS5yaWdodC5ncm91cExvYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQuZ3JvdXBMb2MgPyBub2RlLmxlZnQuZ3JvdXBMb2Muc3RhcnQgOiBub2RlLmxlZnQubG9jLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gbm9kZS5yaWdodC5ncm91cExvYyA/IG5vZGUucmlnaHQuZ3JvdXBMb2MuZW5kIDogbm9kZS5yaWdodC5sb2MuZW5kO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBub2RlLmxvYyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUubG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBub2RlLmxlZnQubG9jLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogbm9kZS5yaWdodC5sb2MuZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBtYXJrZXIsIG5vZGU7XG5cbiAgICAgICAgICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgICAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcbiAgICAgICAgICAgICAgICBub2RlID0gcGFyc2VGdW5jdGlvbi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcblxuICAgICAgICAgICAgICAgIGlmIChyYW5nZSAmJiB0eXBlb2Ygbm9kZS5yYW5nZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChsb2MgJiYgdHlwZW9mIG5vZGUubG9jID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGlzQmluYXJ5KG5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2l0KG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXRjaCgpIHtcblxuICAgICAgICB2YXIgd3JhcFRyYWNraW5nO1xuXG4gICAgICAgIGlmIChleHRyYS5jb21tZW50cykge1xuICAgICAgICAgICAgZXh0cmEuc2tpcENvbW1lbnQgPSBza2lwQ29tbWVudDtcbiAgICAgICAgICAgIHNraXBDb21tZW50ID0gc2NhbkNvbW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmF3KSB7XG4gICAgICAgICAgICBleHRyYS5jcmVhdGVMaXRlcmFsID0gY3JlYXRlTGl0ZXJhbDtcbiAgICAgICAgICAgIGNyZWF0ZUxpdGVyYWwgPSBjcmVhdGVSYXdMaXRlcmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4dHJhLnJhbmdlIHx8IGV4dHJhLmxvYykge1xuXG4gICAgICAgICAgICBleHRyYS5wYXJzZUdyb3VwRXhwcmVzc2lvbiA9IHBhcnNlR3JvdXBFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsO1xuICAgICAgICAgICAgcGFyc2VHcm91cEV4cHJlc3Npb24gPSB0cmFja0dyb3VwRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbiA9IHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCA9IHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbDtcblxuICAgICAgICAgICAgd3JhcFRyYWNraW5nID0gd3JhcFRyYWNraW5nRnVuY3Rpb24oZXh0cmEucmFuZ2UsIGV4dHJhLmxvYyk7XG5cbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQWRkaXRpdmVFeHByZXNzaW9uID0gcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uID0gcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbiA9IHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJsb2NrID0gcGFyc2VCbG9jaztcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cztcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQ2F0Y2hDbGF1c2UgPSBwYXJzZUNhdGNoQ2xhdXNlO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDb21wdXRlZE1lbWJlciA9IHBhcnNlQ29tcHV0ZWRNZW1iZXI7XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDb25zdExldERlY2xhcmF0aW9uID0gcGFyc2VDb25zdExldERlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRXhwcmVzc2lvbiA9IHBhcnNlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbiA9IHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25FeHByZXNzaW9uID0gcGFyc2VGdW5jdGlvbkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uID0gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbiA9IHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uID0gcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZU5ld0V4cHJlc3Npb24gPSBwYXJzZU5ld0V4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkgPSBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHk7XG4gICAgICAgICAgICBleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHlLZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQb3N0Zml4RXhwcmVzc2lvbiA9IHBhcnNlUG9zdGZpeEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uID0gcGFyc2VQcmltYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJvZ3JhbSA9IHBhcnNlUHJvZ3JhbTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJvcGVydHlGdW5jdGlvbiA9IHBhcnNlUHJvcGVydHlGdW5jdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24gPSBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VTdGF0ZW1lbnQgPSBwYXJzZVN0YXRlbWVudDtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlU2hpZnRFeHByZXNzaW9uID0gcGFyc2VTaGlmdEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVN3aXRjaENhc2UgPSBwYXJzZVN3aXRjaENhc2U7XG4gICAgICAgICAgICBleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbiA9IHBhcnNlVW5hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uID0gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VWYXJpYWJsZUlkZW50aWZpZXIgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcjtcblxuICAgICAgICAgICAgcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUJsb2NrID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQmxvY2spO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyk7XG4gICAgICAgICAgICBwYXJzZUNhdGNoQ2xhdXNlID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ2F0Y2hDbGF1c2UpO1xuICAgICAgICAgICAgcGFyc2VDb21wdXRlZE1lbWJlciA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyKTtcbiAgICAgICAgICAgIHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvbkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGdW5jdGlvbkV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZU5ld0V4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VOZXdFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkpO1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5KTtcbiAgICAgICAgICAgIHBhcnNlT2JqZWN0UHJvcGVydHlLZXkgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eUtleSk7XG4gICAgICAgICAgICBwYXJzZVBvc3RmaXhFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUG9zdGZpeEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VQcmltYXJ5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlUHJvZ3JhbSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVByb2dyYW0pO1xuICAgICAgICAgICAgcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUHJvcGVydHlGdW5jdGlvbik7XG4gICAgICAgICAgICBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VTdGF0ZW1lbnQgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTdGF0ZW1lbnQpO1xuICAgICAgICAgICAgcGFyc2VTaGlmdEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTaGlmdEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VTd2l0Y2hDYXNlID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlU3dpdGNoQ2FzZSk7XG4gICAgICAgICAgICBwYXJzZVVuYXJ5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlVmFyaWFibGVJZGVudGlmaWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmEudG9rZW5zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZXh0cmEuYWR2YW5jZSA9IGFkdmFuY2U7XG4gICAgICAgICAgICBleHRyYS5zY2FuUmVnRXhwID0gc2NhblJlZ0V4cDtcblxuICAgICAgICAgICAgYWR2YW5jZSA9IGNvbGxlY3RUb2tlbjtcbiAgICAgICAgICAgIHNjYW5SZWdFeHAgPSBjb2xsZWN0UmVnZXg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bnBhdGNoKCkge1xuICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnNraXBDb21tZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBza2lwQ29tbWVudCA9IGV4dHJhLnNraXBDb21tZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4dHJhLnJhdykge1xuICAgICAgICAgICAgY3JlYXRlTGl0ZXJhbCA9IGV4dHJhLmNyZWF0ZUxpdGVyYWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG4gICAgICAgICAgICBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQWRkaXRpdmVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uID0gZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCbG9jayA9IGV4dHJhLnBhcnNlQmxvY2s7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMgPSBleHRyYS5wYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHM7XG4gICAgICAgICAgICBwYXJzZUNhdGNoQ2xhdXNlID0gZXh0cmEucGFyc2VDYXRjaENsYXVzZTtcbiAgICAgICAgICAgIHBhcnNlQ29tcHV0ZWRNZW1iZXIgPSBleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyO1xuICAgICAgICAgICAgcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlRnVuY3Rpb25FeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VHcm91cEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUdyb3VwRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCA9IGV4dHJhLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbDtcbiAgICAgICAgICAgIHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gZXh0cmEucGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTmV3RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTmV3RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IGV4dHJhLnBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eTtcbiAgICAgICAgICAgIHBhcnNlT2JqZWN0UHJvcGVydHkgPSBleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5O1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eUtleSA9IGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHlLZXk7XG4gICAgICAgICAgICBwYXJzZVByaW1hcnlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VQcmltYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVBvc3RmaXhFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VQcm9ncmFtID0gZXh0cmEucGFyc2VQcm9ncmFtO1xuICAgICAgICAgICAgcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gZXh0cmEucGFyc2VQcm9wZXJ0eUZ1bmN0aW9uO1xuICAgICAgICAgICAgcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVN0YXRlbWVudCA9IGV4dHJhLnBhcnNlU3RhdGVtZW50O1xuICAgICAgICAgICAgcGFyc2VTaGlmdEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVNoaWZ0RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlU3dpdGNoQ2FzZSA9IGV4dHJhLnBhcnNlU3dpdGNoQ2FzZTtcbiAgICAgICAgICAgIHBhcnNlVW5hcnlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VVbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlSWRlbnRpZmllciA9IGV4dHJhLnBhcnNlVmFyaWFibGVJZGVudGlmaWVyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5zY2FuUmVnRXhwID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhZHZhbmNlID0gZXh0cmEuYWR2YW5jZTtcbiAgICAgICAgICAgIHNjYW5SZWdFeHAgPSBleHRyYS5zY2FuUmVnRXhwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RyaW5nVG9BcnJheShzdHIpIHtcbiAgICAgICAgdmFyIGxlbmd0aCA9IHN0ci5sZW5ndGgsXG4gICAgICAgICAgICByZXN1bHQgPSBbXSxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgcmVzdWx0W2ldID0gc3RyLmNoYXJBdChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlKGNvZGUsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHByb2dyYW0sIHRvU3RyaW5nO1xuXG4gICAgICAgIHRvU3RyaW5nID0gU3RyaW5nO1xuICAgICAgICBpZiAodHlwZW9mIGNvZGUgIT09ICdzdHJpbmcnICYmICEoY29kZSBpbnN0YW5jZW9mIFN0cmluZykpIHtcbiAgICAgICAgICAgIGNvZGUgPSB0b1N0cmluZyhjb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNvdXJjZSA9IGNvZGU7XG4gICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgbGluZU51bWJlciA9IChzb3VyY2UubGVuZ3RoID4gMCkgPyAxIDogMDtcbiAgICAgICAgbGluZVN0YXJ0ID0gMDtcbiAgICAgICAgbGVuZ3RoID0gc291cmNlLmxlbmd0aDtcbiAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgc3RhdGUgPSB7XG4gICAgICAgICAgICBhbGxvd0luOiB0cnVlLFxuICAgICAgICAgICAgbGFiZWxTZXQ6IHt9LFxuICAgICAgICAgICAgaW5GdW5jdGlvbkJvZHk6IGZhbHNlLFxuICAgICAgICAgICAgaW5JdGVyYXRpb246IGZhbHNlLFxuICAgICAgICAgICAgaW5Td2l0Y2g6IGZhbHNlXG4gICAgICAgIH07XG5cbiAgICAgICAgZXh0cmEgPSB7fTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZXh0cmEucmFuZ2UgPSAodHlwZW9mIG9wdGlvbnMucmFuZ2UgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5yYW5nZTtcbiAgICAgICAgICAgIGV4dHJhLmxvYyA9ICh0eXBlb2Ygb3B0aW9ucy5sb2MgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5sb2M7XG4gICAgICAgICAgICBleHRyYS5yYXcgPSAodHlwZW9mIG9wdGlvbnMucmF3ID09PSAnYm9vbGVhbicpICYmIG9wdGlvbnMucmF3O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLnRva2VucyA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMudG9rZW5zKSB7XG4gICAgICAgICAgICAgICAgZXh0cmEudG9rZW5zID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY29tbWVudCA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMuY29tbWVudCkge1xuICAgICAgICAgICAgICAgIGV4dHJhLmNvbW1lbnRzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9sZXJhbnQgPT09ICdib29sZWFuJyAmJiBvcHRpb25zLnRvbGVyYW50KSB7XG4gICAgICAgICAgICAgICAgZXh0cmEuZXJyb3JzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGZpcnN0IHRvIGNvbnZlcnQgdG8gYSBzdHJpbmcuIFRoaXMgaXMgZ29vZCBhcyBmYXN0IHBhdGhcbiAgICAgICAgICAgICAgICAvLyBmb3Igb2xkIElFIHdoaWNoIHVuZGVyc3RhbmRzIHN0cmluZyBpbmRleGluZyBmb3Igc3RyaW5nXG4gICAgICAgICAgICAgICAgLy8gbGl0ZXJhbHMgb25seSBhbmQgbm90IGZvciBzdHJpbmcgb2JqZWN0LlxuICAgICAgICAgICAgICAgIGlmIChjb2RlIGluc3RhbmNlb2YgU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZSA9IGNvZGUudmFsdWVPZigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZvcmNlIGFjY2Vzc2luZyB0aGUgY2hhcmFjdGVycyB2aWEgYW4gYXJyYXkuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZSA9IHN0cmluZ1RvQXJyYXkoY29kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcGF0Y2goKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHByb2dyYW0gPSBwYXJzZVByb2dyYW0oKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0cmEuY29tbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyQ29tbWVudExvY2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5jb21tZW50cyA9IGV4dHJhLmNvbW1lbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS50b2tlbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyVG9rZW5Mb2NhdGlvbigpO1xuICAgICAgICAgICAgICAgIHByb2dyYW0udG9rZW5zID0gZXh0cmEudG9rZW5zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5lcnJvcnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5lcnJvcnMgPSBleHRyYS5lcnJvcnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5ib2R5ID0gZmlsdGVyR3JvdXAocHJvZ3JhbS5ib2R5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHVucGF0Y2goKTtcbiAgICAgICAgICAgIGV4dHJhID0ge307XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9XG5cbiAgICAvLyBTeW5jIHdpdGggcGFja2FnZS5qc29uLlxuICAgIGV4cG9ydHMudmVyc2lvbiA9ICcxLjAuNCc7XG5cbiAgICBleHBvcnRzLnBhcnNlID0gcGFyc2U7XG5cbiAgICAvLyBEZWVwIGNvcHkuXG4gICAgZXhwb3J0cy5TeW50YXggPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbmFtZSwgdHlwZXMgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHR5cGVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobmFtZSBpbiBTeW50YXgpIHtcbiAgICAgICAgICAgIGlmIChTeW50YXguaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0eXBlc1tuYW1lXSA9IFN5bnRheFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmZyZWV6ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZSh0eXBlcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHlwZXM7XG4gICAgfSgpKTtcblxufSkpO1xuLyogdmltOiBzZXQgc3c9NCB0cz00IGV0IHR3PTgwIDogKi9cbiIsIi8qXG4gIENvcHlyaWdodCAoQykgMjAxMi0yMDEzIFl1c3VrZSBTdXp1a2kgPHV0YXRhbmUudGVhQGdtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuXG4gIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICBtb2RpZmljYXRpb24sIGFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcblxuICAgICogUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4gICAgICBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuXG4gIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4gIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEVcbiAgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0VcbiAgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIDxDT1BZUklHSFQgSE9MREVSPiBCRSBMSUFCTEUgRk9SIEFOWVxuICBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7XG4gIExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORFxuICBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0ZcbiAgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiovXG4vKmpzbGludCB2YXJzOmZhbHNlLCBiaXR3aXNlOnRydWUqL1xuLypqc2hpbnQgaW5kZW50OjQqL1xuLypnbG9iYWwgZXhwb3J0czp0cnVlLCBkZWZpbmU6dHJ1ZSovXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24gKFVNRCkgdG8gc3VwcG9ydCBBTUQsIENvbW1vbkpTL05vZGUuanMsXG4gICAgLy8gYW5kIHBsYWluIGJyb3dzZXIgbG9hZGluZyxcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmFjdG9yeShleHBvcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5KChyb290LmVzdHJhdmVyc2UgPSB7fSkpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgU3ludGF4LFxuICAgICAgICBpc0FycmF5LFxuICAgICAgICBWaXNpdG9yT3B0aW9uLFxuICAgICAgICBWaXNpdG9yS2V5cyxcbiAgICAgICAgQlJFQUssXG4gICAgICAgIFNLSVA7XG5cbiAgICBTeW50YXggPSB7XG4gICAgICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uOiAnQXNzaWdubWVudEV4cHJlc3Npb24nLFxuICAgICAgICBBcnJheUV4cHJlc3Npb246ICdBcnJheUV4cHJlc3Npb24nLFxuICAgICAgICBBcnJheVBhdHRlcm46ICdBcnJheVBhdHRlcm4nLFxuICAgICAgICBBcnJvd0Z1bmN0aW9uRXhwcmVzc2lvbjogJ0Fycm93RnVuY3Rpb25FeHByZXNzaW9uJyxcbiAgICAgICAgQmxvY2tTdGF0ZW1lbnQ6ICdCbG9ja1N0YXRlbWVudCcsXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246ICdCaW5hcnlFeHByZXNzaW9uJyxcbiAgICAgICAgQnJlYWtTdGF0ZW1lbnQ6ICdCcmVha1N0YXRlbWVudCcsXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiAnQ2FsbEV4cHJlc3Npb24nLFxuICAgICAgICBDYXRjaENsYXVzZTogJ0NhdGNoQ2xhdXNlJyxcbiAgICAgICAgQ2xhc3NCb2R5OiAnQ2xhc3NCb2R5JyxcbiAgICAgICAgQ2xhc3NEZWNsYXJhdGlvbjogJ0NsYXNzRGVjbGFyYXRpb24nLFxuICAgICAgICBDbGFzc0V4cHJlc3Npb246ICdDbGFzc0V4cHJlc3Npb24nLFxuICAgICAgICBDb25kaXRpb25hbEV4cHJlc3Npb246ICdDb25kaXRpb25hbEV4cHJlc3Npb24nLFxuICAgICAgICBDb250aW51ZVN0YXRlbWVudDogJ0NvbnRpbnVlU3RhdGVtZW50JyxcbiAgICAgICAgRGVidWdnZXJTdGF0ZW1lbnQ6ICdEZWJ1Z2dlclN0YXRlbWVudCcsXG4gICAgICAgIERpcmVjdGl2ZVN0YXRlbWVudDogJ0RpcmVjdGl2ZVN0YXRlbWVudCcsXG4gICAgICAgIERvV2hpbGVTdGF0ZW1lbnQ6ICdEb1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgRW1wdHlTdGF0ZW1lbnQ6ICdFbXB0eVN0YXRlbWVudCcsXG4gICAgICAgIEV4cHJlc3Npb25TdGF0ZW1lbnQ6ICdFeHByZXNzaW9uU3RhdGVtZW50JyxcbiAgICAgICAgRm9yU3RhdGVtZW50OiAnRm9yU3RhdGVtZW50JyxcbiAgICAgICAgRm9ySW5TdGF0ZW1lbnQ6ICdGb3JJblN0YXRlbWVudCcsXG4gICAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246ICdGdW5jdGlvbkRlY2xhcmF0aW9uJyxcbiAgICAgICAgRnVuY3Rpb25FeHByZXNzaW9uOiAnRnVuY3Rpb25FeHByZXNzaW9uJyxcbiAgICAgICAgSWRlbnRpZmllcjogJ0lkZW50aWZpZXInLFxuICAgICAgICBJZlN0YXRlbWVudDogJ0lmU3RhdGVtZW50JyxcbiAgICAgICAgTGl0ZXJhbDogJ0xpdGVyYWwnLFxuICAgICAgICBMYWJlbGVkU3RhdGVtZW50OiAnTGFiZWxlZFN0YXRlbWVudCcsXG4gICAgICAgIExvZ2ljYWxFeHByZXNzaW9uOiAnTG9naWNhbEV4cHJlc3Npb24nLFxuICAgICAgICBNZW1iZXJFeHByZXNzaW9uOiAnTWVtYmVyRXhwcmVzc2lvbicsXG4gICAgICAgIE1ldGhvZERlZmluaXRpb246ICdNZXRob2REZWZpbml0aW9uJyxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogJ05ld0V4cHJlc3Npb24nLFxuICAgICAgICBPYmplY3RFeHByZXNzaW9uOiAnT2JqZWN0RXhwcmVzc2lvbicsXG4gICAgICAgIE9iamVjdFBhdHRlcm46ICdPYmplY3RQYXR0ZXJuJyxcbiAgICAgICAgUHJvZ3JhbTogJ1Byb2dyYW0nLFxuICAgICAgICBQcm9wZXJ0eTogJ1Byb3BlcnR5JyxcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiAnUmV0dXJuU3RhdGVtZW50JyxcbiAgICAgICAgU2VxdWVuY2VFeHByZXNzaW9uOiAnU2VxdWVuY2VFeHByZXNzaW9uJyxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiAnU3dpdGNoU3RhdGVtZW50JyxcbiAgICAgICAgU3dpdGNoQ2FzZTogJ1N3aXRjaENhc2UnLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogJ1RoaXNFeHByZXNzaW9uJyxcbiAgICAgICAgVGhyb3dTdGF0ZW1lbnQ6ICdUaHJvd1N0YXRlbWVudCcsXG4gICAgICAgIFRyeVN0YXRlbWVudDogJ1RyeVN0YXRlbWVudCcsXG4gICAgICAgIFVuYXJ5RXhwcmVzc2lvbjogJ1VuYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdVcGRhdGVFeHByZXNzaW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogJ1ZhcmlhYmxlRGVjbGFyYXRpb24nLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0b3I6ICdWYXJpYWJsZURlY2xhcmF0b3InLFxuICAgICAgICBXaGlsZVN0YXRlbWVudDogJ1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgV2l0aFN0YXRlbWVudDogJ1dpdGhTdGF0ZW1lbnQnLFxuICAgICAgICBZaWVsZEV4cHJlc3Npb246ICdZaWVsZEV4cHJlc3Npb24nXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGlnbm9yZUpTSGludEVycm9yKCkgeyB9XG5cbiAgICBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbiAgICBpZiAoIWlzQXJyYXkpIHtcbiAgICAgICAgaXNBcnJheSA9IGZ1bmN0aW9uIGlzQXJyYXkoYXJyYXkpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyYXkpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlZXBDb3B5KG9iaikge1xuICAgICAgICB2YXIgcmV0ID0ge30sIGtleSwgdmFsO1xuICAgICAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHZhbCA9IG9ialtrZXldO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiB2YWwgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0W2tleV0gPSBkZWVwQ29weSh2YWwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldFtrZXldID0gdmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNoYWxsb3dDb3B5KG9iaikge1xuICAgICAgICB2YXIgcmV0ID0ge30sIGtleTtcbiAgICAgICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9IG9ialtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIGlnbm9yZUpTSGludEVycm9yKHNoYWxsb3dDb3B5KTtcblxuICAgIC8vIGJhc2VkIG9uIExMVk0gbGliYysrIHVwcGVyX2JvdW5kIC8gbG93ZXJfYm91bmRcbiAgICAvLyBNSVQgTGljZW5zZVxuXG4gICAgZnVuY3Rpb24gdXBwZXJCb3VuZChhcnJheSwgZnVuYykge1xuICAgICAgICB2YXIgZGlmZiwgbGVuLCBpLCBjdXJyZW50O1xuXG4gICAgICAgIGxlbiA9IGFycmF5Lmxlbmd0aDtcbiAgICAgICAgaSA9IDA7XG5cbiAgICAgICAgd2hpbGUgKGxlbikge1xuICAgICAgICAgICAgZGlmZiA9IGxlbiA+Pj4gMTtcbiAgICAgICAgICAgIGN1cnJlbnQgPSBpICsgZGlmZjtcbiAgICAgICAgICAgIGlmIChmdW5jKGFycmF5W2N1cnJlbnRdKSkge1xuICAgICAgICAgICAgICAgIGxlbiA9IGRpZmY7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGkgPSBjdXJyZW50ICsgMTtcbiAgICAgICAgICAgICAgICBsZW4gLT0gZGlmZiArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG93ZXJCb3VuZChhcnJheSwgZnVuYykge1xuICAgICAgICB2YXIgZGlmZiwgbGVuLCBpLCBjdXJyZW50O1xuXG4gICAgICAgIGxlbiA9IGFycmF5Lmxlbmd0aDtcbiAgICAgICAgaSA9IDA7XG5cbiAgICAgICAgd2hpbGUgKGxlbikge1xuICAgICAgICAgICAgZGlmZiA9IGxlbiA+Pj4gMTtcbiAgICAgICAgICAgIGN1cnJlbnQgPSBpICsgZGlmZjtcbiAgICAgICAgICAgIGlmIChmdW5jKGFycmF5W2N1cnJlbnRdKSkge1xuICAgICAgICAgICAgICAgIGkgPSBjdXJyZW50ICsgMTtcbiAgICAgICAgICAgICAgICBsZW4gLT0gZGlmZiArIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxlbiA9IGRpZmY7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICAgIGlnbm9yZUpTSGludEVycm9yKGxvd2VyQm91bmQpO1xuXG4gICAgVmlzaXRvcktleXMgPSB7XG4gICAgICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICAgICAgQXJyYXlFeHByZXNzaW9uOiBbJ2VsZW1lbnRzJ10sXG4gICAgICAgIEFycmF5UGF0dGVybjogWydlbGVtZW50cyddLFxuICAgICAgICBBcnJvd0Z1bmN0aW9uRXhwcmVzc2lvbjogWydwYXJhbXMnLCAnZGVmYXVsdHMnLCAncmVzdCcsICdib2R5J10sXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiBbJ2JvZHknXSxcbiAgICAgICAgQmluYXJ5RXhwcmVzc2lvbjogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiBbJ2xhYmVsJ10sXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiBbJ2NhbGxlZScsICdhcmd1bWVudHMnXSxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6IFsncGFyYW0nLCAnYm9keSddLFxuICAgICAgICBDbGFzc0JvZHk6IFsnYm9keSddLFxuICAgICAgICBDbGFzc0RlY2xhcmF0aW9uOiBbJ2lkJywgJ2JvZHknLCAnc3VwZXJDbGFzcyddLFxuICAgICAgICBDbGFzc0V4cHJlc3Npb246IFsnaWQnLCAnYm9keScsICdzdXBlckNsYXNzJ10sXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogWyd0ZXN0JywgJ2NvbnNlcXVlbnQnLCAnYWx0ZXJuYXRlJ10sXG4gICAgICAgIENvbnRpbnVlU3RhdGVtZW50OiBbJ2xhYmVsJ10sXG4gICAgICAgIERlYnVnZ2VyU3RhdGVtZW50OiBbXSxcbiAgICAgICAgRGlyZWN0aXZlU3RhdGVtZW50OiBbXSxcbiAgICAgICAgRG9XaGlsZVN0YXRlbWVudDogWydib2R5JywgJ3Rlc3QnXSxcbiAgICAgICAgRW1wdHlTdGF0ZW1lbnQ6IFtdLFxuICAgICAgICBFeHByZXNzaW9uU3RhdGVtZW50OiBbJ2V4cHJlc3Npb24nXSxcbiAgICAgICAgRm9yU3RhdGVtZW50OiBbJ2luaXQnLCAndGVzdCcsICd1cGRhdGUnLCAnYm9keSddLFxuICAgICAgICBGb3JJblN0YXRlbWVudDogWydsZWZ0JywgJ3JpZ2h0JywgJ2JvZHknXSxcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogWydpZCcsICdwYXJhbXMnLCAnZGVmYXVsdHMnLCAncmVzdCcsICdib2R5J10sXG4gICAgICAgIEZ1bmN0aW9uRXhwcmVzc2lvbjogWydpZCcsICdwYXJhbXMnLCAnZGVmYXVsdHMnLCAncmVzdCcsICdib2R5J10sXG4gICAgICAgIElkZW50aWZpZXI6IFtdLFxuICAgICAgICBJZlN0YXRlbWVudDogWyd0ZXN0JywgJ2NvbnNlcXVlbnQnLCAnYWx0ZXJuYXRlJ10sXG4gICAgICAgIExpdGVyYWw6IFtdLFxuICAgICAgICBMYWJlbGVkU3RhdGVtZW50OiBbJ2xhYmVsJywgJ2JvZHknXSxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246IFsnbGVmdCcsICdyaWdodCddLFxuICAgICAgICBNZW1iZXJFeHByZXNzaW9uOiBbJ29iamVjdCcsICdwcm9wZXJ0eSddLFxuICAgICAgICBNZXRob2REZWZpbml0aW9uOiBbJ2tleScsICd2YWx1ZSddLFxuICAgICAgICBOZXdFeHByZXNzaW9uOiBbJ2NhbGxlZScsICdhcmd1bWVudHMnXSxcbiAgICAgICAgT2JqZWN0RXhwcmVzc2lvbjogWydwcm9wZXJ0aWVzJ10sXG4gICAgICAgIE9iamVjdFBhdHRlcm46IFsncHJvcGVydGllcyddLFxuICAgICAgICBQcm9ncmFtOiBbJ2JvZHknXSxcbiAgICAgICAgUHJvcGVydHk6IFsna2V5JywgJ3ZhbHVlJ10sXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogWydhcmd1bWVudCddLFxuICAgICAgICBTZXF1ZW5jZUV4cHJlc3Npb246IFsnZXhwcmVzc2lvbnMnXSxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiBbJ2Rpc2NyaW1pbmFudCcsICdjYXNlcyddLFxuICAgICAgICBTd2l0Y2hDYXNlOiBbJ3Rlc3QnLCAnY29uc2VxdWVudCddLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogW10sXG4gICAgICAgIFRocm93U3RhdGVtZW50OiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFRyeVN0YXRlbWVudDogWydibG9jaycsICdoYW5kbGVycycsICdoYW5kbGVyJywgJ2d1YXJkZWRIYW5kbGVycycsICdmaW5hbGl6ZXInXSxcbiAgICAgICAgVW5hcnlFeHByZXNzaW9uOiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IFsnYXJndW1lbnQnXSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogWydkZWNsYXJhdGlvbnMnXSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiBbJ2lkJywgJ2luaXQnXSxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6IFsndGVzdCcsICdib2R5J10sXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6IFsnb2JqZWN0JywgJ2JvZHknXSxcbiAgICAgICAgWWllbGRFeHByZXNzaW9uOiBbJ2FyZ3VtZW50J11cbiAgICB9O1xuXG4gICAgLy8gdW5pcXVlIGlkXG4gICAgQlJFQUsgPSB7fTtcbiAgICBTS0lQID0ge307XG5cbiAgICBWaXNpdG9yT3B0aW9uID0ge1xuICAgICAgICBCcmVhazogQlJFQUssXG4gICAgICAgIFNraXA6IFNLSVBcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gUmVmZXJlbmNlKHBhcmVudCwga2V5KSB7XG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgICAgICB0aGlzLmtleSA9IGtleTtcbiAgICB9XG5cbiAgICBSZWZlcmVuY2UucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbiByZXBsYWNlKG5vZGUpIHtcbiAgICAgICAgdGhpcy5wYXJlbnRbdGhpcy5rZXldID0gbm9kZTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gRWxlbWVudChub2RlLCBwYXRoLCB3cmFwLCByZWYpIHtcbiAgICAgICAgdGhpcy5ub2RlID0gbm9kZTtcbiAgICAgICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICAgICAgdGhpcy53cmFwID0gd3JhcDtcbiAgICAgICAgdGhpcy5yZWYgPSByZWY7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQ29udHJvbGxlcigpIHsgfVxuXG4gICAgLy8gQVBJOlxuICAgIC8vIHJldHVybiBwcm9wZXJ0eSBwYXRoIGFycmF5IGZyb20gcm9vdCB0byBjdXJyZW50IG5vZGVcbiAgICBDb250cm9sbGVyLnByb3RvdHlwZS5wYXRoID0gZnVuY3Rpb24gcGF0aCgpIHtcbiAgICAgICAgdmFyIGksIGl6LCBqLCBqeiwgcmVzdWx0LCBlbGVtZW50O1xuXG4gICAgICAgIGZ1bmN0aW9uIGFkZFRvUGF0aChyZXN1bHQsIHBhdGgpIHtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMCwganogPSBwYXRoLmxlbmd0aDsgaiA8IGp6OyArK2opIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gocGF0aFtqXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJvb3Qgbm9kZVxuICAgICAgICBpZiAoIXRoaXMuX19jdXJyZW50LnBhdGgpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmlyc3Qgbm9kZSBpcyBzZW50aW5lbCwgc2Vjb25kIG5vZGUgaXMgcm9vdCBlbGVtZW50XG4gICAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgICBmb3IgKGkgPSAyLCBpeiA9IHRoaXMuX19sZWF2ZWxpc3QubGVuZ3RoOyBpIDwgaXo7ICsraSkge1xuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX19sZWF2ZWxpc3RbaV07XG4gICAgICAgICAgICBhZGRUb1BhdGgocmVzdWx0LCBlbGVtZW50LnBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGFkZFRvUGF0aChyZXN1bHQsIHRoaXMuX19jdXJyZW50LnBhdGgpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICAvLyBBUEk6XG4gICAgLy8gcmV0dXJuIGFycmF5IG9mIHBhcmVudCBlbGVtZW50c1xuICAgIENvbnRyb2xsZXIucHJvdG90eXBlLnBhcmVudHMgPSBmdW5jdGlvbiBwYXJlbnRzKCkge1xuICAgICAgICB2YXIgaSwgaXosIHJlc3VsdDtcblxuICAgICAgICAvLyBmaXJzdCBub2RlIGlzIHNlbnRpbmVsXG4gICAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgICBmb3IgKGkgPSAxLCBpeiA9IHRoaXMuX19sZWF2ZWxpc3QubGVuZ3RoOyBpIDwgaXo7ICsraSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godGhpcy5fX2xlYXZlbGlzdFtpXS5ub2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIC8vIEFQSTpcbiAgICAvLyByZXR1cm4gY3VycmVudCBub2RlXG4gICAgQ29udHJvbGxlci5wcm90b3R5cGUuY3VycmVudCA9IGZ1bmN0aW9uIGN1cnJlbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9fY3VycmVudC5ub2RlO1xuICAgIH07XG5cbiAgICBDb250cm9sbGVyLnByb3RvdHlwZS5fX2V4ZWN1dGUgPSBmdW5jdGlvbiBfX2V4ZWN1dGUoY2FsbGJhY2ssIGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHByZXZpb3VzLCByZXN1bHQ7XG5cbiAgICAgICAgcmVzdWx0ID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHByZXZpb3VzICA9IHRoaXMuX19jdXJyZW50O1xuICAgICAgICB0aGlzLl9fY3VycmVudCA9IGVsZW1lbnQ7XG4gICAgICAgIHRoaXMuX19zdGF0ZSA9IG51bGw7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgcmVzdWx0ID0gY2FsbGJhY2suY2FsbCh0aGlzLCBlbGVtZW50Lm5vZGUsIHRoaXMuX19sZWF2ZWxpc3RbdGhpcy5fX2xlYXZlbGlzdC5sZW5ndGggLSAxXS5ub2RlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9fY3VycmVudCA9IHByZXZpb3VzO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIC8vIEFQSTpcbiAgICAvLyBub3RpZnkgY29udHJvbCBza2lwIC8gYnJlYWtcbiAgICBDb250cm9sbGVyLnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbiBub3RpZnkoZmxhZykge1xuICAgICAgICB0aGlzLl9fc3RhdGUgPSBmbGFnO1xuICAgIH07XG5cbiAgICAvLyBBUEk6XG4gICAgLy8gc2tpcCBjaGlsZCBub2RlcyBvZiBjdXJyZW50IG5vZGVcbiAgICBDb250cm9sbGVyLnByb3RvdHlwZS5za2lwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm5vdGlmeShTS0lQKTtcbiAgICB9O1xuXG4gICAgLy8gQVBJOlxuICAgIC8vIGJyZWFrIHRyYXZlcnNhbHNcbiAgICBDb250cm9sbGVyLnByb3RvdHlwZVsnYnJlYWsnXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ub3RpZnkoQlJFQUspO1xuICAgIH07XG5cbiAgICBDb250cm9sbGVyLnByb3RvdHlwZS5fX2luaXRpYWxpemUgPSBmdW5jdGlvbihyb290LCB2aXNpdG9yKSB7XG4gICAgICAgIHRoaXMudmlzaXRvciA9IHZpc2l0b3I7XG4gICAgICAgIHRoaXMucm9vdCA9IHJvb3Q7XG4gICAgICAgIHRoaXMuX193b3JrbGlzdCA9IFtdO1xuICAgICAgICB0aGlzLl9fbGVhdmVsaXN0ID0gW107XG4gICAgICAgIHRoaXMuX19jdXJyZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fX3N0YXRlID0gbnVsbDtcbiAgICB9O1xuXG4gICAgQ29udHJvbGxlci5wcm90b3R5cGUudHJhdmVyc2UgPSBmdW5jdGlvbiB0cmF2ZXJzZShyb290LCB2aXNpdG9yKSB7XG4gICAgICAgIHZhciB3b3JrbGlzdCxcbiAgICAgICAgICAgIGxlYXZlbGlzdCxcbiAgICAgICAgICAgIGVsZW1lbnQsXG4gICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgbm9kZVR5cGUsXG4gICAgICAgICAgICByZXQsXG4gICAgICAgICAgICBrZXksXG4gICAgICAgICAgICBjdXJyZW50LFxuICAgICAgICAgICAgY3VycmVudDIsXG4gICAgICAgICAgICBjYW5kaWRhdGVzLFxuICAgICAgICAgICAgY2FuZGlkYXRlLFxuICAgICAgICAgICAgc2VudGluZWw7XG5cbiAgICAgICAgdGhpcy5fX2luaXRpYWxpemUocm9vdCwgdmlzaXRvcik7XG5cbiAgICAgICAgc2VudGluZWwgPSB7fTtcblxuICAgICAgICAvLyByZWZlcmVuY2VcbiAgICAgICAgd29ya2xpc3QgPSB0aGlzLl9fd29ya2xpc3Q7XG4gICAgICAgIGxlYXZlbGlzdCA9IHRoaXMuX19sZWF2ZWxpc3Q7XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB3b3JrbGlzdC5wdXNoKG5ldyBFbGVtZW50KHJvb3QsIG51bGwsIG51bGwsIG51bGwpKTtcbiAgICAgICAgbGVhdmVsaXN0LnB1c2gobmV3IEVsZW1lbnQobnVsbCwgbnVsbCwgbnVsbCwgbnVsbCkpO1xuXG4gICAgICAgIHdoaWxlICh3b3JrbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSB3b3JrbGlzdC5wb3AoKTtcblxuICAgICAgICAgICAgaWYgKGVsZW1lbnQgPT09IHNlbnRpbmVsKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IGxlYXZlbGlzdC5wb3AoKTtcblxuICAgICAgICAgICAgICAgIHJldCA9IHRoaXMuX19leGVjdXRlKHZpc2l0b3IubGVhdmUsIGVsZW1lbnQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX19zdGF0ZSA9PT0gQlJFQUsgfHwgcmV0ID09PSBCUkVBSykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZWxlbWVudC5ub2RlKSB7XG5cbiAgICAgICAgICAgICAgICByZXQgPSB0aGlzLl9fZXhlY3V0ZSh2aXNpdG9yLmVudGVyLCBlbGVtZW50KTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9fc3RhdGUgPT09IEJSRUFLIHx8IHJldCA9PT0gQlJFQUspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goc2VudGluZWwpO1xuICAgICAgICAgICAgICAgIGxlYXZlbGlzdC5wdXNoKGVsZW1lbnQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX19zdGF0ZSA9PT0gU0tJUCB8fCByZXQgPT09IFNLSVApIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbm9kZSA9IGVsZW1lbnQubm9kZTtcbiAgICAgICAgICAgICAgICBub2RlVHlwZSA9IGVsZW1lbnQud3JhcCB8fCBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgY2FuZGlkYXRlcyA9IFZpc2l0b3JLZXlzW25vZGVUeXBlXTtcblxuICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjYW5kaWRhdGVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoKGN1cnJlbnQgLT0gMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICBrZXkgPSBjYW5kaWRhdGVzW2N1cnJlbnRdO1xuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUgPSBub2RlW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGlmICghY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNBcnJheShjYW5kaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKG5ldyBFbGVtZW50KGNhbmRpZGF0ZSwga2V5LCBudWxsLCBudWxsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQyID0gY2FuZGlkYXRlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50MiAtPSAxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNhbmRpZGF0ZVtjdXJyZW50Ml0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgobm9kZVR5cGUgPT09IFN5bnRheC5PYmplY3RFeHByZXNzaW9uIHx8IG5vZGVUeXBlID09PSBTeW50YXguT2JqZWN0UGF0dGVybikgJiYgJ3Byb3BlcnRpZXMnID09PSBjYW5kaWRhdGVzW2N1cnJlbnRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IG5ldyBFbGVtZW50KGNhbmRpZGF0ZVtjdXJyZW50Ml0sIFtrZXksIGN1cnJlbnQyXSwgJ1Byb3BlcnR5JywgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBuZXcgRWxlbWVudChjYW5kaWRhdGVbY3VycmVudDJdLCBba2V5LCBjdXJyZW50Ml0sIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBDb250cm9sbGVyLnByb3RvdHlwZS5yZXBsYWNlID0gZnVuY3Rpb24gcmVwbGFjZShyb290LCB2aXNpdG9yKSB7XG4gICAgICAgIHZhciB3b3JrbGlzdCxcbiAgICAgICAgICAgIGxlYXZlbGlzdCxcbiAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICBub2RlVHlwZSxcbiAgICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICAgIGVsZW1lbnQsXG4gICAgICAgICAgICBjdXJyZW50LFxuICAgICAgICAgICAgY3VycmVudDIsXG4gICAgICAgICAgICBjYW5kaWRhdGVzLFxuICAgICAgICAgICAgY2FuZGlkYXRlLFxuICAgICAgICAgICAgc2VudGluZWwsXG4gICAgICAgICAgICBvdXRlcixcbiAgICAgICAgICAgIGtleTtcblxuICAgICAgICB0aGlzLl9faW5pdGlhbGl6ZShyb290LCB2aXNpdG9yKTtcblxuICAgICAgICBzZW50aW5lbCA9IHt9O1xuXG4gICAgICAgIC8vIHJlZmVyZW5jZVxuICAgICAgICB3b3JrbGlzdCA9IHRoaXMuX193b3JrbGlzdDtcbiAgICAgICAgbGVhdmVsaXN0ID0gdGhpcy5fX2xlYXZlbGlzdDtcblxuICAgICAgICAvLyBpbml0aWFsaXplXG4gICAgICAgIG91dGVyID0ge1xuICAgICAgICAgICAgcm9vdDogcm9vdFxuICAgICAgICB9O1xuICAgICAgICBlbGVtZW50ID0gbmV3IEVsZW1lbnQocm9vdCwgbnVsbCwgbnVsbCwgbmV3IFJlZmVyZW5jZShvdXRlciwgJ3Jvb3QnKSk7XG4gICAgICAgIHdvcmtsaXN0LnB1c2goZWxlbWVudCk7XG4gICAgICAgIGxlYXZlbGlzdC5wdXNoKGVsZW1lbnQpO1xuXG4gICAgICAgIHdoaWxlICh3b3JrbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSB3b3JrbGlzdC5wb3AoKTtcblxuICAgICAgICAgICAgaWYgKGVsZW1lbnQgPT09IHNlbnRpbmVsKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IGxlYXZlbGlzdC5wb3AoKTtcblxuICAgICAgICAgICAgICAgIHRhcmdldCA9IHRoaXMuX19leGVjdXRlKHZpc2l0b3IubGVhdmUsIGVsZW1lbnQpO1xuXG4gICAgICAgICAgICAgICAgLy8gbm9kZSBtYXkgYmUgcmVwbGFjZWQgd2l0aCBudWxsLFxuICAgICAgICAgICAgICAgIC8vIHNvIGRpc3Rpbmd1aXNoIGJldHdlZW4gdW5kZWZpbmVkIGFuZCBudWxsIGluIHRoaXMgcGxhY2VcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0ICE9PSB1bmRlZmluZWQgJiYgdGFyZ2V0ICE9PSBCUkVBSyAmJiB0YXJnZXQgIT09IFNLSVApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVwbGFjZVxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlZi5yZXBsYWNlKHRhcmdldCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX19zdGF0ZSA9PT0gQlJFQUsgfHwgdGFyZ2V0ID09PSBCUkVBSykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3V0ZXIucm9vdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhcmdldCA9IHRoaXMuX19leGVjdXRlKHZpc2l0b3IuZW50ZXIsIGVsZW1lbnQpO1xuXG4gICAgICAgICAgICAvLyBub2RlIG1heSBiZSByZXBsYWNlZCB3aXRoIG51bGwsXG4gICAgICAgICAgICAvLyBzbyBkaXN0aW5ndWlzaCBiZXR3ZWVuIHVuZGVmaW5lZCBhbmQgbnVsbCBpbiB0aGlzIHBsYWNlXG4gICAgICAgICAgICBpZiAodGFyZ2V0ICE9PSB1bmRlZmluZWQgJiYgdGFyZ2V0ICE9PSBCUkVBSyAmJiB0YXJnZXQgIT09IFNLSVApIHtcbiAgICAgICAgICAgICAgICAvLyByZXBsYWNlXG4gICAgICAgICAgICAgICAgZWxlbWVudC5yZWYucmVwbGFjZSh0YXJnZXQpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQubm9kZSA9IHRhcmdldDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuX19zdGF0ZSA9PT0gQlJFQUsgfHwgdGFyZ2V0ID09PSBCUkVBSykge1xuICAgICAgICAgICAgICAgIHJldHVybiBvdXRlci5yb290O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBub2RlIG1heSBiZSBudWxsXG4gICAgICAgICAgICBub2RlID0gZWxlbWVudC5ub2RlO1xuICAgICAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goc2VudGluZWwpO1xuICAgICAgICAgICAgbGVhdmVsaXN0LnB1c2goZWxlbWVudCk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9fc3RhdGUgPT09IFNLSVAgfHwgdGFyZ2V0ID09PSBTS0lQKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5vZGVUeXBlID0gZWxlbWVudC53cmFwIHx8IG5vZGUudHlwZTtcbiAgICAgICAgICAgIGNhbmRpZGF0ZXMgPSBWaXNpdG9yS2V5c1tub2RlVHlwZV07XG5cbiAgICAgICAgICAgIGN1cnJlbnQgPSBjYW5kaWRhdGVzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgoY3VycmVudCAtPSAxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gY2FuZGlkYXRlc1tjdXJyZW50XTtcbiAgICAgICAgICAgICAgICBjYW5kaWRhdGUgPSBub2RlW2tleV07XG4gICAgICAgICAgICAgICAgaWYgKCFjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFpc0FycmF5KGNhbmRpZGF0ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChuZXcgRWxlbWVudChjYW5kaWRhdGUsIGtleSwgbnVsbCwgbmV3IFJlZmVyZW5jZShub2RlLCBrZXkpKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGN1cnJlbnQyID0gY2FuZGlkYXRlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoKGN1cnJlbnQyIC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjYW5kaWRhdGVbY3VycmVudDJdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZVR5cGUgPT09IFN5bnRheC5PYmplY3RFeHByZXNzaW9uICYmICdwcm9wZXJ0aWVzJyA9PT0gY2FuZGlkYXRlc1tjdXJyZW50XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IG5ldyBFbGVtZW50KGNhbmRpZGF0ZVtjdXJyZW50Ml0sIFtrZXksIGN1cnJlbnQyXSwgJ1Byb3BlcnR5JywgbmV3IFJlZmVyZW5jZShjYW5kaWRhdGUsIGN1cnJlbnQyKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbmV3IEVsZW1lbnQoY2FuZGlkYXRlW2N1cnJlbnQyXSwgW2tleSwgY3VycmVudDJdLCBudWxsLCBuZXcgUmVmZXJlbmNlKGNhbmRpZGF0ZSwgY3VycmVudDIpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvdXRlci5yb290O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiB0cmF2ZXJzZShyb290LCB2aXNpdG9yKSB7XG4gICAgICAgIHZhciBjb250cm9sbGVyID0gbmV3IENvbnRyb2xsZXIoKTtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXIudHJhdmVyc2Uocm9vdCwgdmlzaXRvcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwbGFjZShyb290LCB2aXNpdG9yKSB7XG4gICAgICAgIHZhciBjb250cm9sbGVyID0gbmV3IENvbnRyb2xsZXIoKTtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXIucmVwbGFjZShyb290LCB2aXNpdG9yKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleHRlbmRDb21tZW50UmFuZ2UoY29tbWVudCwgdG9rZW5zKSB7XG4gICAgICAgIHZhciB0YXJnZXQ7XG5cbiAgICAgICAgdGFyZ2V0ID0gdXBwZXJCb3VuZCh0b2tlbnMsIGZ1bmN0aW9uIHNlYXJjaCh0b2tlbikge1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuLnJhbmdlWzBdID4gY29tbWVudC5yYW5nZVswXTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29tbWVudC5leHRlbmRlZFJhbmdlID0gW2NvbW1lbnQucmFuZ2VbMF0sIGNvbW1lbnQucmFuZ2VbMV1dO1xuXG4gICAgICAgIGlmICh0YXJnZXQgIT09IHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbW1lbnQuZXh0ZW5kZWRSYW5nZVsxXSA9IHRva2Vuc1t0YXJnZXRdLnJhbmdlWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGFyZ2V0IC09IDE7XG4gICAgICAgIGlmICh0YXJnZXQgPj0gMCkge1xuICAgICAgICAgICAgY29tbWVudC5leHRlbmRlZFJhbmdlWzBdID0gdG9rZW5zW3RhcmdldF0ucmFuZ2VbMV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29tbWVudDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhdHRhY2hDb21tZW50cyh0cmVlLCBwcm92aWRlZENvbW1lbnRzLCB0b2tlbnMpIHtcbiAgICAgICAgLy8gQXQgZmlyc3QsIHdlIHNob3VsZCBjYWxjdWxhdGUgZXh0ZW5kZWQgY29tbWVudCByYW5nZXMuXG4gICAgICAgIHZhciBjb21tZW50cyA9IFtdLCBjb21tZW50LCBsZW4sIGksIGN1cnNvcjtcblxuICAgICAgICBpZiAoIXRyZWUucmFuZ2UpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYXR0YWNoQ29tbWVudHMgbmVlZHMgcmFuZ2UgaW5mb3JtYXRpb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRva2VucyBhcnJheSBpcyBlbXB0eSwgd2UgYXR0YWNoIGNvbW1lbnRzIHRvIHRyZWUgYXMgJ2xlYWRpbmdDb21tZW50cydcbiAgICAgICAgaWYgKCF0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAocHJvdmlkZWRDb21tZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSBwcm92aWRlZENvbW1lbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSBkZWVwQ29weShwcm92aWRlZENvbW1lbnRzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudC5leHRlbmRlZFJhbmdlID0gWzAsIHRyZWUucmFuZ2VbMF1dO1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50cy5wdXNoKGNvbW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0cmVlLmxlYWRpbmdDb21tZW50cyA9IGNvbW1lbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRyZWU7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSBwcm92aWRlZENvbW1lbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb21tZW50cy5wdXNoKGV4dGVuZENvbW1lbnRSYW5nZShkZWVwQ29weShwcm92aWRlZENvbW1lbnRzW2ldKSwgdG9rZW5zKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGlzIGlzIGJhc2VkIG9uIEpvaG4gRnJlZW1hbidzIGltcGxlbWVudGF0aW9uLlxuICAgICAgICBjdXJzb3IgPSAwO1xuICAgICAgICB0cmF2ZXJzZSh0cmVlLCB7XG4gICAgICAgICAgICBlbnRlcjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29tbWVudDtcblxuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJzb3IgPCBjb21tZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9IGNvbW1lbnRzW2N1cnNvcl07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21tZW50LmV4dGVuZGVkUmFuZ2VbMV0gPiBub2RlLnJhbmdlWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21tZW50LmV4dGVuZGVkUmFuZ2VbMV0gPT09IG5vZGUucmFuZ2VbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbm9kZS5sZWFkaW5nQ29tbWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLmxlYWRpbmdDb21tZW50cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5sZWFkaW5nQ29tbWVudHMucHVzaChjb21tZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnRzLnNwbGljZShjdXJzb3IsIDEpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBhbHJlYWR5IG91dCBvZiBvd25lZCBub2RlXG4gICAgICAgICAgICAgICAgaWYgKGN1cnNvciA9PT0gY29tbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBWaXNpdG9yT3B0aW9uLkJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjb21tZW50c1tjdXJzb3JdLmV4dGVuZGVkUmFuZ2VbMF0gPiBub2RlLnJhbmdlWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBWaXNpdG9yT3B0aW9uLlNraXA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjdXJzb3IgPSAwO1xuICAgICAgICB0cmF2ZXJzZSh0cmVlLCB7XG4gICAgICAgICAgICBsZWF2ZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29tbWVudDtcblxuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJzb3IgPCBjb21tZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9IGNvbW1lbnRzW2N1cnNvcl07XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnJhbmdlWzFdIDwgY29tbWVudC5leHRlbmRlZFJhbmdlWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnJhbmdlWzFdID09PSBjb21tZW50LmV4dGVuZGVkUmFuZ2VbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbm9kZS50cmFpbGluZ0NvbW1lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS50cmFpbGluZ0NvbW1lbnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnRyYWlsaW5nQ29tbWVudHMucHVzaChjb21tZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnRzLnNwbGljZShjdXJzb3IsIDEpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBhbHJlYWR5IG91dCBvZiBvd25lZCBub2RlXG4gICAgICAgICAgICAgICAgaWYgKGN1cnNvciA9PT0gY29tbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBWaXNpdG9yT3B0aW9uLkJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjb21tZW50c1tjdXJzb3JdLmV4dGVuZGVkUmFuZ2VbMF0gPiBub2RlLnJhbmdlWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBWaXNpdG9yT3B0aW9uLlNraXA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdHJlZTtcbiAgICB9XG5cbiAgICBleHBvcnRzLnZlcnNpb24gPSAnMS4zLjMtZGV2JztcbiAgICBleHBvcnRzLlN5bnRheCA9IFN5bnRheDtcbiAgICBleHBvcnRzLnRyYXZlcnNlID0gdHJhdmVyc2U7XG4gICAgZXhwb3J0cy5yZXBsYWNlID0gcmVwbGFjZTtcbiAgICBleHBvcnRzLmF0dGFjaENvbW1lbnRzID0gYXR0YWNoQ29tbWVudHM7XG4gICAgZXhwb3J0cy5WaXNpdG9yS2V5cyA9IFZpc2l0b3JLZXlzO1xuICAgIGV4cG9ydHMuVmlzaXRvck9wdGlvbiA9IFZpc2l0b3JPcHRpb247XG4gICAgZXhwb3J0cy5Db250cm9sbGVyID0gQ29udHJvbGxlcjtcbn0pKTtcbi8qIHZpbTogc2V0IHN3PTQgdHM9NCBldCB0dz04MCA6ICovXG4iXX0=
