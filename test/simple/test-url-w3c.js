// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var fs = require('fs');
var assert = require('assert');
var url = require('url');
var util = require('util');

var rawTestData = fs.readFileSync(
  __dirname + '/../fixtures/urltestdata.txt',
  {encoding: 'utf8'}
);

var parsedData = []

rawTestData.split('\n').forEach(function (testData) {
  if (!testData || testData[0] === '#') return
  var splitData = testData.split(' ')
  if (splitData.length < 2) return

  var test = splitData.shift()

  var expected = {
    protocol: null,
    slashes: true,
    auth: null,
    host: null,
    port: null,
    hostname: null,
    hash: null,
    search: null,
    query: null,
    pathname: null,
    path: null,
    href: null
  }

  var segment, key, value, colon
  for (var i = 0; i < splitData.length; i++) {
    segment = splitData[i]
    if (!segment || segment[0] === '#') continue

    colon = segment.indexOf(':')
    if (colon <= 0) continue

    key = segment.substring(0, colon)
    value = segment.substring(colon+1)

    switch (key) {
      case 's': expected.protocol = value + ':'; break;
      case "u": expected.auth = value + (expected.auth || ''); break;
      case "pass": expected.auth = (expected.auth || '') + ':' + value; break;
      case "h": expected.hostname = value; break;
      case "port": expected.port = value; break;
      case "p": expected.pathname = value; break;
      case "q": expected.query = value; break;
      case "f": expected.fragment = value; break;
      default: continue
    }
  }
  expected.host = expected.hostname
  if (expected.port !== null) {
    expected.host += (':' + expected.port)
  }

  parsedData.push([test, expected])
})

var passes = 0
var failures = 0

for (var i = 0; i < parsedData.length; i++) {
  var test = parsedData[i];
  var parsedUrl = url.parse(test[0])
  parsedUrl.href = null
  var pass = _deepEqual(parsedUrl, test[1], util.format(
    '%s\n%s\n!=\n%s',
    test[0],
    JSON.stringify(parsedUrl, null, 2),
    JSON.stringify(test[1], null, 2)
  ))
  if (pass) {
    console.log('good: %s', test[0])
    passes++
  } else {
    console.log('bad: %s', test[0])
    failures++
  }
}

console.log('passes: %s\nfailures: %s', passes, failures)


function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = Object.keys(a),
        kb = Object.keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}