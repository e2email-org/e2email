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
 * @fileoverview Service that provides a prioritized list of
 *     completions given a partially completed string.
 */
goog.provide('e2email.components.autocomplete.AutocompleteService');
goog.provide('e2email.components.autocomplete.module');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.structs.Trie');

goog.scope(function() {



/**
 * Service that manages a prioritized list of completion strings.
 * @ngInject
 * @constructor
 */
e2email.components.autocomplete.AutocompleteService = function() {
  /**
   * Trie that maintains all the candidates, and associates it
   * with its priority. (This is used primarily to obtain the list
   * of candidates, given a prefix.)
   * @private {!goog.structs.Trie<number>}
   */
  this.candidates_ = new goog.structs.Trie();
  /**
   * Map that associates a candidate with its priority. (This is
   * maintained along with the trie to enable quicker priority lookups
   * for a given candidate.)
   * @private {!Object<string, number>}
   */
  this.candidatePriorities_ = {};
};


var AutocompleteService = e2email.components.autocomplete.AutocompleteService;


/**
 * Adds a new candidate as a completion, and increments its priority
 * by the provided amount if it already exists.
 * @param {string} candidate A candidate completion.
 * @param {number} priority The priority for this candidate.
 */
AutocompleteService.prototype.addCandidate = function(candidate, priority) {
  var curPriority = priority;
  // Increment with any existing priority for this candidate.
  var existingPriority = this.candidatePriorities_[candidate];
  if (goog.isNumber(existingPriority)) {
    curPriority += existingPriority;
  }
  // Add or update the entry in the trie and the lookup map.
  this.candidates_.set(candidate, curPriority);
  this.candidatePriorities_[candidate] = curPriority;
};


/**
 * Returns a prioritized list of completions for a partially completed
 * string.
 * @param {string} partial The partially completed string.
 * @return {!Array<string>} An array of candidate completions, with the
 *     highest priority candidates at the beginning of the list.
 */
AutocompleteService.prototype.getCandidates = function(partial) {
  var candidateKeys = this.candidates_.getKeys(partial);
  // Remove candidates that are the same as the prefix.
  candidateKeys = candidateKeys.filter(function(candidate) {
    return (candidate !== partial);
  });
  // Sort this array by decreasing order of priority.
  goog.array.sort(candidateKeys, goog.bind(function(candidate1, candidate2) {
    return goog.asserts.assertNumber(this.candidatePriorities_[candidate2]) -
        goog.asserts.assertNumber(this.candidatePriorities_[candidate1]);
  }, this));
  return candidateKeys;
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.autocomplete.module = angular
    .module('e2email.components.autocomplete.AutocompleteService', [])
    .service('autocompleteService', AutocompleteService);

});  // goog.scope
