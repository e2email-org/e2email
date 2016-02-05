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
 * @fileoverview Tests for the autocomplete service.
 */

goog.require('e2email.components.autocomplete.AutocompleteService');

describe('AutocompleteService', function() {
  var service;

  beforeEach(function() {
    service = new e2email.components.autocomplete.AutocompleteService();
  });

  it('should prioritize candidates properly', function() {
    var i;
    for (i = 0; i < 5; i++) {
      service.addCandidate('candidate' + i, i);
    }
    var result = service.getCandidates('can');
    expect(result.length).toBe(5);
    // Candidates should now be reverse sorted.
    for (i = 0; i < 5; i++) {
      expect(result[i]).toBe('candidate' + (4 - i));
    }
  });
});
