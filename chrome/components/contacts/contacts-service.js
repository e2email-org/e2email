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
 * @fileoverview Service managing Gmail contacts.
 */
goog.provide('e2email.components.contacts.ContactsService');
goog.provide('e2email.components.contacts.module');

goog.require('e2email.util.Email');
goog.require('e2email.util.Http');
goog.require('goog.Uri');
goog.require('goog.array');

goog.scope(function() {


/**
 * The completion priority for contacts discovered within the
 * address book
 * @const
 * @private
 */
var COMPLETION_PRIORITY_NONE_ = 0;


/**
 * Base URL for the Contacts API REST calls.
 * @const
 * @private
 */
var BASE_CONTACTS_API_URL_ =
    'https://www.google.com/m8/feeds/contacts/default/full';


/**
 * Number of results to fetch per Contacts API call.
 * @const
 * @private
 */
var CONTACTS_BATCH_COUNT_ = 1000;


/**
 * Key of object that stores the time of the last contacts download
 * @const
 * @private
 */
var LAST_DOWNLOAD_CONTACTS_KEY_ = 'lastContactsDownload';


/**
 * Object-Store in which the time of the last contacts download is stored
 * @const
 * @private
 */
var LAST_DOWNLOAD_OBJECTSTORE_ = 'lastDownload';


/**
 * Object-Store in which the contacts are locally stored
 * @const
 * @private
 */
var CONTACTS_OBJECTSTORE_ = 'contacts';


/**
 * Database name for IndexedDB database
 * @const
 * @private
 */
var DB_NAME_ = 'E2EMailContacts';


/**
 * Object-Store information for IndexedDB database
 * @const
 * @private
 */
var OBJECTSTORES_ = [CONTACTS_OBJECTSTORE_, LAST_DOWNLOAD_OBJECTSTORE_];



/**
 * Service to manage Gmail contacts.
 * @param {!angular.$q} $q The angular $q service.
 * @param {!angular.$http} $http The angular $http service.
 * @param {!e2email.components.translate.TranslateService} translateService
 *     The translation service.
 * @param {!e2email.components.autocomplete.AutocompleteService}
 *     autocompleteService The autocompletion service.
 * @param {!e2email.components.storage.StorageService}
 *     storageService The storage service.
 * @param {!e2email.components.auth.AuthService} authService
 *     The Authentication service.
 * @ngInject
 * @constructor
 */
e2email.components.contacts.ContactsService = function($q, $http,
    translateService, autocompleteService, storageService, authService) {
  /** @private */
  this.q_ = $q;
  /** @private */
  this.http_ = $http;
  /** @private */
  this.translateService_ = translateService;
  /** @private */
  this.autocompleteService_ = autocompleteService;
  /** @private */
  this.storageService_ = storageService;
  /** @private */
  this.authService_ = authService;

  // initialize db for first time use (will be ignored if already initialized)
  // this.db is the promise, its resolve function contains the database object
  // as a parameter
  /** @private */
  this.db_ = this.storageService_.initializeDBAndObjectStores(
      DB_NAME_, OBJECTSTORES_);
  /** @type {Object<string,!e2email.models.user.User>} */
  this.users = {};
  /** @private */
  this.alreadyCalled_ = false;
};

var ContactsService = e2email.components.contacts.ContactsService;


/**
 * This (async recursive) method pulls down the user's contact list,
 * and uses it to prime the autocomplete service. It runs once per
 * application restart.
 * @param {!e2email.util.Progress} progress Progress updates are
 *     set on this object.
 * @return {!angular.$q.Promise} A promise that returns when all
 *     contacts have been processed.
 */
ContactsService.prototype.processContacts = function(progress) {
  if (this.alreadyCalled_) {
    // We've been initialized before, avoid running again
    return this.q_.when(undefined);
  }
  this.alreadyCalled_ = true;
  // print a message notifying the user of the app's initialization status
  var batchNumber = '0';
  progress.status = this.translateService_.getMessage(
      'fetchContactsStatus', batchNumber);
  var databaseConnection = null;

  return this.db_.then(goog.bind(function(database) {
    // create a reference to the opened database connection
    databaseConnection = database;

    // load all locally stored contacts
    return this.storageService_.getAllKeysFromObjectStore(
        databaseConnection, CONTACTS_OBJECTSTORE_);
  }, this)).then(goog.bind(function(contacts) {

    // process stored contacts
    this.processLocalContactEntries_(contacts);

    // find the last time at which we downloaded contacts from the server
    return this.storageService_.getKeyFromObjectStore(
        databaseConnection, LAST_DOWNLOAD_OBJECTSTORE_,
        LAST_DOWNLOAD_CONTACTS_KEY_);
  }, this)).then(goog.bind(function(lastDownload) {

    // request any contacts that have been added since the last download
    return this.processBatchOfContacts_(progress, lastDownload);
  }, this));
};


/**
 * This is a helper method of the processContacts method that handles the
 * download of Gmail contacts
 * @param {!e2email.util.Progress} progress Progress updates are
 *     set on this object.
 * @param {string} lastDownload UTC-date of the last time the contacts
 *     were downloaded from the server
 * @param {number=} opt_startIndex A number that specifies
 *     the batch of messages to examine. If left undefined, the
 *     index is assumed to be 1.
 * @return {!angular.$q.Promise} A promise that returns when all
 *     contacts have been processed.
 * @private
 */
ContactsService.prototype.processBatchOfContacts_ =
    function(progress, lastDownload, opt_startIndex) {
  var curDate = null;
  // by default, download all contacts
  var downloadRequest = BASE_CONTACTS_API_URL_;
  if (goog.isDefAndNotNull(lastDownload)) {
    // if we were able to succesfully store the date of the last download
    downloadRequest = BASE_CONTACTS_API_URL_ + '?' +
        goog.Uri.QueryData.createFromMap({'updated-min': lastDownload});
  }
  var startIndex = 1;
  var nextIndex = -1;
  if (goog.isNumber(opt_startIndex)) {
    startIndex = opt_startIndex;
  }

  var config = {
    'params': {
      'max-results': CONTACTS_BATCH_COUNT_,
      'alt': 'json',
      'start-index': startIndex
    },
    'headers': {
      'GData-Version': '3.0'
    }
  };
  return this.authService_.withAuth(
      null, true, goog.bind(function(access_token) {
        this.authService_.addAuthorization(config, access_token);
        var batchNumber = Math.floor(
            (startIndex + CONTACTS_BATCH_COUNT_) / CONTACTS_BATCH_COUNT_);
        progress.status = this.translateService_.getMessage(
            'fetchContactsStatus', batchNumber.toString());
        return this.http_.get(downloadRequest, config);
      }, this)).then(goog.bind(function(response) {
    if (e2email.util.Http.goodResponse(response) &&
        goog.isDefAndNotNull(response.data.feed)) {
      var feed = response.data.feed;
      if (goog.isDefAndNotNull(feed['updated']) &&
          goog.isDefAndNotNull(feed['updated']['$t'])) {
        curDate = feed['updated']['$t'];
      }
      // Determines whether we need to process more batches
      if (goog.isDefAndNotNull(feed['openSearch$totalResults']) &&
          goog.isDefAndNotNull(feed['openSearch$totalResults']['$t'])) {
        var totalString = feed['openSearch$totalResults']['$t'];
        if (goog.isString(totalString)) {
          var total = parseInt(totalString, 10);
          if (!isNaN(total) &&
              (total >= (CONTACTS_BATCH_COUNT_ + startIndex))) {
            nextIndex = startIndex + CONTACTS_BATCH_COUNT_;
          }
        }
      }
      if (goog.isArray(feed.entry)) {
        return this.processRemoteContactEntries_(feed.entry);
      }
    }
    // In all cases that end up here, simply return without further
    // processing
  }, this)).then(goog.bind(function() {
    // If we have more batches, chain a recursive promise for the next batch.
    if (nextIndex > 1) {
      return this.processBatchOfContacts_(progress, lastDownload, nextIndex);
    } else {
      // All batches have been processed,
      // save the time of the download and return
      this.db_.then(goog.bind(function(database) {
        var obj = [{key: LAST_DOWNLOAD_CONTACTS_KEY_, val: curDate}];
        this.storageService_.insertIntoObjectStore(
            database, LAST_DOWNLOAD_OBJECTSTORE_, obj);
      }, this));
    }
  }, this));
};


/**
 * @param {!Array<!Object>} entries The list of contact entries.
 * @return {!angular.$q.Promise} A promise that resolves once all contacts have
 *     been promised
 * @private
 */
ContactsService.prototype.processLocalContactEntries_ = function(entries) {
  goog.array.forEach(entries, goog.bind(function(entry) {
    if (goog.isDefAndNotNull(entry.email)) {
      this.autocompleteService_.addCandidate(
          entry.email, COMPLETION_PRIORITY_NONE_);
      if (goog.isDefAndNotNull(entry.name)) {
        this.addUserInfo(entry.email, undefined, entry.name);
      }
    }
  }, this));
  return this.q_.when(undefined);
};


/**
 * @param {!Array<!Object>} entries The list of contact entries.
 * @return {!angular.$q.Promise} A promise that resolves once all contacts have
 *     been locally stored.
 * @private
 */
ContactsService.prototype.processRemoteContactEntries_ = function(entries) {
  var parsedContacts = [];
  goog.array.forEach(entries, goog.bind(function(entry) {
    if (goog.isArray(entry['gd$email'])) {
      goog.array.forEach(entry['gd$email'], goog.bind(function(email) {
        var candidate = e2email.util.Email.parseEmail(email['address']);
        if (goog.isDefAndNotNull(candidate)) {
          this.autocompleteService_.addCandidate(
              candidate, COMPLETION_PRIORITY_NONE_);
          var name = null;
          if (goog.isObject(entry['gd$name']) &&
              goog.isObject(entry['gd$name']['gd$fullName']) &&
              goog.isString(entry['gd$name']['gd$fullName']['$t'])) {
            name = entry['gd$name']['gd$fullName']['$t'];
          }
          this.addUserInfo(candidate, undefined, name);
          parsedContacts.push({key: candidate, val:
                    {email: candidate, name: name, priority:
                      COMPLETION_PRIORITY_NONE_}});
        }
      }, this));
    }
  }, this));
  // return a promise that resolves once the contacts have been stored locally
  return this.db_.then(goog.bind(function(database) {
    return this.storageService_.insertIntoObjectStore(
        database, CONTACTS_OBJECTSTORE_, parsedContacts);
  }, this));
};


/**
 * Adds user information to the model.
 * @param {string} email The email for the targeted user.
 * @param {boolean=} opt_changed True if the user's public key
 *     fingerprints have changed recently.
 * @param {string=} opt_name The name of the user.
 * @param {?string=} opt_fingerprint The fingerprint for their public key.
 */
ContactsService.prototype.addUserInfo = function(
    email, opt_changed, opt_name, opt_fingerprint) {
  var user = this.users[email];
  if (!goog.isDefAndNotNull(user)) {
    user = {
      'email': email,
      'fingerprintChanged': false,
      'name': null,
      'fingerprintHex': null
    };
    this.users[email] = user;
  }
  if (goog.isBoolean(opt_changed)) {
    user['fingerprintChanged'] = opt_changed;
  }
  if (goog.isString(opt_name)) {
    user['name'] = opt_name;
  }
  if (goog.isString(opt_fingerprint)) {
    user['fingerprintHex'] = opt_fingerprint;
  }
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.contacts.module = angular
    .module('e2email.components.contacts.ContactsService', [])
    .service('contactsService', ContactsService);

});  // goog.scope
