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
 * @fileoverview Tests for the email implementation.
 */

goog.require('e2email.util.Email');

goog.scope(function() {


describe('Email utility', function() {
  var email = e2email.util.Email;
  it('checks the parseEmail function', function() {
    var mockEmail = null;
    expect(email.parseEmail(mockEmail)).toBe(null);
    mockEmail = 'example@gmail';
    expect(email.parseEmail(mockEmail)).toBe(null);
    mockEmail = 'example.com';
    expect(email.parseEmail(mockEmail)).toBe(null);
    mockEmail = 'example@gmail.com';
    expect(email.parseEmail(mockEmail)).toBe(mockEmail);
  });
});

});  // goog.scope
