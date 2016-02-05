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
 * @fileoverview controller for the showsecret key view.
 */
goog.provide('e2email.pages.showsecret.ShowSecretCtrl');

goog.require('e2email.constants.Location');

goog.scope(function() {



/**
 * ShowSecret  page controller.
 *
 * @param {!angular.Scope} $scope
 * @param {!angular.$location} $location angular location service.
 * @param {!e2email.components.translate.TranslateService} translateService
 *     The translate service.
 * @param {!e2email.components.openpgp.OpenPgpService} openpgpService
 *     The OpenPGP service.
 * @param {!e2email.components.gmail.GmailService} gmailService
 *     The Gmail service.
 * @constructor
 * @ngInject
 * @export
 */
e2email.pages.showsecret.ShowSecretCtrl = function(
    $scope, $location, translateService, openpgpService, gmailService) {
  /** @private */
  this.location_ = $location;
  /** @private */
  this.openpgpService_ = openpgpService;
  /** @private */
  this.gmailService_ = gmailService;
  /**
   * @type {?string}
   */
  this.status = translateService.getMessage('generateCodeStatus');
  /**
   * @type {?string}
   */
  this.code = null;
  $scope.$on('$viewContentLoaded', goog.bind(this.generateCode_, this));
};

var ShowSecretCtrl = e2email.pages.showsecret.ShowSecretCtrl;


/**
 * Redirects to the threads view.
 * @export
 */
ShowSecretCtrl.prototype.proceed = function() {
  this.location_.path(e2email.constants.Location.THREADS);
};


/**
 * Requests the context for a backup code.
 * @private
 */
ShowSecretCtrl.prototype.generateCode_ = function() {
  this.openpgpService_.getSecretBackupCode(this.gmailService_.mailbox.email)
      .then(goog.bind(function(code) {
        this.status = null;
        this.code = this.nicelyFormat_(code);
      }, this)).catch(goog.bind(function(err) {
        this.status = err.toString();
      }, this));
};


/**
 * Given a string, chunks it to make it somewhat easier to read.
 * @param {string} input
 * @return {string} formatted string.
 * @private
 */
ShowSecretCtrl.prototype.nicelyFormat_ = function(input) {
  return input.match(/.{1,5}/g).join(' ');
};

});  // goog.scope
