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
 * @fileoverview Service managing local storage
 *
 * This service provides convenience wrapper functions around the goog.db
 * library that is implemented on top of IndexedDb.
 * IndexedDb operations are asynchronous, requiring the use of promises in order
 * to verify/examine the results of its operations.
 *
 * Example usage:
 * <code>
 * To create a database and object stores, first define objects that represent
 * the desired structure of the database and object stores:
 *
 * var DB_NAME = 'E2EMailContacts';
 * var OBJECTSTORES = ['contacts'];
 *
 * Calling the following function will perform the necessary initialization:
 * var dbPromise = storageService.initializeDBAndObjectStores(
 *                 DB_NAME, OBJECTSTORES);
 *
 * If the database and object stores already existed, the function will not
 * execute any changes. Either way, dbPromise is an AngularJS promise whose
 * resolve function contains a reference to the underlying database.
 *
 * To insert an object into the database, simply attach a resolve callback
 * function to dbPromise. The function will receive as an argument the database
 * handle:
 * dbPromise.then(function(dbHandle){
 *   storageService.insertIntoObjectStore(dbHandle, nameOfObjectStore,
 *   ArrayOfObjects);
 * });
 * Each object in ArrayOfObjects must have exactly two fields: key and val.
 * The key field contains the key of the object that is to be inserted, while
 * val contains the value of the object that is to be inserted (e.g.,
 * {key: 'foo@google.com', val: {email: 'foo@google.com', name: 'Foo'}}).
 *
 * Similary, to retrieve a specific object from the database:
 * dbPromise.then(function(dbHandle){
 *   return storageService.getKeyFromObjectStore(dbHandle, nameOfObjectStore,
 *   keyOfObject);
 * }).then(function(retrievedObject){
 *  console.log("here is the retrieved object", retrievedObject);
 * });
 * Note that the first resolve function waits for dbPromise to resolve, while
 * the second chained resolve function depends on the success of the get
 * operation.
 *
 * </code>
 */


goog.provide('e2email.components.storage.StorageService');
goog.provide('e2email.components.storage.module');

goog.require('goog.array');
goog.require('goog.db');
goog.require('goog.db.Transaction');

goog.scope(function() {


/**
 * Version of IndexedDB database. Currently, its value is constant
 * In the future this may become a strictly increasing integer variable
 * @const
 * @private
 */
var DB_VERSION_ = 1;



/**
 * Service to manage the local storage using IndexedDB
 * @param {!angular.$q} $q The angular $q service.
 * @ngInject
 * @constructor
 */
e2email.components.storage.StorageService = function($q) {
  /** @private */
  this.q_ = $q;
};

var StorageService = e2email.components.storage.StorageService;


/**
 * Initializes the databases and object stores required by a service, returning
 * a deferred database object.
 * This function essentially wraps goog.db.openDatabase.
 * openDatabase accepts three arguments: Database name, database version
 * (currently a constant) and a callback function that is invoked when the
 * database is first created.
 * The callback function creates the object stores as defined
 * by the user (in the second parameter passed to initializeDBAndObjectStores).
 * @param {string} database The name of the database that should be initialized
 * @param {!Array<string>} objectStores The names of the object stores that
 *     should be initialized
 * @return {!angular.$q.Promise<!goog.db.IndexedDb>} A promise whose resolve
 *     function contains a reference to the underlying database
 */
StorageService.prototype.initializeDBAndObjectStores =
    function(database, objectStores) {
  var defer = this.q_.defer();
  goog.db.openDatabase(database, DB_VERSION_, function(event, db) {
    goog.array.forEach(objectStores, goog.bind(function(store) {
      // Creating an object store behaves like a synchronous operation.
      // Transactions can immediately be executed, so promises aren't necessary
      db.createObjectStore(store);
    }, this));
  }).addCallbacks(defer.resolve, defer.reject, defer);
  return defer.promise;
};


/**
 * Retrieves all the objects from a given object store, and returns them in
 * an array.
 * @param {!goog.db.IndexedDb} database A handle to the opened database
 * @param {string} objectStore The object store whose objects
 *     should be retrieved
 * @return {!angular.$q.Promise<!Array<Object>>} A promise whose resolve
 *     function contains a reference to an array of the objects within the data
 *     store
 */
StorageService.prototype.getAllKeysFromObjectStore =
    function(database, objectStore) {
  var defer = this.q_.defer();
  database.createTransaction([objectStore],
      goog.db.Transaction.TransactionMode.READ_ONLY).objectStore(
      objectStore).getAll().addCallbacks(defer.resolve, defer.reject, defer);
  return defer.promise;
};


/**
 * Retrieves a set of objects from a given object store, and returns them in
 * an array.
 * @param {!goog.db.IndexedDb} database The database to open
 * @param {string} objectStore The object store whose objects
 *     should be retrieved
 * @param {IDBKeyType} key The keys of the object that should be extracted
 *     The IDBKeyType includes {number|string|!Date|!Array.<?>}
 *     (the contents of the array must also be valid key types, see:
 *     http://www.w3.org/TR/IndexedDB/#key-construct)
 * @return {!angular.$q.Promise<Object>} A promise whose resolve
 *     function contains a reference to the desired object
 */
StorageService.prototype.getKeyFromObjectStore =
    function(database, objectStore, key) {
  var defer = this.q_.defer();
  database.createTransaction([objectStore],
      goog.db.Transaction.TransactionMode.READ_ONLY).objectStore(
      objectStore).get(key).addCallbacks(defer.resolve, defer.reject, defer);
  return defer.promise;
};


/**
 * Insert objects into a specific object store.
 * @param {!goog.db.IndexedDb} database A handle to the opened database
 * @param {string} objectStore The object store that the objects should be
 *     inserted into
 * @param {!Array<{key: IDBKeyType, val: !Object}>} obs An array of objects to
 *     insert into the object store.
 *     Note that the IDBKeyType includes {number|string|!Date|!Array.<?>}
 *     (the contents of the array must also be valid key types, see:
 *     http://www.w3.org/TR/IndexedDB/#key-construct)
 * @return {!angular.$q.Promise} A promise representing the insertion
 *     of all of the elements in obs into objectStore (will only be true if all
 *     objects were succesfully inserted)
 */
StorageService.prototype.insertIntoObjectStore =
    function(database, objectStore, obs) {
  var defer = this.q_.defer();
  var tx = database.createTransaction([objectStore],
      goog.db.Transaction.TransactionMode.READ_WRITE);
  var store = tx.objectStore(objectStore);
  goog.array.forEach(obs, goog.bind(function(ob) {
    store.put(ob.val, ob.key);
  }, this));
  // return a promise that will resolve only if all the promises in batch
  // are resolved
  tx.wait().addCallbacks(defer.resolve, defer.reject, defer);
  return defer.promise;
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.storage.module = angular
    .module('e2email.components.storage.StorageService', [])
    .service('storageService', StorageService);

});  // goog.scope
