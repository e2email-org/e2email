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
 * @fileoverview Service providing access to Chrome's i18n API.
 */
goog.provide('e2email.components.translate.TranslateService');
goog.provide('e2email.components.translate.module');


goog.scope(function() {



/**
 * Service that provides access to Chrome's i18n API.
 * @param {!angular.$window} $window The angular $window service.
 * @ngInject
 * @constructor
 */
e2email.components.translate.TranslateService = function($window) {
  /** @private */
  this.chrome_ = $window.chrome;
};

var TranslateService = e2email.components.translate.TranslateService;


/**
 * Takes a translation key and optional substitution parameters,
 * and returns a translated string. If the key doesn't exist, it
 * will still return a string but with some error text to identify
 * the missing key.
 * @param {string} messageName A key for the translation message.
 * @param {(string|Array.<string>)=} opt_args A string, or array
 *     of strings to use for substitution parameters.
 * @return {string}
 */
TranslateService.prototype.getMessage = function(messageName, opt_args) {
  if (!goog.isDefAndNotNull(messageName)) {
    return 'No message key specified';
  }
  var result = this.chrome_.i18n.getMessage(messageName, opt_args);
  if (goog.isDefAndNotNull(result)) {
    return result;
  } else {
    return 'Missing i18n key "' + messageName + '"';
  }
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.translate.module = angular
    .module('e2email.components.translate.TranslateService', [])
    .service('translateService', TranslateService);

});  // goog.scope
