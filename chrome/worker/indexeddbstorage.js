/**
 * @license
 * Copyright 2016 E2EMail authors. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Implements a storage mechanism using IndexedDB.
 */

goog.provide('e2email.worker.IndexedDbStorage');

goog.require('goog.db');
goog.require('goog.db.Transaction');
goog.require('goog.storage.mechanism.IterableMechanism');
goog.require('goog.structs.Map');



/**
 * Creates an iterable mechanism that uses IndexedDB for persistence.
 * @param {string} key Key in the database to use for persisting data.
 * @param {function(!e2email.worker.IndexedDbStorage)=} opt_callback Callback
 *     function to call once storage mechanism has been initialized.
 * @constructor
 * @extends {goog.storage.mechanism.IterableMechanism}
 * @final
 */
e2email.worker.IndexedDbStorage = function(key, opt_callback) {
  /**
   * Internal storage object.
   * @type {Object}
   * @private
   */
  this.storage_ = {};
  /**
   * @type {!goog.db.IndexedDb}
   * @private
   */
  this.db_;
  /**
   * @type {string}
   * @private
   */
  this.storageKey_ = key;

  goog.db.openDatabase(
      e2email.worker.IndexedDbStorage.DB_NAME_,
      e2email.worker.IndexedDbStorage.DB_VERSION_,
      function(ev, db, tx) {
        db.createObjectStore(e2email.worker.IndexedDbStorage.OBJECTSTORE_NAME_);
      }).addCallback(function(db) {
    this.db_ = db;
    this.load_(opt_callback);
  }, this);
};
goog.inherits(e2email.worker.IndexedDbStorage,
    goog.storage.mechanism.IterableMechanism);


/**
 * Name of the object store in the IndexedDB database.
 * @private
 * @const {string}
 */
e2email.worker.IndexedDbStorage.OBJECTSTORE_NAME_ = 'store';


/**
 * Name of the IndexedDB database.
 * @private
 * @const {string}
 */
e2email.worker.IndexedDbStorage.DB_NAME_ = 'e2email.worker.IndexedDbStorage';


/**
 * Version of the IndexedDB database.
 * @private
 * @const {number}
 */
e2email.worker.IndexedDbStorage.DB_VERSION_ = 1;


/**
 * Initializes internal storage with the data in IndexedDB.
 * @param {function(!e2email.worker.IndexedDbStorage)=} opt_callback
 * @private
 */
e2email.worker.IndexedDbStorage.prototype.load_ = function(
    opt_callback) {
  var getTx = this.db_.createTransaction(
      [e2email.worker.IndexedDbStorage.OBJECTSTORE_NAME_]);
  var request = getTx.
      objectStore(e2email.worker.IndexedDbStorage.OBJECTSTORE_NAME_).
      get(this.storageKey_);
  request.addCallback(function(result) {
    this.storage_ = result || {};
    opt_callback && opt_callback(this);
  }, this);
};


/**
 * Persists the data in internal storage into IndexedDB.
 * @private
 */
e2email.worker.IndexedDbStorage.prototype.persist_ = function() {
  var putTx = this.db_.createTransaction(
      [e2email.worker.IndexedDbStorage.OBJECTSTORE_NAME_],
      goog.db.Transaction.TransactionMode.READ_WRITE);
  putTx.
      objectStore(e2email.worker.IndexedDbStorage.OBJECTSTORE_NAME_).
      put(this.storage_, this.storageKey_);
};


/** @override */
e2email.worker.IndexedDbStorage.prototype.set = function(key, value) {
  this.storage_[key] = value;
  this.persist_();
};


/** @override */
e2email.worker.IndexedDbStorage.prototype.get = function(key) {
  return this.storage_[key];
};


/** @override */
e2email.worker.IndexedDbStorage.prototype.remove = function(key) {
  delete this.storage_[key];
  this.persist_();
};


/** @override */
e2email.worker.IndexedDbStorage.prototype.__iterator__ = function(opt_keys) {
  return new goog.structs.Map(this.storage_).__iterator__(opt_keys);
};
