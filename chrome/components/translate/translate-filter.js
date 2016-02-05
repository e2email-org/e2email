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
 * @fileoverview Angular filter providing access to Chrome's i18n API.
 */

goog.provide('e2email.components.translatefilter');
goog.provide('e2email.components.translatefilter.module');


goog.scope(function() {


/**
 * A filter that converts a message key (or an array of strings
 * that starts with the key and is followed by substitution parameters)
 * into a translated string.
 * @param {!e2email.components.translate.TranslateService} translateService
 *     The TranslateService instance that uses Chrome's i18n API.
 * @return {function ((string|!Array.<string>)): string} The filter.
 * @ngInject
 */
e2email.components.translatefilter.translateFilter = function(
    translateService) {
  return function(input) {
    if (!goog.isDefAndNotNull(input)) {
      return '';
    }
    if (goog.isString(input)) {
      return translateService.getMessage(input);
    } else if (goog.isArray(input) && input.length >= 1) {
      return translateService.getMessage(input[0], input.slice(1));
    } else {
      return 'Invalid i18n key for translate filter.';
    }
  };
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.translatefilter.module = angular
    .module('e2email.components.translatefilter.TranslateFilter', [])
    .filter('translate', e2email.components.translatefilter.translateFilter);

});  // goog.scope
