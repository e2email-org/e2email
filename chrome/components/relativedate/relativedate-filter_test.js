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
 * @fileoverview Tests for the relativedate filter.
 */

goog.require('e2email.components.relativedate');

describe('RelativeDate', function() {

  var mockFilter = function(name) {
    if (name === 'date') {
      return function(date, format) {
        // For testing purposes, just return the parameters
        // so we can check it was called correctly.
        return {
          'date': date,
          'format': format
        };
      };
    } else {
      return null;
    }
  };

  var filter = e2email.components.relativedate.dateFormatFilter(
      mockFilter);

  it('should return short dates in different years', function() {
    var date = new Date(2001, 1, 1);
    expect(filter(date)).toEqual({
      'date': date,
      'format': 'shortDate'
    });
  });

});
