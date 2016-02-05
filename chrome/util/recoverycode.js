/**
 * @license
 * Copyright 2016 E2EMail authors. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview convert byte array to and from a readable code.
 * The code is essentially a base58 encoding of the array, but the
 * array is prefixed with a single version byte.
 */
goog.provide('e2email.util.RecoveryCode');

goog.require('e2e.BigNum');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('goog.array');
goog.require('goog.crypt.Sha1');

goog.scope(function() {


/**
 * Base constant used for base58 calculations.
 * @type {number}
 * @const
 * @private
 */
var NUM58_ = 58;


/**
 * Bignum base constant, used for base58 calculations.
 * @type {!e2e.BigNum}
 * @const
 * @private
 */
var BIGNUM58_ = e2e.BigNum.fromInteger(NUM58_);


/**
 * Code version.
 * @type {number}
 * @const
 * @private
 */
var CODE_VERSION_ = 1;


/**
 * Base58 Alphabet array.
 * @type {string}
 * @const
 * @private
 */
var BASE58ALPHABET_ =
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';


/**
 * Base58 map - from character to number.
 * @type {Object<string,!e2e.BigNum>}
 * @private
 */
var BASE58MAP_ = {};
(function() {
  var len = BASE58ALPHABET_.length;
  for (var i = 0; i < len; i++) {
    BASE58MAP_[BASE58ALPHABET_[i]] = e2e.BigNum.fromInteger(i);
  }
})();


/**
 * This is the current implementation of converting a series of
 * bytes into a code.
 * 1. Concatenate the version (1) with the payload.
 * 2. Take the first 2 bytes of the sha-1 of the above bytearray, and append
 *    it. This is used only as a checksum, to avoid accidental typos.
 * 3. Convert the above array into a big-endian number, then do base58
 *     encoding with the typical base58 alphabet.
 * @param {!e2e.ByteArray} bytes
 * @return {string} encoded value.
 */
e2email.util.RecoveryCode.encode = function(bytes) {

  // 1. Prepend the payload with the version.
  bytes = goog.array.concat(CODE_VERSION_, bytes);

  // 2. Calculate the sha1.
  var sha1 = new goog.crypt.Sha1();
  sha1.update(bytes);

  // 3. Append the first 2 bytes of the sha1.
  bytes = goog.array.concat(bytes, sha1.digest().slice(0, 2));

  // Note: CODE_VERSION_ > 0, so this array has no leading zeros.
  // Therefore, we don't perform any additional operations related to
  // handling leading zeros.

  // unfinished holds the portion of the number that has not yet been
  // converted.  We div this number by the base until it is zero.
  var unfinished = new e2e.BigNum(bytes);
  var result = [];
  while (unfinished.compare(e2e.BigNum.ZERO) > 0) {
    var qr = unfinished.divmodInt(NUM58_);
    unfinished = qr.quotient;
    result.push(BASE58ALPHABET_[qr.remainder]);
  }
  return result.reverse().join('');
};


/**
 * This is the inverse of the encoding operation. Converts the string
 * into a big-endian number, with the standard base58 alphabet.
 * Convert it into a bytearray, check that the first byte is the
 * version byte, verify the checksum and return the payload.
 * @param  {string} code is the encoded string.
 * @return {!e2e.ByteArray}
 */
e2email.util.RecoveryCode.decode = function(code) {
  // Holds the bignum represented by the code.
  var val = e2e.BigNum.ZERO.clone();
  var len = code.length;
  for (var i = 0; i < len; i++) {
    val = val.multiply(BIGNUM58_).add(BASE58MAP_[code[i]]);
  }
  var result = val.toByteArray();
  // length should at least be 1(version) + 2(checksum) bytes
  if (result.length < 3) {
    throw new e2e.error.InvalidArgumentsError(
        'This is not a recovery code.');
  }
  if (result[0] !== CODE_VERSION_) {
    throw new e2e.error.InvalidArgumentsError(
        'This is not a recovery code.');
  }
  // Verify the checksum.
  var expected = result.slice(-2);
  var sha1 = new goog.crypt.Sha1();
  sha1.update(result.slice(0, -2));
  var actual = sha1.digest().slice(0, 2);
  if (!goog.array.equals(expected, actual)) {
    throw new e2e.error.InvalidArgumentsError(
        'Invalid recovery code, is there a typo?');
  }
  return result.slice(1, -2);
};


});  // goog.scope
