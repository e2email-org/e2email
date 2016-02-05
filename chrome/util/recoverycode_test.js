/**
 * @license
 * Copyright 2016 E2EMail authors. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Tests for the code implementation.
 */

goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2email.util.RecoveryCode');

goog.scope(function() {


describe('SecretCode', function() {

  // Check that encode and decode both behave as
  // expected.
  function verify(expected_code, expected_array) {
    expect(e2email.util.RecoveryCode.encode(expected_array))
        .toBe(expected_code);
    expect(e2email.util.RecoveryCode.decode(expected_code))
        .toEqual(expected_array);
  }

  it('should transform', function() {
    // zero-length byte arrays should work.
    verify('b4N', []);
    // Handle single-byte extremes.
    verify('2V1N4', [0]);
    verify('3xhB4', [255]);
    // A multi-byte sequence.
    verify('3CyypSi3r', [1, 2, 3, 4]);
  });

  it('should catch bad encodings', function() {
    // byte array values should be between 0 and 255
    expect(function() {
      e2email.util.RecoveryCode.encode([256]);
    }).toThrow(new e2e.error.InvalidArgumentsError(
        'Input should be a byte array.'));
    expect(function() {
      e2email.util.RecoveryCode.encode([-1]);
    }).toThrow(new e2e.error.InvalidArgumentsError(
        'Input should be a byte array.'));
    // base58 should always have the first byte as 1 (the version_number.)
    expect(function() {
      e2email.util.RecoveryCode.decode('31');
    }).toThrow(new e2e.error.InvalidArgumentsError(
        'This is not a recovery code.'));
    // Checksums errors should be detected.
    expect(function() {
      e2email.util.RecoveryCode.decode('b4M');
    }).toThrow(new e2e.error.InvalidArgumentsError(
        'Invalid recovery code, is there a typo?'));
  });


});

});  // goog.scope
