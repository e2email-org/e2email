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
 * @fileoverview Tests for the translate service.
 */

goog.require('e2email.components.translate.TranslateService');

describe('TranslateService', function() {
  var window_;
  var service;
  var TEST_KEY = 'test-key';
  var TEST_RESULT = 'test-result';

  beforeEach(function() {
    inject(function($injector) {
      window_ = $injector.get('$window');
      window_.chrome = {
        i18n: {
          getMessage: function(name) {
            if (name === TEST_KEY) {
              return TEST_RESULT;
            } else {
              return undefined;
            }
          }
        }
      };
    });
    service = new e2email.components.translate.TranslateService(window_);
  });

  it('should translate valid keys', function() {
    expect(service.getMessage(TEST_KEY)).toBe(TEST_RESULT);
  });

  it('should give a useful error for missing keys', function() {
    expect(service.getMessage('missing-key')).toBe(
        'Missing i18n key "missing-key"');
  });

});
