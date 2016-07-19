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
 * @fileoverview Service providing access to the Gmail API.
 */
goog.provide('e2email.components.gmail.GmailService');
goog.provide('e2email.components.gmail.module');

goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.pgpmime.Constants');
goog.require('e2e.openpgp.pgpmime.PgpMail');
goog.require('e2e.openpgp.pgpmime.Utils');
/** @suppress {extraRequire} import typedef */
goog.require('e2e.openpgp.pgpmime.types.ContentAndHeaders');
/** @suppress {extraRequire} import typedef */
goog.require('e2email.models.mail.Mailbox');
/** @suppress {extraRequire} import typedef */
goog.require('e2email.models.user.User');
goog.require('e2email.util.Email');
goog.require('e2email.util.Http');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.crypt.base64');
goog.require('goog.format.EmailAddress');
goog.require('goog.i18n.mime.encode');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.structs.LinkedMap');

goog.scope(function() {


/**
 * Milliseconds to wait before making network calls to refresh the
 * user's mailbox.
 * @const
 * @private
 */
var EMAIL_REFRESH_MSEC_ = 5 * 60 * 1000; // five minutes.


/**
 * Base URL for the Gmail API REST calls.
 * @const
 * @private
 */
var GMAIL_API_URL_ = 'https://www.googleapis.com/gmail/v1/users/me';


/**
 * Base URL for the Gmail API Message based REST calls.
 * @const
 * @private
 */
var GMAIL_MESSAGE_API_URL_ = GMAIL_API_URL_ + '/messages';


/**
 * Base URL for the Gmail API Thread based REST calls.
 * @const
 * @private
 */
var GMAIL_THREAD_API_URL_ = GMAIL_API_URL_ + '/threads';


/**
 * Number of results to fetch per Gmail API call.
 * @const
 * @private
 */
var GMAIL_BATCH_COUNT_ = 15;


/**
 * Query string that selects messages attachments with a filename that
 * is likely to contain ascii-armored content, and only considers messages
 * within the primary inbox.
 * @const
 * @private
 */
var GMAIL_SELECT_ATTACHMENTS_QUERY_ = '(has:pgpencrypted OR ' +
    '("BEGIN PGP MESSAGE" has:attachment filename:asc)) ' +
    '(in:inbox OR has:userlabels)';


/**
 * Mime name for the content type header.
 * @const
 * @private
 */
var MIME_CONTENT_TYPE_ = 'content-type';


/**
 * Mime name for the sender header.
 * @const
 * @private
 */
var MIME_FROM_ = 'from';


/**
 * Mime name for the subject header.
 * @const
 * @private
 */
var MIME_SUBJECT_ = 'subject';


/**
 * Mime name for the primary recipients header.
 * @const
 * @private
 */
var MIME_TO_ = 'to';


/**
 * Mime name for the additional recipients header.
 * @const
 * @private
 */
var MIME_CC_ = 'cc';


/**
 * Mime name for the date header.
 * @const
 * @private
 */
var MIME_DATE_ = 'date';


/**
 * Mime name for the message id.
 * @const
 * @private
 */
var MIME_MESSAGE_ID_ = 'message-id';


/**
 * The multipart/encrypted mime type.
 * @const
 * @private
 */
var MIME_MULTIPART_ENCRYPTED_ = 'multipart/encrypted';


/**
 * The application/octet-stream mime type.
 * @const
 * @private
 */
var MIME_OCTET_STREAM_ = 'application/octet-stream';


/**
 * The application/pgp-encrypted mime type.
 * @const
 * @private
 */
var MIME_PGP_ENCRYPTED_ = 'application/pgp-encrypted';


/**
 * The required protocol parameter for a PGP/Mime content type
 * @const
 * @private
 */
var OPENPGP_MIME_PROTOCOL_ = 'protocol="' + MIME_PGP_ENCRYPTED_ + '"';


/**
 * The maximum number of message threads for which we'll keep
 * the decrypted message contents in memory.
 * @const
 * @private
 */
var MAX_CACHED_THREADS_ = 10;


/**
 * The default completion priority for contacts discovered
 * within the user's mail.
 * @const
 * @private
 */
var COMPLETION_PRIORITY_NORMAL_ = 1;


/**
 * The completion priority for contacts discovered within the
 * address book.
 * @const
 * @private
 */
var COMPLETION_PRIORITY_NONE_ = 0;


/**
 * The completion priority for contacts to whom the user has
 * explicitly sent an email.
 * @const
 * @private
 */
var COMPLETION_PRIORITY_IMPORTANT_ = 5;


/**
 * The maximum number of characters to display (as a summary of the
 * mails) in the threads model.
 * @const
 * @private
 */
var MAX_SNIPPET_LENGTH_ = 100;


/**
 * The Label Id that marks a message as being unread.
 * @const
 * @private
 */
var LABEL_UNREAD_ = 'UNREAD';


/**
 * The Label Id that marks a message as belonging to the inbox.
 * @const
 * @private
 */
var LABEL_INBOX_ = 'INBOX';


/**
 * The Label Type that marks a label as being created by the user.
 * @const
 * @private
 */
var LABEL_CREATED_BY_USER_ = 'user';


/**
 * The URL from where the app can be installed.
 * @const
 * @private
 */
var APP_INSTALL_URL_ = 'https://github.com/e2email-org/e2email';


/**
 * The snippet to display when a message is an image.
 * @const
 * @private
 */
var SNIPPET_IMAGE_ = 'image';


/**
 * The content type header of a MIME message.
 * @const
 * @private
 */
var CONTENT_TYPE_ = 'Content-Type:';


/**
 * MIME content whose general type is image.
 * @const
 * @private
 */
var DISPLAY_TYPE_IMAGE_ = 'image';


/**
 * MIME content whose general type is text.
 * @const
 * @private
 */
var DISPLAY_TYPE_TEXT_ = 'text';


/**
 * MIME content whose general type is currently unsupported by the E2EMail app.
 * @const
 * @private
 */
var DISPLAY_TYPE_UNSUPPORTED_ = 'unsupported';


/**
 * MIME content that failed to parse correctly.
 * @const
 * @private
 */
var DISPLAY_TYPE_ERROR_ = 'error';


/**
 * A general notification that indicates to the user that the MIME content
 * is in a format that is not supported by the app.
 * @const
 * @private
 */
var MIME_ERROR_ = 'errorInParsingMime';


/**
 * A general notification that indicates to the user that the MIME content
 * is in a format that is not supported by the app.
 * @const
 * @private
 */
var MIME_NOT_SUPPORTED_ = 'unsupportedMimeContent';


/**
 * A generic placeholder for an unknown content type.
 * @const
 * @private
 */
var UNKNOWN_CONTENT_TYPE_ = 'Unknown/unsupported content type';


/**
 * The type of a text file.
 * @const
 * @private
 */
var FILETYPE_TXT_ = 'txt';


/**
 * An object mapping image types to their corresponding MIME Content-Type.
 * These are the image types that are supported by Chrome.
 * @const
 * @private
 */
var CHROME_SUPPORTED_IMAGE_TYPES_ = {'gif':
      e2e.openpgp.pgpmime.Constants.Mime.IMAGE_GIF,
      'jpeg': e2e.openpgp.pgpmime.Constants.Mime.IMAGE_JPEG,
      'jpg': e2e.openpgp.pgpmime.Constants.Mime.IMAGE_JPG,
      'png': e2e.openpgp.pgpmime.Constants.Mime.IMAGE_PNG,
      'bmp': e2e.openpgp.pgpmime.Constants.Mime.IMAGE_BMP,
      'webp': e2e.openpgp.pgpmime.Constants.Mime.IMAGE_WEBP
};



/**
 * Service to manage interacting with the Gmail API.
 * @param {!angular.$window} $window The angular $window service.
 * @param {!angular.$log} $log The angular $log service.
 * @param {!angular.$q} $q The angular $q service.
 * @param {!angular.$location} $location The angular $location service.
 * @param {!angular.$http} $http The angular $http service.
 * @param {!e2email.components.translate.TranslateService} translateService
 *     The translation service.
 * @param {!e2email.components.openpgp.OpenPgpService} openpgpService The
 *     OpenPGP service.
 * @param {!e2email.components.autocomplete.AutocompleteService}
 *     autocompleteService The autocompletion service.
 * @param {!e2email.components.contacts.ContactsService}
 *     contactsService The contacts service.
 * @param {!e2email.components.auth.AuthService}
 *     authService The authentiction service.
 * @ngInject
 * @constructor
 */
e2email.components.gmail.GmailService = function(
    $window, $log, $q, $location, $http,
    translateService, openpgpService, autocompleteService, contactsService,
    authService) {
  /** @private */
  this.chrome_ = $window.chrome;
  /** @private */
  this.log_ = $log;
  /** @private */
  this.q_ = $q;
  /** @private */
  this.location_ = $location;
  /** @private */
  this.http_ = $http;
  /** @private */
  this.translateService_ = translateService;
  /** @private */
  this.openpgpService_ = openpgpService;
  /** @private */
  this.autocompleteService_ = autocompleteService;
  /** @private */
  this.contactsService_ = contactsService;
  /** @private */
  this.authService_ = authService;

  /**
   * A linkedmap that holds the most recently viewed threads. This
   * structure is used to limit the number of decrypted messages we
   * hold in memory. If a thread is evicted from this map, decrypted
   * messages from that thread are also nulled.
   * @private {!goog.structs.LinkedMap<string,string>}
   */
  this.recentlyViewedThreads_ = new goog.structs.LinkedMap(0, true);

  /**
   * The epoch milliseconds when the mailbox was last
   * refreshed
   * @private
   */
  this.lastRefreshMsec_ = 0;

  /** @type {!e2email.models.mail.Mailbox} */
  this.mailbox = {
    email: '',
    status: null,
    threads: []
  };

  // this.labels_ is a promise whose resolve function contains an array of the
  // user defined label ids and the "INBOX" label id
  /** @private */
  this.labels_ = this.getGmailLabels_();
};

var GmailService = e2email.components.gmail.GmailService;


/**
 * Makes a network request to get the user's Gmail labels.
 * @return {!angular.$q.Promise<!Array<string>>} A promise that returns once the
 *     list of labels is received. The promise's resolve function includes an
 *     array of the label ids.
 * @private
 */
GmailService.prototype.getGmailLabels_ = function() {
  // At the very least, this function will return an array consisting of the
  // "INBOX" label id. Assuming the network request succeeds, it will also
  // include all user created label ids.
  var url = GMAIL_API_URL_ + '/' + 'labels';
  return this.authService_.withAuth(null, true, goog.bind(function(token) {
    var config = {};
    this.authService_.addAuthorization(config, token);
    return this.http_.get(url, config);
  }, this)).then(goog.bind(function(labelsObject) {
    var labelsArray = [];
    if (goog.isDefAndNotNull(labelsObject) &&
        goog.isDefAndNotNull(labelsObject.data) &&
        goog.isDefAndNotNull(labelsObject.data.labels)) {
      goog.array.forEach(labelsObject.data.labels, function(label) {
        if (label.type === LABEL_CREATED_BY_USER_) {
          labelsArray.push(label.id);
        }
      });
    }
    labelsArray.push(LABEL_INBOX_);
    return this.q_.when(labelsArray);
  }, this)).catch(goog.bind(function() {
    return this.q_.when([LABEL_INBOX_]);
  }, this));
};


/**
 * Sends an appropriate self-email welcoming the user.
 * @return {!angular.$q.Promise} A promise that returns when
 *     the email is sent.
 */
GmailService.prototype.sendWelcomeMail = function() {
  return this.sendNotificationMail_(
      this.translateService_.getMessage('welcomeMailSubject'),
      this.translateService_.getMessage('welcomeMailContent'));
};


/**
 * Sends an appropriate self-email when the user has recovered
 * their private key by entering a recovery code.
 * @return {!angular.$q.Promise} A promise that returns when
 *     the email is sent.
 */
GmailService.prototype.sendNewDeviceMail = function() {
  return this.sendNotificationMail_(
      this.translateService_.getMessage('newDeviceMailSubject'),
      this.translateService_.getMessage('newDeviceMailContent'));
};


/**
 * Sends an appropriate self-email informing the user they have
 * reset their account from a device.
 * @return {!angular.$q.Promise} A promise that returns when
 *     the email is sent.
 */
GmailService.prototype.sendResetMail = function() {
  return this.sendNotificationMail_(
      this.translateService_.getMessage('resetMailSubject'),
      this.translateService_.getMessage('resetMailContent'));
};


/**
 * Sends an encrypted self-email with the provided subject and content.
 * This is typically used to send notifications from the application.
 * @param {string} subject The subject for the email.
 * @param {string} content The content for the email.
 * @return {!angular.$q.Promise} A promise that returns when the email
 *     is sent.
 * @private
 */
GmailService.prototype.sendNotificationMail_ = function(subject, content) {
  return this.withMyKey_().then(goog.bind(function(myKey) {
    return this.openpgpService_.encryptSign(
        content, [myKey.publicKey], myKey.privateKey);
  }, this)).then(goog.bind(function(encrypted) {
    return this.sendPgpMimeMail_(
        null, null, [this.mailbox.email], subject, encrypted);
  }, this));
};


/**
 * Sends an unencrypted email to the requested recipients inviting them
 * to install Safe Mail.
 * @param {!Array<string>} recipients The array of recipient email addresses.
 * @return {!angular.$q.Promise} A promise that returns when the email
 *     is sent.
 */
GmailService.prototype.sendInvite = function(recipients) {
  // First verify we have somewhat reasonable email addresses.
  var ok = true;
  var sanitizedRecipients = goog.array.map(recipients, function(recipient) {
    var checked = e2email.util.Email.parseEmail(recipient);
    if (goog.isDefAndNotNull(checked)) {
      return checked;
    } else {
      ok = false;
      return null;
    }
  }, this);
  if (!ok) {
    return this.q_.reject(new e2e.openpgp.error.InvalidArgumentsError(
        'Invalid recipient email address'));
  }
  return this.sendUnencryptedMail_(
      sanitizedRecipients,
      this.translateService_.getMessage('inviteMailSubject'),
      this.translateService_.getMessage('inviteMailContent', APP_INSTALL_URL_));
};


/**
 * Sends an encrypted email to the requested recipients with the provided
 * subject and content. Updates the mailbox model on success.
 * @param {!Array<string>} recipients The array of recipient email addresses.
 *     Keys for these recipients must be locally available, otherwise an error
 *     is raised.
 * @param {?string} threadId A threadId for the email.
 * @param {?string} messageId A mime messageid, if this is a response to
 *     another message.
 * @param {string} subject The subject for the email.
 * @param {string} content The content for the email.
 * @return {!angular.$q.Promise} A promise that returns when the email
 *     is sent.
 */
GmailService.prototype.encryptAndSendMail = function(
    recipients, threadId, messageId, subject, content) {
  var keys = [];
  var privateKey = null;
  // Always include myself as one of the recipients, and remove
  // any duplicates.
  recipients.push(this.mailbox.email);
  goog.array.removeDuplicates(recipients);

  // TODO add support for content other than plaintext
  var mimeWrappedContent = this.plaintextWrap_(content, subject, recipients);
  return this.withMyKey_()
      .then(goog.bind(function(myKey) {
        // Save my private key, and continue to get public keys for
        // all requested recipients.
        privateKey = myKey.privateKey;
        // Continue to get public keys for all recipients.
        return this.withPublicKeys_(recipients);
      }, this)).then(goog.bind(function(recipientKeys) {
        keys = goog.array.concat(keys, recipientKeys);
        // Next encrypt for all recipients
        return this.openpgpService_.encryptSign(
            mimeWrappedContent, keys, privateKey);
      }, this)).then(goog.bind(
          this.sendPgpMimeMail_, this, threadId, messageId,
          recipients, subject));
};


/**
 * Refreshes the user's mailbox. It makes network requests to discover
 * messages with PGP/MIME encoded attachments, groups them by their
 * threads, and finally updates the mailbox model within the
 * service. Unless forced, it avoids making network requests if multiple
 * requests occur within EMAIL_REFRESH_MSEC_ milliseconds.
 * @see #EMAIL_REFRESH_MSEC_
 * @param {boolean} force Set this parameter to true to force
 *     network requests.
 * @param {!e2email.util.Progress} progress Progress updates are
 *     set on this object.
 * @return {!angular.$q.Promise} A promise that returns after
 *     all updates to the mailbox model have finished.
 * @export
 */
GmailService.prototype.refresh = function(force, progress) {
  var now = Date.now();
  // Do nothing if we were called "recently", and this is an unforced
  // request.
  if (!force && (now - this.lastRefreshMsec_) < EMAIL_REFRESH_MSEC_) {
    return this.q_.when(undefined);
  }

  // Starts a chain of promises that walks through interesting
  // messages in the inbox and indexes messages likely to have
  // PGP/MIME content; followed by a call that gets the list of
  // user contacts to prime the autocompletion service.
  return this.processInbox_(progress)
      .then(goog.bind(function() {
        return this.contactsService_.processContacts(progress);}, this)).then(
      goog.bind(function() {
        progress.status = null;
        this.lastRefreshMsec_ = now;
      }, this));
};


/**
 * This (async recursive) method processes a batch of interesting
 * messages at a time, and indexes those likely to have PGP/MIME
 * content.
 * The reason to do a batch at a time (rather than listing
 * all messages first, and then doing all the selection after that)
 * is to update the mailbox model as quickly as possible, which
 * makes the user interface load quicker.
 * @param {!e2email.util.Progress} progress Progress updates are
 *     set on this object.
 * @param {string=} opt_pageToken A token that specifies
 *     the batch of messages to examine. If left undefined, the
 *     first batch is examined.
 * @return {!angular.$q.Promise} A promise that returns when all
 *     batches have been examined.
 * @private
 */
GmailService.prototype.processInbox_ = function(progress, opt_pageToken) {
  var nextPageToken = null;

  var config = {
    'params': {
      'q': GMAIL_SELECT_ATTACHMENTS_QUERY_,
      'maxResults': GMAIL_BATCH_COUNT_
    }
  };
  // Adds page selector if we have one.
  if (goog.isDefAndNotNull(opt_pageToken)) {
    config['params']['pageToken'] = opt_pageToken;
  }

  return this.authService_.withAuth(
      null, true, goog.bind(function(access_token) {
        this.authService_.addAuthorization(config, access_token);
        progress.status = this.translateService_.getMessage('fetchBatchStatus');
        return this.http_.get(GMAIL_MESSAGE_API_URL_, config);
      }, this)).then(goog.bind(function(response) {
    var data = response.data;
    if (goog.isDefAndNotNull(data)) {
      // Saves the next page token before processing the batch.
      if (goog.isDefAndNotNull(data.nextPageToken)) {
        nextPageToken = data.nextPageToken;
      }
      if (goog.isDefAndNotNull(data.messages)) {
        return this.processInboxMessages_(progress, data.messages);
      }
    }
    // In all cases that end up here, simply return without further
    // processing.

  }, this)).then(goog.bind(function() {
    // If we have more batches, chain a recursive promise for the next batch.
    if (goog.isDefAndNotNull(nextPageToken)) {
      return this.processInbox_(progress, nextPageToken);
    } else {
      // All batches have been processed, just return.
    }
  }, this));
};


/**
 * Given a batch of messages, select ones that are likely to have
 * PGP/MIME content.
 * @param {!e2email.util.Progress} progress Progress messages are
 *     set on this object.
 * @param {!Object} data The Gmail API-based array of messages.
 * @return {!angular.$q.Promise} A promise that completes when this
 *     batch of messages are processed.
 * @private
 */
GmailService.prototype.processInboxMessages_ = function(progress, data) {
  if (!goog.isArray(data) || (data.length === 0)) {
    // Quickly handle potentially empty or erroneous results from the API.
    return this.q_.when(undefined);
  }

  /** @type Array< {id: string, threadId: string} > */
  var messages = data;

  // Fetch the metadata for each message, and select those that are
  // likely to contain PGP/MIME attachments.
  // 1. Generate a batch of promises, one per message.
  var batch = goog.array.map(messages, function(message) {
    return this.authService_.withAuth(null, true, goog.bind(function(token) {
      var config = {
        'params': {
          'metadataHeaders' : [
            MIME_CONTENT_TYPE_,
            MIME_FROM_,
            MIME_TO_,
            MIME_SUBJECT_,
            MIME_DATE_,
            MIME_MESSAGE_ID_
          ],
          'format' : 'metadata'
        }
      };
      this.authService_.addAuthorization(config, token);
      progress.status = this.translateService_.getMessage('fetchMessageStatus');
      return this.http_.get(
          GMAIL_MESSAGE_API_URL_ + '/' + goog.string.urlEncode(message.id),
          config)
              .then(goog.bind(this.processMetaData_, this));
    }, this));
  }, this);

  // 2. Return a promise that waits for this batch of promises to complete.
  return this.q_.all(batch);
};


/**
 * Trashes all marked threads.
 * @param {!e2email.util.Progress} progress Progress messages are
 *     set on this object.
 * @return {!angular.$q.Promise} A promise that completes when all
 *     the threads are processed.
 */
GmailService.prototype.trashMarkedThreads = function(progress) {
  // 2. Create a batch of promises for every marked thread in our list.
  /** @type {!Array<!angular.$q.Promise>} */
  var batch = [];
  return this.labels_.then(goog.bind(function(labels) {
    goog.array.forEach(this.mailbox.threads, function(thread) {
      if (thread.isMarked) {
        batch.push(this.trashThread_(progress, thread, labels));
      }
    }, this);
    return this.q_.all(batch);
  }, this));
};


/**
 * Trashes the provided thread.
 * @param {!e2email.util.Progress} progress Progress messages are
 *     set on this object.
 * @param {!e2email.models.mail.Thread} thread The thread object to
 *     trash.
 * @param {!Array<string>} labels An array containing the ids of all the Gmail
 *     labels used by the user.
 * @return {!angular.$q.Promise} A promise that completes when the
 *     thread has been moved to the trash.
 * @private
 */
GmailService.prototype.trashThread_ = function(progress, thread, labels) {
  // We "remove" threads by removing the INBOX label from them. If successful,
  // we also remove the thread from our model.
  return this.removeLabels_(
      GMAIL_THREAD_API_URL_ + '/' + goog.string.urlEncode(thread.id) +
          '/modify', labels)
          .then(goog.bind(this.removeThread_, this, thread.id));
};


/**
 * Given a URL and an array of labels, returns a promise to submit
 * a modify label request at the provided URL.
 * @param {string} url The URL where the request should be posted.
 * @param {!Array<string>} labels The array of labels to remove.
 * @return {!angular.$q.Promise} A promise that completes when
 *     the request has been successfully posted.
 * @private
 */
GmailService.prototype.removeLabels_ = function(url, labels) {
  return this.authService_.withAuth(null, true, goog.bind(function(token) {
    var config = {};
    this.authService_.addAuthorization(config, token);
    return this.http_.post(
        url,
        {'removeLabelIds': labels},
        config);
  }, this));
};


/**
 * Given the result of a metadata query for a specific message,
 * decides whether it is a PGP/MIME message, and indexes it.
 * @param {Object} data The result of a content-type query on a message.
 * @private
 */
GmailService.prototype.processMetaData_ = function(data) {
  if (!(e2email.util.Http.goodResponse(data))) {
    return;
  }
  /**
   * @type {{
   *   id: string,
   *   threadId: string,
   *   payload: {
   *     mimeType: string,
   *     headers: Array<{
   *       name: string,
   *       value: string
   *     }>
   *   }
   * }}
   */
  var metadata = data.data;
  var payload = metadata.payload;
  if (!goog.isDefAndNotNull(payload)) {
    return;
  }

  // Skip anything that doesn't look like a PGPMime email.
  if (!this.isLikelyPGPMime_(payload)) {
    return;
  }

  // Index this message.
  var oldThread = this.getThread(metadata.threadId);
  var timeString = this.getHeader_(payload.headers, MIME_DATE_);
  var subject = this.getHeader_(payload.headers, MIME_SUBJECT_);
  var from = e2email.util.Email.parseEmail(
      this.getHeader_(payload.headers, MIME_FROM_));
  var to = this.parseEmails_(this.getHeader_(payload.headers, MIME_TO_));
  var cc = this.parseEmails_(this.getHeader_(payload.headers, MIME_CC_));
  var messageid = this.getHeader_(payload.headers, MIME_MESSAGE_ID_);
  var unread = goog.isArray(metadata.labelIds) &&
      this.isUnread_(metadata.labelIds);

  // 1. Ensure all required values are available, otherwise skip this message.
  if (!goog.isDefAndNotNull(timeString) ||
      !goog.isDefAndNotNull(from) ||
      !goog.isDefAndNotNull(messageid)) {
    return;
  }

  var created = new Date(timeString);
  if (!goog.isDefAndNotNull(subject)) {
    subject = this.translateService_.getMessage('noSubjectTitle');
  }

  var recipients = goog.array.concat([from], to, cc);
  goog.array.removeDuplicates(recipients);
  // 2. Create a new thread if necessary.
  if (!goog.isDefAndNotNull(oldThread)) {
    oldThread = {
      id: metadata.threadId,
      subject: subject,
      updated: created,
      from: from,
      participants: [from],
      to: recipients,
      snippet: '...', // Show ellipses until full message is requested.
      mails: [],
      unread: unread,
      isMarked: false,
      messageId: messageid
    };
    this.mailbox.threads.push(oldThread);
  }
  // 3. Skip if we already indexed this email.
  if (goog.isDefAndNotNull(this.getMailFromThread_(oldThread, metadata.id))) {
    return;
  }

  // 4. Push a new mail entry into the thread.
  var mail = {
    id: metadata.id,
    subject: subject,
    from: from,
    to: recipients,
    created: created,
    messageId: messageid,
    unread: unread,
    mimeContent: null,
    warning: null,
    status: null,
    hasErrors: null
  };
  oldThread.mails.push(mail);

  // 5. Update summary information for this thread.
  this.updateCompletionsFromMail_(mail);
  this.updateThreadFromMail_(oldThread, mail);
};


/**
 * Given the metadata headers for an email, determines if it is
 * likely to be a PGP/MIME message.
 * @param {{
 *   mimeType: string,
 *   headers: Array<{
 *     name: string,
 *     value: string
 *   }>
 * }} payload The metadata headers for an email from a Gmail API call.
 * @return {boolean} Returns true if this is likely to be a PGP/MIME message.
 * @private
 */
GmailService.prototype.isLikelyPGPMime_ = function(payload) {
  // Gmail unfortunately does not preserve the original mime-type.
  // So, the way we actually decide whether a message is PGP /MIME is
  // by sending a slightly non-compliant PGP/MIME message, which we
  // can search for.
  // TODO(kbsriram) fix after Gmail API bug is addressed.
  var contentType = this.getHeader_(payload.headers, MIME_CONTENT_TYPE_);
  if (!goog.isDefAndNotNull(contentType)) {
    return false;
  }
  return true;
};


/**
 * Given a string, parses a list of bare email address from it.
 * @param {?string} content The string containing the email address list.
 * @return {!Array<string>} An array of bare email address discovered
 *     in the string.
 * @private
 */
GmailService.prototype.parseEmails_ = function(content) {
  var result = [];
  if (goog.isDefAndNotNull(content)) {
    goog.array.forEach(
        goog.format.EmailAddress.parseList(content), function(address) {
          if (address.isValid()) {
            result.push(address.getAddress());
          }
        });
  }
  return result;
};


/**
 * Given all the labels for a message, determines if it is unread.
 * @param {!Array<string>} labels The labels for the message.
 * @return {boolean} true if this is an unread message.
 * @private
 */
GmailService.prototype.isUnread_ = function(labels) {
  return goog.array.some(labels, function(label) {
    return label === LABEL_UNREAD_;
  });
};


/**
 * Given all the mime headers for an email, returns the first value for
 * a given type.
 * @param {Array<{
 *   name: string,
 *   value: string
 * }>} headers The mime headers.
 * @param {string} name The type of header requested.
 * @return {?string} the value for the requested type, or null if it
 *     was not found.
 * @private
 */
GmailService.prototype.getHeader_ = function(headers, name) {
  if (!goog.isDefAndNotNull(headers)) {
    return null;
  }
  var found = goog.array.find(headers, function(header) {
    return goog.string.caseInsensitiveEquals(header.name, name);
  });
  if (goog.isDefAndNotNull(found)) {
    return found.value;
  } else {
    return null;
  }
};


/**
 * Given a thread and an updated mail within that thread, updates the
 * summary in the thread model if the mail is more recent than the
 * summary.
 * @param {!e2email.models.mail.Thread} thread The thread to update.
 * @param {!e2email.models.mail.Mail} mail The newly updated mail.
 * @private
 */
GmailService.prototype.updateThreadFromMail_ = function(thread, mail) {
  // Add sender to thread participants, and remove duplicates.
  var exists = goog.array.some(thread.participants, function(participant) {
    return participant === mail.from;
  });
  if (!exists) {
    thread.participants.push(mail.from);
  }
  // Mark thread as unread if this mail is unread.
  if (mail.unread) {
    thread.unread = true;
  }
  // Update thread summary to reflect the most recent mail in the thread.
  if (thread.updated.getTime() <= mail.created.getTime()) {
    thread.updated = mail.created;
    thread.messageId = mail.messageId;
    if (goog.isDefAndNotNull(mail.mimeContent)) {
      // If this mail has content, use the first few characters as
      // summary snippet for the thread.
      var snippet = '';
      var containsImage = false;
      goog.array.forEach(mail.mimeContent, function(mime) {
        if (mime.type === DISPLAY_TYPE_IMAGE_) {
          containsImage = true;
        }
        // Assign a value to the snippet if it hasn't already been given a
        // value.
        if (snippet !== '') {
          return;
        } else if (mime.type === DISPLAY_TYPE_TEXT_) {
          snippet = goog.string.truncate(mime.content, MAX_SNIPPET_LENGTH_);
        }
      });
      thread.snippet = snippet;
      if (containsImage && snippet === '') {
        thread.snippet = SNIPPET_IMAGE_;
      }
    }
  }
};


/**
 * Given a new mail, updates the completions service with completions
 * based on the sender and recipients of this email.
 * @param {!e2email.models.mail.Mail} mail The new mail.
 * @private
 */
GmailService.prototype.updateCompletionsFromMail_ = function(mail) {
  // If we sent this mail, then we update all the recipients as being
  // "important" completions. Otherwise, mark all the recipients as a
  // "normal" completion.
  var priority = COMPLETION_PRIORITY_NORMAL_;

  if (mail.from == this.mailbox.email) {
    priority = COMPLETION_PRIORITY_IMPORTANT_;
  }

  this.autocompleteService_.addCandidate(mail.from, priority);
  goog.array.forEach(mail.to, goog.bind(function(candidate) {
    this.autocompleteService_.addCandidate(candidate, priority);
  }, this));
};


/**
 * Given a thread and an mailid within that thread, returns the
 * mail object if found.
 * @param {!e2email.models.mail.Thread} thread The thread to search.
 * @param {string} mailId The id for the desired mail.
 * @return {?e2email.models.mail.Mail} The mail object if found, or null.
 * @private
 */
GmailService.prototype.getMailFromThread_ = function(thread, mailId) {
  return goog.array.find(thread.mails, function(mail) {
    return (mail.id === mailId);
  });
};


/**
 * Finds the thread object from a thread id within our index.
 * @param {string} threadId The id for the desired thread.
 * @return {?e2email.models.mail.Thread} The thread object if found, or null.
 * @export
 */
GmailService.prototype.getThread = function(threadId) {
  return goog.array.find(this.mailbox.threads, function(thread) {
    return (thread.id === threadId);
  }, this);
};


/**
 * Given a thread id, removes it from our index.
 * @param {string} threadId The thread id to remove.
 * @private
 */
GmailService.prototype.removeThread_ = function(threadId) {
  goog.array.removeAllIf(this.mailbox.threads, function(thread) {
    return thread.id === threadId;
  });
};


/**
 * Returns a promise to fetch and decrypt any message within this thread
 * that hasn't previously been fetched.
 * @param {string} threadId The id for the thread.
 * @return {!angular.$q.Promise} A promise that returns after all
 *     updates to the corresponding thread have finished.
 * @export
 */
GmailService.prototype.refreshThread = function(threadId) {
  var thread = this.getThread(threadId);
  if (!goog.isDefAndNotNull(thread)) {
    return this.q_.reject(new e2e.openpgp.error.InvalidArgumentsError(
        'No such thread in mailbox.'));
  }

  // Creates a batch of promises for any message that need to be fetched.
  /** @type {!Array<!angular.$q.Promise>} */
  var batch = [];
  goog.array.forEach(thread.mails, function(mail) {
    if (!mail.hasErrors && !goog.isDefAndNotNull(mail.mimeContent)) {
      // We haven't fetch the content yet.
      // Get a (TOFU checked) public key for the sender, and chain
      // a call fetch the attachment if we have a public key.
      batch.push(this.getVerifiedPublicKey_(mail.from)
          .then(goog.bind(this.fetchAndDecryptMessage_, this, mail))
          .then(goog.bind(this.markMailReadIfNecessary_, this, thread, mail)));
    }
  }, this);

  // If all these calls return successfully, mark this thread as the
  // most recently viewed thread; and perform evictions as needed.
  return this.q_.all(batch).then(goog.bind(function() {
    this.setRecentlyViewedThread_(threadId);
  }, this));
};


/**
 * Given a thread id, updates the linked map containing the list of
 * most recently viewed threads, and cleans the decrypted message
 * contents of any evicted thread if necessary.
 * @param {string} threadId
 * @private
 */
GmailService.prototype.setRecentlyViewedThread_ = function(threadId) {
  // 1. Update the linkedmap with this thread Id.
  this.recentlyViewedThreads_.set(threadId, threadId);

  // 2. If we have exceeded our desired cache size, evict the
  // oldest viewed thread and null the decrypted content within its messages.
  while (this.recentlyViewedThreads_.getCount() > MAX_CACHED_THREADS_) {
    var evictedThread = this.getThread(this.recentlyViewedThreads_.pop());
    if (goog.isDefAndNotNull(evictedThread)) {
      goog.array.forEach(evictedThread.mails, function(mail) {
        if (!mail.hasErrors) {
          mail.mimeContent = null;
        }
      });
    }
  }
};


/**
 * Given a mail object, remove any LABEL_UNREAD_ tags from it, which
 * marks it as being read.
 * @param {!e2email.models.mail.Thread} thread The thread for the mail.
 * @param {!e2email.models.mail.Mail} mail The mail object of interest.
 * @return {!angular.$q.Promise} A promise to fetch and decrypt the mail.
 * @private
 */
GmailService.prototype.markMailReadIfNecessary_ = function(thread, mail) {
  if (!mail.unread) {
    // Nothing to do, just return a no-op promise.
    return this.q_.when(undefined);
  }
  // Make a promise that removes LABEL_UNREAD_ from the mail, and updates
  // the internal model if the request was successful.
  return this.removeLabels_(GMAIL_MESSAGE_API_URL_ +
      '/' + goog.string.urlEncode(mail.id) + '/modify', [LABEL_UNREAD_])
      .then(function() {
        mail.unread = false;
        thread.unread = goog.array.some(thread.mails, function(mail) {
          return mail.unread;
        });
      });
};


/**
 * Given a mail object and a key, return a promise that will attempt
 * to fetch and decrypt the message, or sets a suitable error message if the key
 * is not available.
 * @param {!e2email.models.mail.Mail} mail The mail object of interest.
 * @param {!e2e.openpgp.Key} senderKey The public key of the sender.
 * @return {!angular.$q.Promise} A promise to fetch and decrypt the mail.
 * @private
 */
GmailService.prototype.fetchAndDecryptMessage_ = function(mail, senderKey) {
  if (!goog.isDefAndNotNull(senderKey)) {
    // Sender key not available, set a suitable error message
    // and return a no-op promise.
    var msg = this.translateService_.getMessage(
        'senderKeyNotAvailableError', [mail.from]);
    mail.hasErrors = msg;
    return this.q_.when(undefined);
  }
  // Chain a sequence of promises to fetch, then decrypt
  // the attachment.
  return this.authService_.withAuth(null, true, goog.bind(function(token) {
    var config = {};
    this.authService_.addAuthorization(config, token);
    mail.status = this.translateService_.getMessage(
        'fetchMessageStatus', [mail.id]);
    return this.http_.get(
        GMAIL_MESSAGE_API_URL_ + '/' + goog.string.urlEncode(mail.id), config)
            .then(goog.bind(
                this.processPGPMimeAttachment_, this, mail, senderKey));
  }, this));
};


/**
 * Retrieves the public key for this email if possible, and updates
 * the model if we need to let the user know the public key has
 * changed.
 * @param {string} email The email for the public key to fetch.
 * @return {!angular.$q.Promise<e2e.openpgp.Key>} A promise
 *     that returns the key if found, and returns null otherwise.
 * @private
 */
GmailService.prototype.getVerifiedPublicKey_ = function(email) {
  return this.openpgpService_.getVerifiedPublicKey(email)
      .then(goog.bind(function(result) {
        if (!goog.isDefAndNotNull(result)) {
          // No keys found, just pass through a null.
          return null;
        } else {
          // Update user model.
          // Add warning if latest and stored fingerprints don't
          // match.
          var newFingerprint = null;
          var oldFingerprint = null;
          var changed = undefined;
          if (goog.isDefAndNotNull(result.remote.key) &&
              goog.isString(result.remote.key.fingerprintHex)) {
            newFingerprint = result.remote.key.fingerprintHex;
          }
          if (goog.isDefAndNotNull(result.local.key) &&
              goog.isString(result.local.key.fingerprintHex)) {
            oldFingerprint = result.local.key.fingerprintHex;
          }
          if (goog.isDefAndNotNull(newFingerprint) &&
              goog.isDefAndNotNull(oldFingerprint) &&
              (newFingerprint !== oldFingerprint)) {
            changed = true;
          }
          this.contactsService_.addUserInfo(
              email, changed, undefined, newFingerprint);
          return result.remote;
        }
      }, this));
};


/**
 * Retrieves the logged-in user's private and public key in a promise.
 * @return {!angular.$q.Promise<{publicKey: e2e.openpgp.Key,
 *     privateKey: e2e.openpgp.Key}>} A promise returning the
 *     private and public keys.
 * @private
 */
GmailService.prototype.withMyKey_ = function() {
  /** {e2e.openpgp.Key} */
  var privateKey = null;
  return this.openpgpService_.searchPrivateKey(
      this.mailbox.email).then(goog.bind(function(key) {
        if (goog.isDefAndNotNull(key)) {
          privateKey = key;
          return this.openpgpService_.searchPublicKey(
              this.mailbox.email, false);
        } else {
          return this.q_.reject(new e2e.openpgp.error.InvalidArgumentsError(
              'Private key not found for "' + this.mailbox.email + '"'));
        }
      }, this)).then(goog.bind(function(key) {
        if (goog.isDefAndNotNull(key)) {
          this.contactsService_.addUserInfo(
              this.mailbox.email, false, undefined, key.key.fingerprintHex);
          return this.q_.when({publicKey: key, privateKey: privateKey});
        } else {
          return this.q_.reject(new e2e.openpgp.error.InvalidArgumentsError(
              'Public key not found for "' + this.mailbox.email + '"'));
        }
      }, this));
};


/**
 * Retrieves a list of locally stored public keys for the provided array
 * of email addresses. The public keys must exist locally, otherwise an
 * error is raised.
 * @param {!Array<string>} emails An array of email addresses.
 * @return {!angular.$q.Promise<!Array<!e2e.openpgp.Key>>} A promise
 *     returning the list of public keys for the provided email addresses.
 * @private
 */
GmailService.prototype.withPublicKeys_ = function(emails) {
  // Create a batch of promises for our email addresses.
  // Although $q.all() returns a promise that can directly return
  // the array, closure isn't able to follow through the type checks,
  // so we save the results in a local array and return that.
  /** @type {!Array<!e2e.openpgp.Key>} */
  var results = [];
  var batch = goog.array.map(emails, function(email) {
    return this.openpgpService_.searchPublicKey(email, false)
        .then(function(key) {
          if (!goog.isDefAndNotNull(key)) {
            throw new e2e.openpgp.error.InvalidArgumentsError(
                'Public key not locally available for "' + email + '"');
          } else {
            results.push(key);
          }
        });
  }, this);

  return this.q_.all(batch).then(function() {
    return results;
  });
};


/**
 * Given the result of a message query for a specific message, returns
 * a promise to fetch the PGP/MIME attachment in it, decrypts and verifies
 * it, and updates the associated mail object in the model.
 * @param {!e2email.models.mail.Mail} mail The mail object we're trying
 *     to update.
 * @param {!e2e.openpgp.Key} senderKey The public key of the sender.
 * @param {Object} data The response from the Gmail API for the attachment.
 * @return {!angular.$q.Promise} A promise that returns once
 *     all the mail model is complete.
 * @private
 */
GmailService.prototype.processPGPMimeAttachment_ = function(
    mail, senderKey, data) {
  if (!(e2email.util.Http.goodResponse(data))) {
    var msg = this.translateService_.getMessage(
        'fetchMessageError', [mail.id]);
    mail.hasErrors = msg;
    return this.q_.when(undefined);
  }
  /** @type {{
   *    id: string,
   *    threadId: string,
   *    payload: {parts: Array<{
   *      mimeType: string,
   *      body: {attachmentId: string}
   *    }>}
   *  }}
   */
  var messageData = data.data;
  // Verify this has the requisite data for a PGPMime attachment.
  if (!goog.isDefAndNotNull(messageData) ||
      !goog.isDefAndNotNull(messageData.id) ||
      !goog.isDefAndNotNull(messageData.threadId) ||
      !goog.isDefAndNotNull(messageData.payload) ||
      !goog.isArray(messageData.payload.parts) ||
      (messageData.payload.parts.length !== 2)) {
    var msg = this.translateService_.getMessage(
        'fetchMessageMissingError', [mail.id]);
    mail.hasErrors = msg;
    return this.q_.when(undefined);
  }
  // Make sure at least one of the parts has the pgp/encrypted mime-type.
  // The other part then should contain either an attachment, or the
  // actual data.
  var encpartid = null;
  var encpartdata = null;
  if (messageData.payload.parts[0].mimeType === MIME_PGP_ENCRYPTED_) {
    encpartid = messageData.payload.parts[1].body.attachmentId;
    encpartdata = messageData.payload.parts[1].body.data;
  } else if (messageData.payload.parts[1].mimeType === MIME_PGP_ENCRYPTED_) {
    encpartid = messageData.payload.parts[0].body.attachmentId;
    encpartdata = messageData.payload.parts[0].body.data;
  }
  // If we didn't find either an attachment id or the data, abandon
  // this message.
  if (!goog.isDefAndNotNull(encpartid) && !goog.isDefAndNotNull(encpartdata)) {
    var msg = this.translateService_.getMessage(
        'fetchMessageMissingError', [mail.id]);
    mail.hasErrors = msg;
    return this.q_.when(undefined);
  }

  var mailId = messageData.id;
  var threadId = messageData.threadId;

  // Fetch the attachment contents, and chain a promise to
  // decrypt it when it returns.
  var promise;
  if (goog.isDefAndNotNull(encpartdata)) {
    // We already have the data, just return a promise to decrypt it.
    // We wrap the data in a dummy http response as that's the format
    // decryptData_ expects.
    return this.decryptData_(mail, senderKey, threadId, {
      'status': 200,
      'data': {
        'data': encpartdata
      }
    });
  }
  // We only have an attachment id, so first fetch the attachment
  // and then chain a promise to decrypt it.

  return this.authService_.withAuth(null, true, goog.bind(function(token) {
    var config = {};
    this.authService_.addAuthorization(config, token);
    return this.http_.get(
        GMAIL_MESSAGE_API_URL_ + '/' + goog.string.urlEncode(mailId) +
            '/attachments/' + goog.string.urlEncode(encpartid), config);
  }, this)).then(goog.bind(this.decryptData_, this, mail, senderKey, threadId));
};


/**
 * @param {!e2email.models.mail.Mail} mail The mail object to update.
 * @param {!e2e.openpgp.Key} senderKey The public key for the sender.
 * @param {string} threadId The thread id for the mail.
 * @param {Object} data The response from a Gmail attachment data call.
 * @return {!angular.$q.Promise} A promise that resolves when the data
 *     has been decrypted, and the corresponding information in the mailbox
 *     model has been updated.
 * @private
 */
GmailService.prototype.decryptData_ = function(
    mail, senderKey, threadId, data) {
  // Check returned information from network call.
  if (!(e2email.util.Http.goodResponse(data))) {
    var msg = this.translateService_.getMessage(
        'fetchMessageMissingError', [mail.id]);
    mail.hasErrors = msg;
    return this.q_.when(undefined);
  }

  var thread = this.getThread(threadId);
  if (!goog.isDefAndNotNull(thread)) {
    var msg = this.translateService_.getMessage(
        'messageMissingThreadError', [mail.id]);
    mail.hasErrors = msg;
    return this.q_.when(undefined);
  }

  // Extract the PGP message.
  /**
   * @type {{ data: string }}
   */
  var attachmentdata = data.data;
  if (!goog.isDefAndNotNull(attachmentdata.data)) {
    var msg = this.translateService_.getMessage(
        'fetchMessageMissingError', [mail.id]);
    mail.hasErrors = msg;
    return this.q_.when(undefined);
  }

  var pgpData;
  try {
    pgpData = window.atob(attachmentdata.data);
  } catch (e) {
    var msg = this.translateService_.getMessage(
        'messageEncodingError', [mail.id]);
    mail.hasErrors = msg;
    return this.q_.when(undefined);
  }

  mail.status = this.translateService_.getMessage('decryptMessageStatus');

  return this.withMyKey_().then(goog.bind(function(keyinfo) {
    // Chain a promise to handle the decryption, but convert
    // errors into a suitable update on the mail object.
    return this.openpgpService_.decryptVerify(
        pgpData, keyinfo.privateKey, goog.asserts.assertObject(senderKey))
            .then(goog.bind(function(data) {
              //extractMimeContent_ sets the value of mail.mimeContent
              this.extractMimeContent_(mail, data.content);
              mail.warning = data.warning;
              mail.hasErrors = null;
              mail.status = null;
              this.updateThreadFromMail_(
                  goog.asserts.assertObject(thread), mail);
            }, this)).catch(goog.bind(function(err) {
              var msg = this.workaroundErrorMessage_(err);
              mail.hasErrors = msg;
              mail.status = null;
            }, this));
  }, this));
};


/**
 * Error messages from the library don't currently contain a message
 * id. This is a workaround to handle the common types of errors and
 * display them in a more usable way.
 * @param {!Object} err
 * @return {string} A translated string when possible.
 * @private
 */
GmailService.prototype.workaroundErrorMessage_ = function(err) {
  var content = goog.isDefAndNotNull(err.message) ?
      err.message : err.toString();

  if (content.indexOf('No keys found for message.') >= 0) {
    return this.translateService_.getMessage('noKeysForMessageError');
  } else {
    return content;
  }
};


/**
 * Sends plaintext to the requested targets with the provided
 * payload.
 * @param {!Array.<string>} recipients An array of email addresses.
 * @param {string} subject The email subject.
 * @param {string} content The plaintext content.
 * @return {!angular.$q.Promise} A promise that returns once
 *     the content is sent.
 * @private
 */

GmailService.prototype.sendUnencryptedMail_ = function(
    recipients, subject, content) {
  return this.sendRFC2822Message_(
      null, this.plaintextWrap_(content, subject, recipients));
};


/**
 * Sends a PGP/Mime attachment to the requested targets with the
 * provided payload.
 * @param {?string} threadId A valid threadId to use for this email, or
 *     null to create a new thread.
 * @param {?string} messageId A mime messageid if this email is a response
 *     to an previous message, or null.
 * @param {!Array.<string>} recipients An array of email addresses.
 * @param {string} subject The email subject.
 * @param {string} payload The encrypted payload.
 * @return {!angular.$q.Promise} A promise that returns once
 *     the content is sent.
 * @private
 */
GmailService.prototype.sendPgpMimeMail_ = function(
    threadId, messageId, recipients, subject, payload) {
  return this.sendRFC2822Message_(
      threadId, this.pgpMimeWrap_(recipients, messageId, subject, payload))
          .then(goog.bind(function(response) {
            // Mark as read if necessary.
            if (e2email.util.Http.goodResponse(response) &&
                goog.isDefAndNotNull(response.data.id) &&
                goog.isArray(response.data.labelIds) &&
                this.isUnread_(response.data.labelIds)) {
              return this.removeLabels_(GMAIL_MESSAGE_API_URL_ +
                  '/' + goog.string.urlEncode(response.data.id) +
                  '/modify', [LABEL_UNREAD_]);
            } else {
              return response;
            }
          }, this)).then(goog.bind(function(response) {
            // Update our mailbox.
            if (e2email.util.Http.goodResponse(response) &&
                goog.isDefAndNotNull(response.data.id) &&
                goog.isDefAndNotNull(response.data.threadId)) {
              return this.processInboxMessages_(this.mailbox, [response.data])
                  .then(function() {
                    return response;
                  });
            } else {
              return response;
            }
          }, this));
};


/**
 * Given an RFC2822 formatted message, send it via the Gmail API.
 * @param {?string} threadId A valid threadId to use for this message, or
 *     null to create a new thread.
 * @param {string} content The RFC2822 formatted message.
 * @return {!angular.$q.Promise} A promise that returns once
 *     the content is sent.
 * @private
 */
GmailService.prototype.sendRFC2822Message_ = function(threadId, content) {
  // base64 with the url-safe values gmail needs.
  content = goog.crypt.base64.encodeString(content).replace(
      /\+/g, '-').replace(/\//g, '_');
  var data = {'raw': content};
  if (goog.isDefAndNotNull(threadId)) {
    data['threadId'] = threadId;
  }
  return this.authService_.withAuth(null, true, goog.bind(function(token) {
    return this.http_.post(
        GMAIL_MESSAGE_API_URL_ + '/send',
        data,
        {'headers': {'Authorization': 'Bearer ' + token}});
  }, this));
};


/**
 * Wraps plaintext into a form suitable for submitting as raw content.
 * @param {string} content The email content.
 * @param {?string} subject The email subject.
 * @param {Array<string>} recipients An array of email addresses.
 * @return {string} The wrapped content suitable for POSTing to the API.
 * @private
 */
GmailService.prototype.plaintextWrap_ = function(content, subject, recipients) {
  var finalSubject = null;
  var finalRecipients = null;
  var finalFrom = null;

  if (goog.isDefAndNotNull(subject)) {
    finalSubject = this.mimeSanitize_(subject);
  }
  if (goog.isDefAndNotNull(recipients)) {
    finalRecipients = this.mimeSanitize_(recipients.join(','));
  }
  if (goog.isDefAndNotNull(subject) || goog.isDefAndNotNull(recipients)) {
    finalFrom = this.mimeSanitize_(this.mailbox.email);
  }
  var mimeMsg = new e2e.openpgp.pgpmime.PgpMail(
      /**@type{e2e.openpgp.pgpmime.types.ContentAndHeaders}*/(
          {body: content, subject: finalSubject, to: finalRecipients,
            from: finalFrom}));
  return mimeMsg.buildMimeTree();
};


/**
 * Wraps the payload into a PGP/MIME formatted message.
 * @param {!Array<string>} recipients An array of email addresses.
 * @param {?string} messageId An optional Mime messageid, if this is
 *     a response to a previous message.
 * @param {string} subject The email subject.
 * @param {string} content The email content.
 * @return {string} The wrapped content suitable for POSTing to the API.
 * @private
 */
GmailService.prototype.pgpMimeWrap_ = function(
    recipients, messageId, subject, content) {
  var inReplyTo = '';
  if (goog.isDefAndNotNull(messageId)) {
    inReplyTo = messageId.replace(/[\r\n]/g, '');
  }

  var preamble = this.translateService_.getMessage('mimePreamble');
  var pgpMimeMsg = this.constructPgpMimeMessage_(
      content, this.mimeSanitize_(subject),
      this.mimeSanitize_(this.mailbox.email),
      this.mimeSanitize_(recipients.join(',')),
      preamble, inReplyTo);
  return pgpMimeMsg;
};


/**
 * Converts the string into a form safe to insert as a mime header.
 * @param {string} input The string to be sanitized.
 * @return {string} The sanitized string.
 * @private
 */
GmailService.prototype.mimeSanitize_ = function(input) {
  return goog.i18n.mime.encode(input);
};


/**
 * Get the email address of the user, and returns a
 * true (in the promise) if the user has a registered email address.
 * 
 * @return {!angular.$q.Promise<boolean>} A promise returning true if
 *     the user has an email adress registered.
 */
GmailService.prototype.getEmailAddress_= function() {
  return this.getEmailInfo_();
};

/**
 * Fetch a logged-in user's email address, if available.
 * @return {!angular.$q.Promise<string>} A promise with the
 *     email address, or null if it wasn't found.
 * @private
 */
GmailService.prototype.getEmailInfo_ = function() {
  var deferred = this.q_.defer();

  this.chrome_.identity.getProfileUserInfo(function(info) {
    if (goog.isDefAndNotNull(info) &&
        goog.isDefAndNotNull(info['email']) && 
        info['email'] !== '') {
      deferred.resolve(info['email']);
    } else {
      deferred.resolve(null);
    }
  });
  return deferred.promise;
};


/**
 * Checks if the user has authorized access to the Gmail API.
 * @return {!angular.$q.Promise<boolean>} A promise that returns
 *     true if all required authorizations are available to the
 *     application.
 */
GmailService.prototype.isAuthorized = function() {
  return this.getAllAuthorizations_(false);
};


/**
 * Signs in the user and gets their approval if necessary, and returns a
 * true (in the promise) if the user grants access.
 *
 * @return {!angular.$q.Promise<boolean>} A promise returning true if
 *     the user grants access to the service when the promise is
 *     fulfilled.
 */
GmailService.prototype.signIn = function() {
  return this.getAllAuthorizations_(true);
};


/**
 * Attempts to obtain all authorizations and information needed to use
 * the app.
 * @param {boolean} interactive Set to true if the user can manually
 *     approve any intermediate login/approval dialogs.
 * @return {!angular.$q.Promise<boolean>} A promise that returns
 *     true if all authorizations are available.
 * @private
 */
GmailService.prototype.getAllAuthorizations_ = function(interactive) {
  var deferred = this.q_.defer();

  // Get a token for the default scope.
  /** @type {?string} */
  var access_token = null;

  return this.authService_.getToken(interactive, null).then(
      goog.bind(function(token) {
        if (goog.isDefAndNotNull(token)) {
          access_token = token;
          // We have a token for the main scope; now chain a promise that
          // gets the user's email.
          return this.getEmailInfo_();
        } else {
          // access token not available, continue to pass on a null.
          return null;
        }
      }, this)).then(goog.bind(function(email) {
    // If we've acquired both the token and email, update the model
    // and record a success.
    if (goog.isDefAndNotNull(email) && goog.isDefAndNotNull(access_token)) {
      // Update our model.
      this.mailbox.email = email;
      this.contactsService_.addUserInfo(email);
      return true;
    } else {
      return false;
    }
  }, this));
};


/**
 * Calls e2e.openpgp.pgpmime.Pgpmail, a library that constructs valid
 * PGP/MIME messages.
 * @param {string} content The content of the message
 * @param {string} subject The subject of the message
 * @param {string} from The sender of the message
 * @param {string} to The recipient/s of the message
 * @param {string} preamble Text that will precede the main part of the message
 *     It will not be displayed as part of the email
 * @param {string=} opt_inReplyTo What the message is in reply to
 * @return {string} The PGP/MIME formatted message
 * @private
 */
GmailService.prototype.constructPgpMimeMessage_ = function(content, subject,
    from, to, preamble, opt_inReplyTo) {
  var pgpMime = new e2e.openpgp.pgpmime.PgpMail(
      /**@type{e2e.openpgp.pgpmime.types.ContentAndHeaders}*/(
      {body: content, subject: subject, from: from, to: to,
        inReplyTo: opt_inReplyTo}), preamble);
  return pgpMime.buildPGPMimeTree();
};


/**
 * Checks if a decrypted message is MIME formatted. If it is, the message is
 * parsed, and the mail object is updated using the parsed MIME content.
 * If the message is not valid MIME, the mail object will be updated using the
 * raw content of the message.
 * @param {!e2email.models.mail.Mail} mail The mail object to update.
 * @param {string} message The decrypted (possibly MIME formatted) message.
 * @private
 */
GmailService.prototype.extractMimeContent_ = function(mail, message) {

  /*
   * Messages are presented as follows:
   * 1) Non-MIME-formatted messages will be displayed directly as text (for
   *    backwards compatibility).
   * 2) Incorrect MIME formatting (parsing errors) - A "failed to parse"
   *    message will appear, and mail.hasError will be set to true.
   * 3) Correctly formatted MIME messages whose type/encoding is unsupported
   *    will not be displayed directly. Instead, an "unsupported" notification
   *    will be presented. TODO: Add a button that will allow such data to be
   *    downloaded from the E2EMail app to the user's machine.
   * 4) Correctly formatted MIME messages that are supported will be presented.
   */

  var utils = e2e.openpgp.pgpmime.Utils;
  mail.mimeContent = [];
  var rootNode = null;
  var mimeContent = null;

  if (!this.isMime_(message)) {
    // If the message is not properly MIME formatted, display it to the user
    // without further processing (Case 1 from above).
    mail.mimeContent.push(this.prepareContentForDisplay_(message,
        DISPLAY_TYPE_TEXT_));
    return;
  }
  // If parseNode() or mimeTreeWalker_() fail, an error will be thrown (Case 2
  // from above).
  rootNode = utils.parseNode(message);
  mimeContent = this.mimeTreeWalker_(rootNode);

  // Case 4. Note that some or all of the data may be unsupported and thus
  // unpresentable to the user (Case 3).
  mail.mimeContent = mimeContent;

};


/**
 * Extracts the readable MIME content out of a decrypted message and returns
 * an array of objects that correspond to the MIME nodes of the message.
 * @param {e2e.openpgp.pgpmime.types.Entity} rootNode The object-tree
 *     representation of a MIME message
 * @return {!Array<{content: string, type: string}>}
 * @private
 */
GmailService.prototype.mimeTreeWalker_ = function(rootNode) {
  var constants = e2e.openpgp.pgpmime.Constants;
  // The header names in rootNode are set in TitleCase
  var ctHeader = rootNode.header[constants.Mime.CONTENT_TYPE];
  var encHeader = rootNode.header[constants.Mime.CONTENT_TRANSFER_ENCODING];

  if (!goog.isDefAndNotNull(ctHeader) || !goog.isDefAndNotNull(encHeader) ||
      !goog.isDefAndNotNull(ctHeader.value) ||
      !goog.isDefAndNotNull(encHeader.value)) {
    var errorMsg = this.translateService_.getMessage(MIME_ERROR_);
    return [this.prepareContentForDisplay_(errorMsg, DISPLAY_TYPE_ERROR_)];
  }

  // The values of the Content-Type and Content-Transfer-Encoding headers are
  // case insensitive, so we can change them to lower case (simplifies
  // comparison).
  var ct = ctHeader.value.toLowerCase();
  var enc = encHeader.value.toLowerCase();

  // Case 1: Single plaintext node.
  if (ct === constants.Mime.PLAINTEXT && goog.isString(rootNode.body)) {
    // TODO handle non 7bit encodings
    return [this.prepareContentForDisplay_(rootNode.body,
                                             DISPLAY_TYPE_TEXT_)];
  }

  // Case 2: Single image node.
  if (goog.object.contains(constants.MimeArray.IMAGE_TYPES, ct) &&
      goog.isString(rootNode.body)) {
    return [this.prepareImage_(rootNode.body, ct, enc)];
  }

  // Case 3: Multipart node.
  if (ct === constants.Mime.MULTIPART_MIXED && goog.isArray(rootNode.body)) {
    var multipart = [];
    goog.array.forEach(rootNode.body, function(node) {
      goog.array.extend(multipart, this.mimeTreeWalker_(node));
    }, this);
    return multipart;
  }

  // Case 4: Unidentifiable / unsupported MIME content.
  // TODO present attachments as files.
  // Currently we are simply displaying an "unsupported" notification.

  var attachmentInfo = '(' + ct + ')';
  var unsupportedMsg = this.translateService_.getMessage(
      MIME_NOT_SUPPORTED_, attachmentInfo);

  return [this.prepareContentForDisplay_(unsupportedMsg,
                                         DISPLAY_TYPE_UNSUPPORTED_)];
};


/**
 * Prepares a string representation of an image that can be used as the 'src'
 * value in an HTML <img> element. This representation is stored in an object
 * that will be parsed by AngularJS.
 * If the image is not supported by Chrome, an error notification will be
 * displayed.
 * @param {string} data The data of the image
 * @param {string} type The MIME Content-Type of the image
 * @param {string} encoding The Content-Transfer-Encoding of the image
 * @return {{content: string, type: string}}
 * @private
 */
GmailService.prototype.prepareImage_ = function(data, type, encoding) {
  var unsupportedMsg = '';
  var failure = '';
  if (!goog.object.contains(CHROME_SUPPORTED_IMAGE_TYPES_, type)) {
    // Unsupported data type.
    failure = 'Image type ' + type + ' not supported';
    unsupportedMsg = this.translateService_.getMessage(MIME_NOT_SUPPORTED_,
        failure);
    return this.prepareContentForDisplay_(unsupportedMsg,
        DISPLAY_TYPE_UNSUPPORTED_);
  }
  if (encoding !== e2e.openpgp.pgpmime.Constants.Mime.BASE64) {
    // TODO handle other encodings. Right now we only handle "base64"
    failure = 'Encoding type ' + encoding + ' not supported';
    unsupportedMsg = this.translateService_.getMessage(MIME_NOT_SUPPORTED_,
        failure);
    return this.prepareContentForDisplay_(unsupportedMsg,
        DISPLAY_TYPE_UNSUPPORTED_);
  }

  if (!this.isValidBase64_(data)) {
    failure = 'Invalid base64 encoding';
    unsupportedMsg = this.translateService_.getMessage(MIME_NOT_SUPPORTED_,
        failure);
    return this.prepareContentForDisplay_(unsupportedMsg,
        DISPLAY_TYPE_UNSUPPORTED_);
  }

  var uri = 'data:' + type + ';base64,' + data;
  return this.prepareContentForDisplay_(uri, DISPLAY_TYPE_IMAGE_);
};


/**
 * Parses the filename of an attachment to determine its type.
 * @param {string} filename The filename
 * @return {string} The MIME Content-Type corresponding to the filename
 * @private
 */
GmailService.prototype.determineTypeFromFilename_ = function(filename) {
  // TODO Search for additional filetypes.
  // Currently, the E2EMail app only supports supports text and images.
  var pieces = goog.string.stripQuotes(filename.trim(), '`"\'').split('.');
  if (pieces.length !== 2) {
    return UNKNOWN_CONTENT_TYPE_;
  }
  var suffix = pieces[1];
  if (CHROME_SUPPORTED_IMAGE_TYPES_.hasOwnProperty(suffix)) {
    return CHROME_SUPPORTED_IMAGE_TYPES_[suffix];
  } else if (suffix === FILETYPE_TXT_) {
    return e2e.openpgp.pgpmime.Constants.Mime.PLAINTEXT;
  }
  return UNKNOWN_CONTENT_TYPE_;
};


/**
 * Attempts to determine whether or not a message is MIME formatted.
 * Some messages may not be MIME formatted, in which case they should be
 * displayed directly to the user.
 * @param {string} message The message
 * @return {boolean} Returns true if the message appears to be MIME formatted
 * @private
 */
GmailService.prototype.isMime_ = function(message) {
  // TODO: Make this more robust
  var headerIndex = message.trim().search(/\r?\n\r?\n/);
  if (headerIndex === -1) {
    return false;
  }
  var header = message.substr(0, headerIndex);
  return goog.string.caseInsensitiveContains(header, CONTENT_TYPE_);
};


/**
 * Checks whether a given string is valid base64 (ignores whitespace)
 * @param {string} encodedString The encoded string
 * @return {boolean} Returns true if the string is valid base64, otherwise false
 * @private
 */
GmailService.prototype.isValidBase64_ = function(encodedString) {
  var validBase64 = new RegExp('^[A-Za-z0-9+/=\r\n\t ]+$');
  return validBase64.test(encodedString);
};


/**
 * Inserts content into an object that can be displayed within the E2EMail app.
 * @param {string} content The content
 * @param {string} type The type of the content
 * @return {{content: string, type: string}}
 * @private
 */
GmailService.prototype.prepareContentForDisplay_ = function(content, type) {
  return {content: content, type: type};
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.gmail.module = angular
    .module('e2email.components.gmail.GmailService', [])
    .service('gmailService', GmailService);

});  // goog.scope
