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
 * @fileoverview controller for the authorization page.
 */
goog.provide('e2email.pages.authorization.AuthorizationCtrl');

goog.scope(function() {



/**
 * Authorization page controller. The view is launched if the application
 * discovers the user is not authorized to connect to Gmail but the user
 * is logged in to chrome, and
 * contains a method to launch the sign-in prcoess. If the sign-in flow
 * succeeds, it launches the setup view, otherwise it remains in this
 * view.
 *
 * @param {!angular.$location} $location the angular $location service.
 * @param {!e2email.components.translate.TranslateService} translateService
 * @param {!e2email.components.gmail.GmailService} gmailService
 *     the gmail service.
 * @constructor
 * @ngInject
 * @export
 */
e2email.pages.authorization.AuthorizationCtrl = function(
    $location, translateService, gmailService) {
  /** @type {boolean} */
  this.inProgress = false;
  /**
   * @private {!angular.$location}
   */
  this.location_ = $location;
  /**
   * @private {!e2email.components.translate.TranslateService}
   */
  this.translateService_ = translateService;
  /**
   * @private {!e2email.components.gmail.GmailService}
   */
  this.gmailService_ = gmailService;
  /**
   * @type {?string}
   */
  this.status = null;
};

var AuthorizationCtrl = e2email.pages.authorization.AuthorizationCtrl;


/**
 * Start the chrome OAuth signin-process.
 * @export
 */
AuthorizationCtrl.prototype.signIn = function() {
  this.inProgress = true;
  this.status = this.translateService_.getMessage('requestApprovalStatus');

  this.gmailService_.signIn().then(goog.bind(function(approved) {
    if (approved) {
      this.status = null;
      this.location_.path('/setup');
    } else {
      // stay where we are.
      this.status = this.translateService_.getMessage(
          'approvalUnavailableStatus');
    }
  }, this)).catch(goog.bind(function(err) {
    this.status = err.toString();
  }, this)).finally(goog.bind(function() {
    this.inProgress = false;
  }, this));
};


/**
 * Returns the current status.
 * @return {?string} The status message.
 * @export
 */
AuthorizationCtrl.prototype.getStatus = function() {
  return this.status;
};


/**
 * Returns whether there's an in-progress operation.
 * @return {boolean} returns true if there's an in-progress operation.
 * @export
 */
AuthorizationCtrl.prototype.isInProgress = function() {
  return this.inProgress;
};


});  // goog.scope