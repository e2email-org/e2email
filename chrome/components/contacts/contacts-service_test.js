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
 * @fileoverview Tests for the contacts service.
 */

goog.require('e2email.components.contacts.ContactsService');
goog.require('goog.array');

describe('ContactsService', function() {
  var q;
  var service;
  var rootScope;
  var http;
  var httpBackend;
  var users = {};
  var lastRefreshMsec = 0;
  var mockAutocompleteService;
  var mockAuthService;
  var mockAutocompleteCandidates = [];
  var mockTranslateService;
  var mockStorageService;
  var localStorageExists = false;
  var token = '';
  var dateOfLastUpdate = null;
  var localContacts = [];
  var randomDate = (new Date()).toISOString();

  beforeEach(function() {
    inject(function($injector) {
      q = $injector.get('$q');
      rootScope = $injector.get('$rootScope');
      http = $injector.get('$http');
      httpBackend = $injector.get('$httpBackend');
    });

    mockStorageService = {
      initializeDBAndObjectStores: function() {
        return q.when('');
      },
      getAllKeysFromObjectStore: function() {
        return q.when(localContacts);
      },
      getKeyFromObjectStore: function() {
        var deferred = q.defer();
        // resolving as null is equivalent to stating that a key didn't exist
        if (!localStorageExists) {
          deferred.resolve(null);
        }else {
          deferred.resolve(randomDate);
        }
        return deferred.promise;
      },
      insertIntoObjectStore: function(database, objectStore, obs) {
        if (objectStore == 'lastDownload') {
          dateOfLastUpdate = obs[0]['val'];
        }
        if (objectStore == 'contacts') {
          goog.array.forEach(obs, goog.bind(function(ob) {
            localContacts.push(ob.val);
          }, this));
        }
        return this;
      }
    };

    mockTranslateService = {
      getMessage: function(m) { return m; }
    };

    mockAutocompleteService = {
      addCandidate: function(candidate, priority) {
        mockAutocompleteCandidates.push({
          'candidate': candidate,
          'priority': priority
        });
      },
      getCandidates: function(partial) {
        return [];
      }
    };

    mockAuthService = {
      withAuth: function(scope, retry, op) {
        return op(token);
      },
      addAuthorization: function(config, token) {
        if (!goog.isDefAndNotNull(config['headers'])) {
          config['headers'] = {};
        }
        config['headers']['Authorization'] = 'Bearer ' + token;
      },
      getToken: function() {
        return q.when(token);
      }
    };

    service = new e2email.components.contacts.ContactsService(q, http,
        mockTranslateService, mockAutocompleteService, mockStorageService,
        mockAuthService);
  });

  it('should initialize', function() {
    expect(service.q_).toEqual(q);
    expect(service.http_).toEqual(http);
    expect(service.translateService_).toEqual(mockTranslateService);
    expect(service.autocompleteService_).toEqual(mockAutocompleteService);
    expect(service.storageService_).toEqual(mockStorageService);
    expect(service.authService_).toEqual(mockAuthService);
  });

  it('download and process contacts from server', function() {
    service.users = {};
    var date = (new Date()).toISOString();

    var makeFeed = function(address, name) {
      return {
        'openSearch$totalResults': {
          '$t': '1001'
        },
        'entry': [{
          'gd$email': [{ 'address': address }],
          'gd$name': {
            'gd$fullName': {
              '$t': name
            }
          }
        }],
        'updated': {
          '$t': date
        }
      };
    };

    httpBackend.resetExpectations();
    httpBackend.whenGET(new RegExp(
        '^https://www.google.com/m8/feeds/contacts/default/full\\?' +
            '.*start-index=1001'))
            .respond(200, { feed: makeFeed('test2@example.com', 'test2') });
    httpBackend.whenGET(new RegExp(
        '^https://www.google.com/m8/feeds/contacts/default/full\\?' +
            '.*start-index=1'))
            .respond(200, { feed: makeFeed('test1@example.com', 'test1') });
    var mockProgress = {};
    var ok = false;
    var withError = null;
    // reset autocomplete candidates so we can check it after the method
    // completes
    mockAutocompleteCandidates = [];
    service.processContacts(
        mockProgress, lastRefreshMsec).then(function() {
      ok = true;
    }).catch(function(err) {
      withError = err;
    });
    rootScope.$apply();
    httpBackend.flush();
    httpBackend.verifyNoOutstandingExpectation();

    // verify that the date of the last update is stored correctly
    expect(dateOfLastUpdate).toBe(date);
    // verify that the downloaded contacts are stored
    expect(localContacts.length).toBe(2);
    expect(ok).toBe(true);
    expect(withError).toBe(null);
    // When done, there should be two users.
    var count = 0;
    for (var key in service.users) {
      if (service.users.hasOwnProperty(key)) {
        count++;
      }
    }

    expect(count).toBe(2);
    expect(service.users['test1@example.com']).toEqual({
      'email': 'test1@example.com',
      'fingerprintChanged': false,
      'fingerprintHex': null,
      'name': 'test1'
    });
    expect(service.users['test2@example.com']).toEqual({
      'email': 'test2@example.com',
      'fingerprintChanged': false,
      'fingerprintHex': null,
      'name': 'test2'
    });
    // There should be two autocomplete candidates, both at
    // priority 0
    expect(mockAutocompleteCandidates.length).toBe(2);
    expect(mockAutocompleteCandidates[0]).toEqual({
      'candidate': 'test1@example.com',
      'priority': 0
    });
    expect(mockAutocompleteCandidates[1]).toEqual({
      'candidate': 'test2@example.com',
      'priority': 0
    });
  });


  it('load stored contacts and request new contacts from server', function() {
    service.users = {};
    localStorageExists = true;
    var date = (new Date()).toISOString();
    dateOfLastUpdate = null;

    var makeFeed = function(address, name) {
      return {
        'openSearch$totalResults': {
          '$t': '1'
        },
        'entry': [{
          'gd$email': [{ 'address': address }],
          'gd$name': {
            'gd$fullName': {
              '$t': name
            }
          },
        }],
        'updated': {
          '$t': date
        }
      };
    };

    httpBackend.resetExpectations();
    httpBackend.whenGET(new RegExp(
        '^https://www.google.com/m8/feeds/contacts/default/full\\?updated-' +
        'min=.*')).respond(
        200, { feed: makeFeed('test3@example.com', 'test3') });

    var mockProgress = {};
    var ok = false;
    var withError = null;
    // reset autocomplete candidates so we can check it after the method
    // completes.
    mockAutocompleteCandidates = [];
    service.processContacts(
        mockProgress, lastRefreshMsec, users).then(function() {
      ok = true;
    }).catch(function(err) {
      withError = err;
    });
    rootScope.$apply();
    httpBackend.flush();
    httpBackend.verifyNoOutstandingExpectation();

    // verify that the date of the last update is stored correctly
    expect(dateOfLastUpdate).toBe(date);
    // verify that the downloaded contacts are stored
    expect(localContacts.length).toBe(3);
    expect(ok).toBe(true);
    expect(withError).toBe(null);
    // When done, there should be three users - two from local storage,
    // and a new update user
    var count = 0;
    for (var key in service.users) {
      if (service.users.hasOwnProperty(key)) {
        count++;
      }
    }

    expect(count).toBe(3);
    expect(service.users['test1@example.com']).toEqual({
      'email': 'test1@example.com',
      'fingerprintChanged': false,
      'fingerprintHex': null,
      'name': 'test1'
    });
    expect(service.users['test2@example.com']).toEqual({
      'email': 'test2@example.com',
      'fingerprintChanged': false,
      'fingerprintHex': null,
      'name': 'test2'
    });
    expect(service.users['test3@example.com']).toEqual({
      'email': 'test3@example.com',
      'fingerprintChanged': false,
      'fingerprintHex': null,
      'name': 'test3'
    });
    // There should be three autocomplete candidates, both at
    // priority 0.
    expect(mockAutocompleteCandidates.length).toBe(3);
    expect(mockAutocompleteCandidates[0]).toEqual({
      'candidate': 'test1@example.com',
      'priority': 0
    });
    expect(mockAutocompleteCandidates[1]).toEqual({
      'candidate': 'test2@example.com',
      'priority': 0
    });
    expect(mockAutocompleteCandidates[2]).toEqual({
      'candidate': 'test3@example.com',
      'priority': 0
    });
  });
});
