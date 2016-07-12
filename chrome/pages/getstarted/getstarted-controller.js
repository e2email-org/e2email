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
 * @fileoverview controller for the getstarted page.
 */
goog.provide('e2email.pages.getstarted.GetStartedCtrl');

goog.scope(function() {

/**
 * @param {!angular.$location} $location the angular $location service.
 * @param {!e2email.components.translate.TranslateService} translateService
 * @constructor
 * @ngInject
 * @export
 */
e2email.pages.getstarted.GetStartedCtrl = function(
    $location, translateService) {
  /**
   * @private {!angular.$location}
   */
  this.location_ = $location;
  /**
   * @private {!e2email.components.translate.TranslateService}
   */
  this.translateService_ = translateService;
};

var GetStartedCtrl = e2email.pages.getstarted.GetStartedCtrl;
/**
 * Redirects to the welcome view.
 * @export
 */
GetStartedCtrl.prototype.proceed = function() {
  this.location_.path(e2email.constants.Location.WELCOME);
};

});  // goog.scope