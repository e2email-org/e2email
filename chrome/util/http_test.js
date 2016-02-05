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
 * @fileoverview Tests for the http implementation.
 */

goog.require('e2email.util.Http');

goog.scope(function() {


describe('http utility', function() {
  var http = e2email.util.Http;
  it('should check for a proper HTTP response', function() {
    var mockResponse = { };
    mockResponse.data = {};
    // Missing a status, should fail.
    expect(http.goodResponse(mockResponse)).toBe(false);
    // This should fail, as status is not a number.
    mockResponse.status = '200';
    expect(http.goodResponse(mockResponse)).toBe(false);
    mockResponse.status = 400;
    // This should fail, as status is not OK.
    expect(http.goodResponse(mockResponse)).toBe(false);
    mockResponse.status = 200;
    mockResponse.data = undefined;
    // This should fail, as there is no data.
    expect(http.goodResponse(mockResponse)).toBe(false);
    mockResponse.data = {};
    // This should work.
    expect(http.goodResponse(mockResponse)).toBe(true);
  });

});

});  // goog.scope
