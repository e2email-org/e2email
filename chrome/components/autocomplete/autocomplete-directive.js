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
 * @fileoverview Angular directive providing a simple autocomplete tag.
 */

goog.provide('e2email.components.autocompletedirective');
goog.provide('e2email.components.autocompletedirective.module');

goog.require('goog.array');
goog.require('goog.events.KeyCodes');

goog.scope(function() {


/**
 * A directive that provides autocomplete services for email addresses.
 * @param {!angular.JQLite} $document The angular $document service.
 * @param {!angular.$timeout} $timeout The angular $timeout service.
 * @param {!e2email.components.autocomplete.AutocompleteService}
 *     autocompleteService that hosts a prioritized list of completions.
 * @return {!angular.Directive} The directive.
 * @ngInject
 */
e2email.components.autocompletedirective.autocompleteDirective = function(
    $document, $timeout, autocompleteService) {

  var link = function(scope, element, attrs) {
    scope['suggestions'] = [];
    scope['primarySuggestion'] = '';
    scope['selectSuggestion'] = 0;
    var done = scope['done'];
    var jqInput = element.find('input');
    var userInput = jqInput[0];
    var nextInput = goog.array.find(
        element.parent().find('input'), function(input) {
          return (angular.element(input).hasClass('ac-tabbable'));
        });
    var key = goog.events.KeyCodes;

    // Select specific suggestion from the list based on
    // user's up/down keystrokes
    var browseSuggestions = function(event) {
      // prevent overflow
      scope['selectSuggestion'] =
          scope['selectSuggestion'] % (scope['suggestions'].length);
      scope.$apply(function() {
        scope['primarySuggestion'] =
            scope['suggestions'][scope['selectSuggestion']];
      });
      event.preventDefault(); // keep the cursor at the end of the line
    };

    // If we encounter the tab/enter characters, assume this is
    // equivalent to completing any existing suggestion.
    jqInput.unbind('keydown');
    jqInput.bind('keydown', function(event) {
      if (event.keyCode === key.TAB || event.keyCode === key.ENTER) {
        scope['selectSuggestion'] = 0;
        var completion = scope['primarySuggestion'];
        if (goog.isString(completion) && (completion.length > 0)) {
          scope.$apply(function() {
            scope['ngModel'] = completion;
          });
        }
      }else if (event.keyCode === key.DOWN) {
        if (scope['suggestions'].length != 0) {
          scope['selectSuggestion'] += 1;
          browseSuggestions(event);
        }
      }else if (event.keyCode === key.UP) {
        if (scope['suggestions'].length != 0) {
          // decrement, without becoming negative
          //(scope['selectSuggestion'] will eventually be 'mod'ed
          // by scope['suggestions'.length])
          scope['selectSuggestion'] += (scope['suggestions'].length - 1);
          browseSuggestions(event);
        }
      }else {
        scope['selectSuggestion'] = 0;
      }
      return false;
    });

    scope['onBlur'] = function() {
      scope['selectSuggestion'] = 0;
      // If there are no active suggestions, then use the contents
      // as-is.
      if (scope['suggestions'].length === 0) {
        done();
      } else {
        // Blur occurred while there was an active selection menu.
        // This may happen if the menu itself is being selected. So,
        // wait for a bit, then decide what to do.
        $timeout(function() {
          if ($document[0].activeElement !== userInput) {
            // User is not in our text entry, so take its contents
            // as the desired value.
            scope['suggestions'] = [];
            scope['primarySuggestion'] = '';
            done();
          }
        }, 1000);
      }
    };

    scope['clickSelectSuggestion'] = function(value) {
      if (goog.isDefAndNotNull(value)) {
        scope['ngModel'] = value;
      }
      if (goog.isDefAndNotNull(nextInput)) {
        nextInput.focus();
      }
    };

    scope.$watch('ngModel', function(value) {
      var primary = '';
      var suggestions = [];
      if (goog.isString(value) && value.length > 0) {
        suggestions = autocompleteService.getCandidates(value);
        if (suggestions.length > 0) {
          primary = suggestions[0];
        }
      }
      scope['suggestions'] = suggestions;
      scope['primarySuggestion'] = primary;
    });
  };

  return {
    restrict: 'E',
    scope: {
      acHint: '@',
      ngModel: '=',
      done: '&acDone'
    },
    replace: true,
    templateUrl: 'components/autocomplete/autocomplete.html',
    link: link
  };
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.autocompletedirective.module = angular
    .module(
        'e2email.components.autocompletedirective.AutocompleteDirective', [])
    .directive(
        'autocomplete',
        e2email.components.autocompletedirective.autocompleteDirective);
});  // goog.scope
