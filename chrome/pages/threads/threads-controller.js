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
 * @fileoverview Controller for the mailbox threads view.
 */
goog.provide('e2email.pages.threads.ThreadsCtrl');
goog.provide('e2email.pages.threads.ThreadsCtrl.Compose');


goog.require('e2email.constants.Location');
goog.require('e2email.util.Email');
goog.require('goog.array');


goog.scope(function() {


/**
 * The URL to an FAQ page for the application.
 * @const
 * @private
 */
var FAQ_URL_ = 'https://github.com/e2email-org/e2email';


/**
 * The URL to an issues form for the application.
 * @const
 * @private
 */
var ISSUES_URL_ = 'https://github.com/e2email-org/e2email/issues';


/**
 * The name for a browser window where external information is
 * displayed.
 * @const
 * @private
 */
var WINDOW_NAME_ = '__e2email_browser__';


/**
 * The display options for a window that's spawned to show external
 * information.
 * @const
 * @private
 */
var WINDOW_OPTIONS_ = '';


/**
 * The event keycode for the 'enter' key.
 * @const
 * @private
 */
var KEYCODE_ENTER_ = 13;



/**
 * Threads page controller.
 *
 * @param {!angular.Scope} $scope
 * @param {!angular.$location} $location The Angular location service.
 * @param {!angular.$window} $window The Angular window service.
 * @param {!e2email.components.translate.TranslateService} translateService
 *     The translation service.
 * @param {!e2email.components.gmail.GmailService} gmailService
 *     The gmail service.
 * @param {!e2email.components.openpgp.OpenPgpService} openpgpService The
 *     OpenPGP service.
 * @constructor
 * @ngInject
 * @export
 */
e2email.pages.threads.ThreadsCtrl = function(
    $scope, $location, $window,
    translateService, gmailService, openpgpService) {
  /** @private */
  this.location_ = $location;
  /** @private */
  this.window_ = $window;
  /** @private */
  this.translateService_ = translateService;
  /** @private */
  this.gmailService_ = gmailService;
  /** @private */
  this.openpgpService_ = openpgpService;


  /** @type {?string} */
  this.status = null;


  /** @type {!e2email.pages.threads.ThreadsCtrl.Compose} */
  this.compose = {
    'recipient': null,
    'show': false,
    'validRecipient': false,
    'missingRecipient': null,
    'invalidRecipient': null,
    'subject': null,
    'message': null,
    'attachments': []
  };


  /**
   * Holds the state of the menu dropdown.
   * @type {boolean}
   */
  this.showDropdown = false;


  /**
   * This is set to true whenever the controller
   * is performing a refresh operation.
   * @type {boolean}
   */
  this.inRefresh = false;


  /**
   * Holds the state of any trash-thread requests.
   * @type {boolean}
   */
  this.showTrash = false;


  /**
   * Holds the state of any in-progress invites.
   * @type {boolean}
   */
  this.inviteInProgress = false;


  /**
   * Title for button to invite someone to install the app.
   * @type {string}
   */
  this.inviteMissingRecipientTitle = 'inviteTitle';


  this.threads = gmailService.mailbox.threads;
  $scope.$on('$viewContentLoaded', goog.bind(function() {
    this.gmailService_.refresh(false, this)
        .then(goog.bind(this.updateScreen_, this));
  }, this));
};


/**
 * Typedef that describes the model for any new messages
 * composed by the user.
 * @typedef {!{
 *   recipient: ?string,
 *   show: boolean,
 *   validRecipient: boolean,
 *   missingRecipient: ?string,
 *   invalidRecipient: ?string,
 *   subject: ?string,
 *   message: ?string,
 *   attachments: Array<Object>
* }}
 */
e2email.pages.threads.ThreadsCtrl.Compose;

var ThreadsCtrl = e2email.pages.threads.ThreadsCtrl;


/**
 * Redirect the application to a view that shows all (decrypted) messages
 * within the requested thread.
 * @param {string} threadId The id for thread to view.
 * @export
 */
ThreadsCtrl.prototype.showMessages = function(threadId) {
  // A quick check that we actually have something interesting at the
  // requested thread.
  if (goog.isDefAndNotNull(threadId) &&
      goog.isDefAndNotNull(this.gmailService_.getThread(threadId))) {
    this.location_.path(e2email.constants.Location.MESSAGES + '/' + threadId);
  }
};


/**
 * Toggles marking this thread for operations.
 * within the requested thread.
 * @param {!angular.Scope.Event} event The event that triggered this call.
 * @param {!e2email.models.mail.Thread} thread The thread to mark.
 * @export
 */
ThreadsCtrl.prototype.toggleMarkedThread = function(event, thread) {
  event.stopPropagation();
  this.updateScreen_();
};


/**
 * Launches a new browser window with an FAQ for the application.
 * @export
 */
ThreadsCtrl.prototype.showFAQ = function() {
  this.window_.open(FAQ_URL_, WINDOW_NAME_, WINDOW_OPTIONS_);
  this.showDropdown = false;
};


/**
 * Returns whether the controller is currently in the middle of
 * a refresh operation.
 * @return {boolean}
 * @export
 */
ThreadsCtrl.prototype.isRefreshing = function() {
  return this.inRefresh;
};


/**
 * Launches a new browser window with an issues form for the application.
 * @export
 */
ThreadsCtrl.prototype.showIssues = function() {
  this.window_.open(ISSUES_URL_, WINDOW_NAME_, WINDOW_OPTIONS_);
  this.showDropdown = false;
};


/**
 * Redirects the application to the settings view.
 * @export
 */
ThreadsCtrl.prototype.showSettings = function() {
  this.location_.path(e2email.constants.Location.SETTINGS);
};


/**
 * Updates the title bar and the visibility of the trash icon.
 * @private
 */
ThreadsCtrl.prototype.updateScreen_ = function() {
  this.showTrash = goog.array.some(
      this.gmailService_.mailbox.threads, function(thread) {
        return thread.isMarked;
      });
  var unreadCount = goog.array.reduce(
      this.gmailService_.mailbox.threads,
      function(accum, thread, index, arr) {
        return accum + (thread.unread ? 1 : 0);
      }, 0);
  var totalCount = this.gmailService_.mailbox.threads.length;
  if (totalCount == 0) {
    this.window_.document.title =
        this.translateService_.getMessage('noThreadsTitle');
  } else {
    this.window_.document.title =
        this.translateService_.getMessage('inboxCountTitle', [
          unreadCount.toString(), totalCount.toString()]);
  }
};


/**
 * Trashes all marked threads.
 * @export
 */
ThreadsCtrl.prototype.trashMarkedThreads = function() {
  this.gmailService_.trashMarkedThreads(this)
      .then(goog.bind(this.updateScreen_, this));
};


/**
 * Requests that the message compose model be initialized or destroyed.
 * @param {boolean} show A boolean that is set to true to indicate
 *     the model is to be initialized, and false to be destroyed.
 * @export
 */
ThreadsCtrl.prototype.showCompose = function(show) {
  this.compose['show'] = show;
  if (!show) {
    this.compose['recipient'] = null;
    this.compose['validRecipient'] = false;
    this.compose['missingRecipient'] = null;
    this.compose['invalidRecipient'] = null;
    this.compose['subject'] = null;
    this.compose['message'] = null;
    this.compose['attachments'] = null;
  } else {
    this.window_.document.querySelector('div.maincontent').scrollIntoView(true);
  }
};


/**
 * Removes any recipient within the compose model.
 * @export
 */
ThreadsCtrl.prototype.cancelRecipient = function() {
  this.compose.missingRecipient = null;
  this.compose.invalidRecipient = null;
  this.compose.validRecipient = false;
  this.compose.recipient = null;
  this.inviteInProgress = false;
  this.compose.attachments = null;
  this.inviteMissingRecipientTitle = 'inviteTitle';
};


/**
 * Sends an invite to a recipient entered by the user in the
 * compose window.
 * @export
 */
ThreadsCtrl.prototype.inviteMissingRecipient = function() {
  if (!goog.isDefAndNotNull(this.compose.missingRecipient)) {
    // silently close dialogs.
    this.cancelRecipient();
    this.showCompose(false);
    return;
  }

  this.inviteInProgress = true;
  this.inviteMissingRecipientTitle = 'inviteInProgressStatus';
  this.gmailService_.sendInvite([this.compose.missingRecipient])
      .catch(goog.bind(function(error) {
        this.status = error.message;
      }, this)).finally(goog.bind(function() {
        this.cancelRecipient();
        this.showCompose(false);
      }, this));
};


/**
 * Validates the recipient currently found within the compose
 * model, and updates its state.
 * It is called whenever the user changes something in the recipients
 * field of the compose model, and triggers a check for an associated
 * public key if it detects the user has requested a valid email
 * address as the recipient. It also updates the state of the compose
 * model so that the user can continue to compose the email if a valid
 * public key was found, or prevents it until a valid recipient was
 * entered.
 * @export
 */
ThreadsCtrl.prototype.validateRecipient = function() {
  // Mark recipient as invalid until we've explicitly confirmed they
  // have a public key.
  this.compose['validRecipient'] = false;
  var recipient = this.compose['recipient'];
  if (!goog.isDefAndNotNull(recipient)) {
    this.recipient = null;
    return;
  }
  this.compose['missingRecipient'] = null;


  // Check that we have a properly formatted email address first.
  var parsed = e2email.util.Email.parseEmail(recipient);
  if (!goog.isDefAndNotNull(parsed)) {
    this.compose['invalidRecipient'] = recipient;
    this.compose['recipient'] = null;
    return;
  }
  recipient = parsed;
  this.compose['recipient'] = recipient;
  this.compose['invalidRecipient'] = null;


  // Check whether the recipient has an acceptable public key.
  this.compose.status = this.translateService_.getMessage(
      'verifyRecipientStatus');
  this.openpgpService_.getVerifiedPublicKey(recipient)
      .then(goog.bind(function(result) {
        if (!goog.isDefAndNotNull(result)) {
          this.compose['recipient'] = null;
          this.compose['missingRecipient'] = recipient;
        } else {
          // TODO(kbsriram) warning if local and remote are different.
          this.compose['validRecipient'] = true;
        }
      }, this));
};


/**
 * Gets the current state of the dropdown.
 * @return {boolean}
 * @export
 */
ThreadsCtrl.prototype.isDropdownShown = function() {
  return this.showDropdown;
};


/**
 * Gets the current state of the trash button.
 * @return {boolean}
 * @export
 */
ThreadsCtrl.prototype.isTrashShown = function() {
  return this.showTrash;
};


/**
 * Handles Gmail subject window compatibility behavior by
 * preventing the enter key from advancing focus.
 * @param {!Event} event
 * @export
 */
ThreadsCtrl.prototype.onSubjectKeyPress = function(event) {
  if (event.keyCode == KEYCODE_ENTER_) {
    event.preventDefault();
  }
};


/**
 * Gets the current title of the invite missing recipient button.
 * @return {string}
 * @export
 */
ThreadsCtrl.prototype.getInviteButtonTitle = function() {
  return this.inviteMissingRecipientTitle;
};


/**
 * Gets the current state of any invites in progress.
 * @return {boolean}
 * @export
 */
ThreadsCtrl.prototype.isInviteInProgress = function() {
  return this.inviteInProgress;
};


/**
 * Get the file details and push it as an object,
 * in the attachments array, everytime a new file is
 * uploaded.
 * @param {string} name of the file
 * @param {string} type of the file
 * @param {string} contents of the file in a string format
 * @param {number} size of the file
 * @export
 */
ThreadsCtrl.prototype.onFileUpload = function(name, type, contents, size) {
  var obj = {
    'filename': name,
    'type': type,
    'encoding': 'base64',
    'content': contents,
    'size': size
  };
  this.compose.attachments.push(obj);
};


/**
 * Requests the contents of the compose model to be delivered.
 * @export
 */
ThreadsCtrl.prototype.sendCompose = function() {
  //TODO (Kamila): Remove the example object once the file reader directive
  //is uploaded.
  // Example to show the working files encryption
  var obj = {
    'filename': 'filename',
    'type': '',
    'encoding': 'base64',
    'content': 'contents of the file',
    'size': 41
  };
  this.compose.attachments.push(obj);
  //end of example
  if (!goog.isDefAndNotNull(this.compose.recipient) ||
      !goog.isDefAndNotNull(this.compose.subject) ||
      !goog.isDefAndNotNull(this.compose.message)) {
    this.status = this.translateService_.getMessage('emptyFieldsMessage');
    return;
  }
  var messageLength = this.compose.message.length;
  this.gmailService_.encryptAndSendMail(
      [this.compose.recipient], null, null, this.compose.subject,
      this.compose.message, this.compose.attachments)
      .then(goog.bind(function() {
        // On successful completion, hide the compose window and
        // update our screen.
        this.showCompose(false);
        this.updateScreen_();
      }, this)).catch(goog.bind(function(err) {
        if (goog.isDefAndNotNull(err.message)) {
          this.status = err.message;
        } else {
          this.status = err.toString();
        }
      }, this));
};


/**
 * Refresh the entire mailbox model.
 * @export
 */
ThreadsCtrl.prototype.refresh = function() {
  this.showDropdown = false;
  this.inRefresh = true;
  this.gmailService_.refresh(true, this).then(goog.bind(function() {
    this.status = null;
    this.updateScreen_();
  }, this)).catch(goog.bind(function(err) {
    this.status = err.toString();
  }, this)).finally(goog.bind(function() {
    this.inRefresh = false;
  }, this));
};


});  // goog.scope
