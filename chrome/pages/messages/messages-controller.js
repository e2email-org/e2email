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
 * @fileoverview Controller for the messages view for a single thread.
 */
goog.provide('e2email.pages.messages.MessagesCtrl');

goog.require('e2email.constants.Location');


goog.scope(function() {


/**
 * Milliseconds to wait for the compose window to fade into view,
 * before scrolling into view the entire window and selecting the
 * textarea.
 * @const
 * @private
 */
var SCROLL_INTO_VIEW_INTERVAL_ = 400;



/**
 * Messages page controller.
 *
 * @param {!angular.Scope} $scope
 * @param {!angular.$location} $location The Angular location service.
 * @param {!angular.$routeParams} $routeParams The Angular route
 *     parameter service.
 * @param {!e2email.components.gmail.GmailService} gmailService
 *     the gmail service.
 * @constructor
 * @ngInject
 * @export
 */
e2email.pages.messages.MessagesCtrl = function(
    $scope, $location, $routeParams, gmailService) {

  /** @private */
  this.location_ = $location;
  /** @private {string} */
  this.threadId_ = $routeParams.threadId;
  /** @private */
  this.gmailService_ = gmailService;

  this.status = null;

  this.thread = gmailService.getThread(this.threadId_);

  /**
   * Contains the state related to any replies by the user
   * for this thread.
   * @type {!{baseTitle: string, showText: boolean, content: ?string, attachments: Array<e2email.models.mail.Attachment>}}
   */
  this.reply = {
    'baseTitle': 'reply',
    'content': null,
    'showText': false,
    'attachments': []
  };

  // Run an async task to fetch/decrypt messages in this thread
  // once the view has loaded.
  $scope.$on('$viewContentLoaded', goog.bind(this.refresh_, this));
};


var MessagesCtrl = e2email.pages.messages.MessagesCtrl;


/**
 * Requests the reply compose model to be reset.
 * @param {angular.Scope.Event=} opt_event The event that triggered this call
 * @export
 */
MessagesCtrl.prototype.cancelReply = function(opt_event) {
  if (goog.isDefAndNotNull(opt_event)) {
    opt_event.preventDefault();
  }
  this.reply['baseTitle'] = 'reply';
  this.reply['content'] = null;
  this.reply['showText'] = false;
  this.reply['attachments'] = [];
};


/**
 * @param {string} name The name of the file.
 * @param {string} type The type of the file.
 * @param {string} contents The contents of the file.
 * @param {number} size The size of the file.
 * @export
 */
MessagesCtrl.prototype.onFileUpload = function(name, type, contents, size) {
  var obj = {
    'filename': name,
    'type': type,
    'encoding': 'base64',
    'content': contents,
    'size': size
  };
  this.reply.attachments.push(obj);
};


/**
  * Removes the attachment object from the list of attachments.
  * @param {string} name of the file
  * @export
  */
MessagesCtrl.prototype.removeObj = function(name) {
  var at = this.reply.attachments;

  if (at != []) {
    var i;
    for (i = at.length - 1; i >= 0; i--) {
      if (at[i].filename == name)
        at.splice(i, 1);
    }
  }
};


/**
 * Requests the reply compose model to be initialized, or
 * sent if it was already initialized.
 * @export
 */
MessagesCtrl.prototype.onReply = function() {
  if (!this.reply['showText']) {
    // Initialize the model.
    this.reply['showText'] = true;
    this.reply['baseTitle'] = 'send';
    this.reply['content'] = null;
    this.reply['attachments'] = [];
    setTimeout(function() {
      document.querySelector('textarea').focus();
      document.querySelector('#replyButton').scrollIntoView();
    }, SCROLL_INTO_VIEW_INTERVAL_);
  } else if (goog.isDefAndNotNull(this.reply['content'])) {
    var messageLength = this.reply['content'].length;
    this.gmailService_.encryptAndSendMail(
        this.thread.to, this.threadId_, this.thread.messageId,
        this.thread.subject, this.reply['content'], this.reply['attachments']).
        then(goog.bind(function() {
          return this.gmailService_.refreshThread(this.threadId_);
        }, this)).then(goog.bind(this.cancelReply, this));
  }
};


/**
 * Redirects the application to the thread list view.
 * @export
 */
MessagesCtrl.prototype.showThreads = function() {
  this.location_.path(e2email.constants.Location.THREADS);
};


/**
 * Returns the message thread object within the controller.
 * @return {?e2email.models.mail.Thread}
 * @export
 */
MessagesCtrl.prototype.getMessages = function() {
  return this.thread;
};


/**
 * Returns the thread reply object within the controller.
 * @return {!{baseTitle: string, showText: boolean, content: ?string}}
 * @export
 */
MessagesCtrl.prototype.getReply = function() {
  return this.reply;
};


/**
 * Runs an async task to fetch or decrypt messages in this thread.
 * @private
 */
MessagesCtrl.prototype.refresh_ = function() {
  this.gmailService_.refreshThread(this.threadId_).catch(function(issue) {
    if (goog.isDefAndNotNull(issue.message)) {
      this.errors = issue.message;
    } else {
      this.errors = issue.toString();
    }
  });
};


});  // goog.scope
