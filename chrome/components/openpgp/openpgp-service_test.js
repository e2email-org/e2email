/**
 * @fileoverview Tests for the pgp service.
 */

goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.error.UnsupportedError');
goog.require('e2e.openpgp.KeyGenerator');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2email.components.openpgp.OpenPgpService');
goog.require('goog.array');

goog.scope(function() {


describe('OpenPgpService', function() {
  var q;
  var service;
  var http;
  var httpBackend;
  var rootScope;
  var TEST_EMAIL = 'email@test.com';
  var LOCAL_EMAIL = 'email@local.com';
  var REMOTE_EMAIL = 'email@remote.com';
  var MIXED_EMAIL = 'email@mixed.com';
  var MULTITEST_EMAIL = 'multi@test.com';
  var ID_TOKEN = 'idtoken';
  var TEST_KEY = {
    serialized: [1, 2],
    key: {
      fingerprint: [0, 1, 2],
      fingerprintHex: '012'
    }
  };
  var EXTRA_KEY = {
    serialized: [3, 4],
    key: {
      fingerprint: [5, 6, 7],
      fingerprintHex: '567'
    }
  };
  var REMOTE_KEY = {
    serialized: [5, 6],
    key: {
      fingerprint: [7, 8, 9],
      fingerprintHex: '789'
    }
  };
  var MIXED_LOCAL_KEY = {
    serialized: [7, 8],
    key: {
      fingerprint: [9, 10, 11],
      fingerprintHex: '91011'
    }
  };
  var MIXED_REMOTE_KEY = {
    serialized: [9, 10],
    key: {
      fingerprint: [11, 12, 13],
      fingerprintHex: '111213'
    }
  };

  var TEST_BACKUP_CODE = 'BfGRZL7c75qu5bFwXXjWpmSEe'; // All 1s seed.
  var TEST_CIPHERTEXT = 'ciphertext';
  var TEST_PLAINTEXT = 'plaintext';
  var decryptResult = null; // Initialized within the test

  var makeResult = function(result) {
    return {
      addCallback: function(f) {
        f(result);
        return this;
      },
      addErrback: function(f) {
        return this;
      },
      addCallbacks: function(f, e, scope) {
        goog.bind(f, scope)(result);
        return this;
      }
    };
  };

  var mockContext = {
    searchPublicKey: function(key) {
      // This key will show up both locally and remotely.
      if ((key === TEST_EMAIL) || (key == '<' + TEST_EMAIL + '>')) {
        return makeResult([TEST_KEY]);
      } else if (key == '<' + LOCAL_EMAIL + '>') {
        // This key will only show up locally.
        return makeResult([EXTRA_KEY]);
      } else if (key == REMOTE_EMAIL) {
        // This key will only show up remotely.
        return makeResult([REMOTE_KEY]);
      } else if (key == MIXED_EMAIL) {
        // This key will be different, depending on whether
        // it is remote or local.
        return makeResult([MIXED_REMOTE_KEY]);
      } else if (key == '<' + MIXED_EMAIL + '>') {
        return makeResult([MIXED_LOCAL_KEY]);
      } else if (key === MULTITEST_EMAIL) {
        return makeResult([TEST_KEY, EXTRA_KEY]);
      } else {
        return makeResult(null);
      }
    },
    searchPrivateKey: function(key) {
      if (key === ('<' + TEST_EMAIL + '>')) {
        return makeResult([TEST_KEY]);
      } else if (key === '<' + MULTITEST_EMAIL + '>') {
        return makeResult(['a', 'b']);
      } else {
        return makeResult(null);
      }
    },
    getKeyringBackupData: function() {
      return makeResult({
        count: 2,
        seed: goog.array.repeat(1, e2e.openpgp.KeyGenerator.ECC_SEED_SIZE)
      });
    },
    deleteKey: function(email) {
    },
    restoreKeyring: function(seed, email) {
      return makeResult(undefined);
    },
    encryptSign: function(plaintext, options, keys, passwd, signingkey) {
      return makeResult(TEST_CIPHERTEXT);
    },
    verifyDecrypt: function(callback, ciphertext) {
      return makeResult(decryptResult);
    }
  };

  var mockTranslateService = {
    getMessage: function(m) { return m; }
  };

  var mockAppinfoService = {
    getVersion: function() { return '42'; }
  };


  beforeEach(function() {
    inject(function($injector) {
      q = $injector.get('$q');
      http = $injector.get('$http');
      rootScope = $injector.get('$rootScope');
      httpBackend = $injector.get('$httpBackend');
    });
    service = new e2email.components.openpgp.OpenPgpService(
        q, http, mockTranslateService, mockAppinfoService);

    service.context_ = mockContext;
    spyOn(mockContext, 'deleteKey');
    spyOn(mockContext, 'searchPublicKey').and.callThrough();
    spyOn(mockContext, 'restoreKeyring').and.callThrough();
    spyOn(mockContext, 'encryptSign').and.callThrough();
    spyOn(mockContext, 'verifyDecrypt').and.callThrough();
  });

  it('should initialize', function() {
    expect(service.q_).toEqual(q);
    expect(service.http_).toEqual(http);
  });

  it('should search for private keys', function() {
    var result = null;
    service.searchPrivateKey(TEST_EMAIL).then(function(v) {
      result = v;
    });
    rootScope.$apply();
    expect(result).toEqual(TEST_KEY);

    // Should not return anything if key not in db.
    service.searchPrivateKey('not-in-db').then(function(v) {
      result = v;
    });
    rootScope.$apply();
    expect(result).toBeNull();

    // Should throw an error if context returns multiple keys.
    var witherror = null;
    service.searchPrivateKey(MULTITEST_EMAIL).then(function(v) {
      result = v;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(result).toBeNull();
    expect(witherror).toEqual(new e2e.error.UnsupportedError(
        'This application does not support multiple private keys.'));
  });

  it('should make a backup code', function() {
    var result = null;
    service.getSecretBackupCode(TEST_EMAIL).then(function(v) {
      result = v;
    });
    rootScope.$apply();
    // All 1's seed.
    expect(result).toBe(TEST_BACKUP_CODE);

    // Catch situations where somehow we get passed in an email
    // we don't actually have.
    result = null;
    var witherror = null;
    service.getSecretBackupCode('not-in-db').then(function(v) {
      result = v;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(result).toBeNull();
    expect(witherror).toEqual(new e2e.error.InvalidArgumentsError(
        'No private key found.'));
  });

  it('should restore from backup code', function() {
    var result = false;
    var witherror = null;
    var progress = jasmine.createSpyObj('progress', ['status']);
    service.restoreFromSecretBackupCode(
        TEST_BACKUP_CODE, TEST_EMAIL, ID_TOKEN, progress).then(function() {
          result = true;
        }).catch(function(err) {
          witherror = err;
        });
    rootScope.$apply();
    // Should have deleted keys with this email.
    expect(mockContext.deleteKey).toHaveBeenCalledWith('<' + TEST_EMAIL + '>');
    expect(result).toBe(true);
    expect(witherror).toBeNull();

    // Check we get a suitable upload request when we pass in an email
    // that doesn't exist on the server end.
    var encoded = encodeURIComponent(e2e.openpgp.asciiArmor.encode(
        'PUBLIC KEY BLOCK', EXTRA_KEY.serialized));

    httpBackend.expectPOST(
        e2email.components.openpgp.OpenPgpService.KEYSERVER_URL +
            '/pks/oauthadd',
        'token=idtoken&keytext=' + encoded).respond(201, '');
    result = false;
    witherror = null;
    service.restoreFromSecretBackupCode(
        TEST_BACKUP_CODE, LOCAL_EMAIL, ID_TOKEN, progress).then(function() {
          result = true;
        }).catch(function(err) {
          witherror = err;
        });
    rootScope.$apply();
    // This should make the http call, so we can now flush the backend.
    httpBackend.flush();
    expect(mockContext.deleteKey).toHaveBeenCalledWith('<' + LOCAL_EMAIL + '>');
    expect(result).toBe(true);
    expect(witherror).toBeNull();
    httpBackend.verifyNoOutstandingExpectation();
  });

  it('should encrypt and sign', function() {
    var result = null;
    var witherror = null;
    service.encryptSign('foo', [TEST_KEY], TEST_KEY).then(function(v) {
      result = v;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(result).toBe(TEST_CIPHERTEXT);
    expect(witherror).toBe(null);
    expect(mockContext.encryptSign).toHaveBeenCalledWith(
        'foo', {}, [TEST_KEY], [], TEST_KEY);
  });

  it('should decrypt and verify', function() {
    var result = null;
    var witherror = null;
    // First, a good result.
    var decryptData = [];
    for (var i = 0; i < TEST_PLAINTEXT.length; i++) {
      decryptData.push(TEST_PLAINTEXT.charCodeAt(i));
    }
    decryptResult = {
      verify: {
        success: [EXTRA_KEY, TEST_KEY],
        failure: []
      },
      decrypt: {
        data: decryptData,
        options: {}
      }
    };

    service.decryptVerify(TEST_CIPHERTEXT, TEST_KEY, TEST_KEY)
        .then(function(v) {
          result = v;
        }).catch(function(err) {
          witherror = err;
        });
    rootScope.$apply();
    expect(result.content).toBe(TEST_PLAINTEXT);
    expect(result.warning).toBe(null);
    expect(witherror).toBe(null);
    expect(mockContext.verifyDecrypt).toHaveBeenCalledWith(
        jasmine.any(Function), TEST_CIPHERTEXT);

    // Then, something that doesn't have a required signature.
    result = null;
    witherror = null;
    decryptResult.verify.success = [EXTRA_KEY];
    service.decryptVerify(TEST_CIPHERTEXT, TEST_KEY, TEST_KEY)
        .then(function(v) {
          result = v;
        }).catch(function(err) {
          witherror = err;
        });
    rootScope.$apply();
    expect(result.content).toBe(TEST_PLAINTEXT);
    expect(result.warning).toBe('invalidSignatureError');
    expect(witherror).toBe(null);
    expect(mockContext.verifyDecrypt).toHaveBeenCalledWith(
        jasmine.any(Function), TEST_CIPHERTEXT);
  });

  it('should cache verified keys', function() {
    var dummyKey = {
      key: {
        fingerprint: [3, 14, 15]
      }
    };
    expect(service.shouldVerify_(dummyKey)).toBe(true);
    service.setVerified_(dummyKey);
    expect(service.shouldVerify_(dummyKey)).toBe(false);
  });

  it('should verify keys', function() {
    var result = null;
    var witherror = null;

    // This is a local-only key; which we should reject as we can't
    // find a confirming key at the keyserver.
    service.getVerifiedPublicKey(LOCAL_EMAIL).then(function(v) {
      result = v;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(result).toBe(null);
    expect(witherror).toBe(null);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        LOCAL_EMAIL);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        '<' + LOCAL_EMAIL + '>');

    mockContext.searchPublicKey.calls.reset();
    // This key exists locally and remotely, which we should find.
    service.getVerifiedPublicKey(TEST_EMAIL).then(function(v) {
      result = v;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(result.local).toBe(TEST_KEY);
    expect(result.remote).toBe(TEST_KEY);
    expect(witherror).toBe(null);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        TEST_EMAIL);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        '<' + TEST_EMAIL + '>');

    mockContext.searchPublicKey.calls.reset();
    // Calling it a second time should cache the remote call.
    service.getVerifiedPublicKey(TEST_EMAIL).then(function(v) {
      result = v;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(result.local).toBe(TEST_KEY);
    expect(result.remote).toBe(TEST_KEY);
    expect(witherror).toBe(null);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        '<' + TEST_EMAIL + '>');
    expect(mockContext.searchPublicKey.calls.count()).toEqual(1);

    mockContext.searchPublicKey.calls.reset();
    // This key exists only remotely, which we should also find.
    service.getVerifiedPublicKey(REMOTE_EMAIL).then(function(v) {
      result = v;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(result.local).toBe(REMOTE_KEY);
    expect(result.remote).toBe(REMOTE_KEY);
    expect(witherror).toBe(null);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        REMOTE_EMAIL);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        '<' + REMOTE_EMAIL + '>');

    // This key has different local and remote values, which we
    // should recognize.
    mockContext.searchPublicKey.calls.reset();
    service.getVerifiedPublicKey(MIXED_EMAIL).then(function(v) {
      result = v;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(result.local).toBe(MIXED_LOCAL_KEY);
    expect(result.remote).toBe(MIXED_REMOTE_KEY);
    expect(witherror).toBe(null);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        MIXED_EMAIL);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        '<' + MIXED_EMAIL + '>');

    // The second time we call it, we still want the remote check to be made,
    // as only matching keys should be cached.
    mockContext.searchPublicKey.calls.reset();
    service.getVerifiedPublicKey(MIXED_EMAIL).then(function(v) {
      result = v;
    }).catch(function(err) {
      witherror = err;
    });
    rootScope.$apply();
    expect(result.local).toBe(MIXED_LOCAL_KEY);
    expect(result.remote).toBe(MIXED_REMOTE_KEY);
    expect(witherror).toBe(null);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        MIXED_EMAIL);
    expect(mockContext.searchPublicKey).toHaveBeenCalledWith(
        '<' + MIXED_EMAIL + '>');
  });

});

});  // goog.scope
