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
 * @fileoverview Tests for the auth service.
 */

goog.require('e2email.components.auth.AuthService');

describe('AuthService', function() {
  var window, q, log, http, service, token, httpBackend, rootScope;

  beforeEach(function() {
    inject(function($injector) {
      window = $injector.get('$window');
      log = $injector.get('$log');
      q = $injector.get('$q');
      http = $injector.get('$http');
      httpBackend = $injector.get('$httpBackend');
      rootScope = $injector.get('$rootScope');
      window.chrome = {
        identity: {
          getAuthToken: function(options, cb) {
            cb(token);
          },
          removeCachedAuthToken: function(options, cb) {
            token = '*removed*';
            cb(token);
          }
        },
        runtime: {
        }
      };
    });
    service = new e2email.components.auth.AuthService(window, log, q, http);
  });

  it('should retry requests with stale tokens', function() {
    // Ask the backend to return an "unauthorized" response on a
    // fake request we'll make. We'll return either a 400 or a
    // 200 depending on the token we get (which is passed in the url.)
    var FAKE_REQUEST = 'https://example.com/request';
    // This request we'll reject.
    httpBackend.whenGET(FAKE_REQUEST + '/abc').respond(400, '');
    // This one we'll accept.
    httpBackend.whenGET(FAKE_REQUEST + '/*removed*').respond(200, '');

    // Store the tokens received by the operation.
    var tokens_received = [];
    var ok = false;
    var witherror = null;

    // Start off with a supposedly valid token.
    token = 'abc';
    service.withAuth(null, true, function(access_token) {
      // save tokens so we can check what we got.
      tokens_received.push(access_token);
      return http.get(FAKE_REQUEST + '/' + access_token);
    }).then(function() {
      ok = true;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    httpBackend.flush();
    httpBackend.verifyNoOutstandingRequest();
    expect(witherror).toBeNull();
    expect(ok).toBe(true);
    // We want to see the saved tokens to reflect we've made two
    // requests, and the second after removing the prior token from
    // the cache.
    expect(tokens_received).toEqual(['abc', '*removed*']);
  });

  it('should remove cached tokens and revoke them', function() {
    token = 'xyz';
    httpBackend.expectGET(
        'https://accounts.google.com/o/oauth2/revoke?token=xyz').respond(
            201, '');
    var done = false;
    service.signOut().then(function() {
      done = true;
    });
    rootScope.$apply();
    httpBackend.flush();

    httpBackend.verifyNoOutstandingExpectation();
    expect(token).toEqual('*removed*');
    expect(done).toBe(true);
  });

  it('should add proper authorization headers', function() {
    var config = {};
    service.addAuthorization(config, 'token');
    expect(config.headers).toEqual({ 'Authorization': 'Bearer token'});
  });
});
