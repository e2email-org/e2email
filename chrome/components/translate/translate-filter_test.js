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
 * @fileoverview Tests for the translate filter.
 */

goog.require('e2email.components.translatefilter');

describe('TranslateFilter', function() {

  var TEST_KEY = 'test-key';
  var TEST_RESULT = 'test-result';
  var TEST_MULTI_RESULT = 'test-multi-result';
  var TEST_ARG = 'test-arg';

  var mockService = {
    getMessage: function(data, opt_arg) {
      if (data === TEST_KEY) {
        if (!goog.isDefAndNotNull(opt_arg)) {
          return TEST_RESULT;
        } else if (goog.isArray(opt_arg) && (opt_arg.length == 1) &&
            (opt_arg[0] === TEST_ARG)) {
          return TEST_MULTI_RESULT;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
  };

  var filter = e2email.components.translatefilter.translateFilter(
      mockService);

  it('should translate simple keys', function() {
    expect(filter(TEST_KEY)).toBe(TEST_RESULT);
  });

  it('should translate keys with arguments', function() {
    expect(filter([TEST_KEY, TEST_ARG])).toBe(TEST_MULTI_RESULT);
  });

  it('should return an empty string for undefined input', function() {
    expect(filter(undefined)).toBe('');
  });

  it('should catch unexpected input', function() {
    expect(filter(42)).toBe('Invalid i18n key for translate filter.');
  });

});
