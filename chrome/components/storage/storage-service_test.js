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
 * @fileoverview Tests for the storage service.
 */

goog.require('e2email.components.storage.module');
goog.require('goog.db');

describe('StorageService', function() {

  var storageService;
  var dbName = 'testDb';
  var objectStoreCompose = [{name: 'contacts', indices: ['email',
        'priority', 'name']}];
  var storeName = objectStoreCompose[0].name;
  var keyField = objectStoreCompose[0].indices[0];
  var additionalField = objectStoreCompose[0].indices[1];
  var obj1 = {keyField: 'alice@google.com', additionalField: 'high'};
  var obj2 = {keyField: 'bob@google.com', additionalField: 'low'};
  var q, rootScope;
  var fakeDb = {};
  var ans = '';
  var dbHandle;


  beforeEach(module(e2email.components.storage.module.name));

  beforeEach(function() {
    ans = '';
    inject(function($injector) {
      q = $injector.get('$q');
      rootScope = $injector.get('$rootScope');
      storageService = $injector.get('storageService');
      goog.db = {
        openDatabase: jasmine.createSpy().and.callFake(function(databaseName,
            version, upgradeCallback) {
              return goog.db;
            }),
        addCallbacks: jasmine.createSpy().and.callFake(function(resolve,
            reject, referenceToThis) {
              resolve(goog.db);
            }),
        addCallback: jasmine.createSpy().and.callFake(function(resolve) {
              resolve(goog.db);
        }),
        createTransaction: jasmine.createSpy().and.callFake(
            function(transactionName, mode) {
              return goog.db;
            }),
        wait: jasmine.createSpy().and.callFake(
            function() {
              return goog.db;
            }),
        Transaction: goog.db,
        TransactionMode: goog.db,
        READ_WRITE: goog.db,
        objectStore: jasmine.createSpy().and.callFake(
            function(objectStoreName) {
              return goog.db;
            }),
        put: jasmine.createSpy().and.callFake(function(obj, key) {
          fakeDb[key] = obj;
          return goog.db;
        }),
        get: jasmine.createSpy().and.callFake(function(obj) {
          ans = fakeDb[obj];
          return goog.db;
        }),
        getAll: jasmine.createSpy().and.callFake(function() {
          ans = [];
          for (var i in fakeDb) {
            ans.push(fakeDb[i]);
          }
          return goog.db;
        })
      };
    });
  });


  // tests initializeDBAndObjectStores
  it('creates a new database and object store', function() {
    var res = '';
    dbHandle = storageService.initializeDBAndObjectStores(
        dbName, objectStoreCompose);
    dbHandle.then(function() {
      res = 'created successfully';
    }).catch(function() {
      res = 'failed';
    });
    rootScope.$apply();
    expect(res).toBe('created successfully');
    expect(goog.db.openDatabase).toHaveBeenCalled();
    expect(goog.db.addCallbacks).toHaveBeenCalled();
  });


  // tests insertIntoObjectStore
  it('gets a database handle and inserts two objects', function() {
    var resInsert = '';
    dbHandle = storageService.initializeDBAndObjectStores(
        dbName, objectStoreCompose);
    dbHandle.then(function(database) {
      storageService.insertIntoObjectStore(database, storeName,
          [{val: obj1, key: obj1.keyField}, {val: obj2, key: obj2.keyField}]);
    }).then(function() {
      resInsert = 'insertion successful';
    });
    rootScope.$apply();
    expect(resInsert).toBe('insertion successful');
    expect(goog.db.createTransaction).toHaveBeenCalled();
    expect(goog.db.addCallbacks).toHaveBeenCalled();
  });


  // tests getKeyFromObjectStore
  it('gets a single key', function() {
    var resSingleGet = '';
    dbHandle = storageService.initializeDBAndObjectStores(
        dbName, objectStoreCompose);
    dbHandle.then(function(database) {
      storageService.getKeyFromObjectStore(database, storeName, obj1.keyField);
    }).then(function() {
      resSingleGet = ans;
    });
    rootScope.$apply();
    expect(resSingleGet).toEqual(obj1);
    expect(goog.db.createTransaction).toHaveBeenCalled();
    expect(goog.db.addCallbacks).toHaveBeenCalled();
  });


  // tests getAllKeysFromObjectStored
  it('gets all keys', function() {
    var resGetAll = '';
    dbHandle = storageService.initializeDBAndObjectStores(
        dbName, objectStoreCompose);
    dbHandle.then(function(database) {
      storageService.getAllKeysFromObjectStore(database, storeName);
    }).then(function() {
      if ((ans[0] == obj1 || ans[0] == obj2) &&
          (ans[1] == obj1 || ans[1] == obj2)) {
        resGetAll = 'Gets successful';
      }
    });
    rootScope.$apply();
    expect(resGetAll).toBe('Gets successful');
    expect(goog.db.createTransaction).toHaveBeenCalled();
    expect(goog.db.addCallbacks).toHaveBeenCalled();
  });
});

