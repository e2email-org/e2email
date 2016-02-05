/**
 * @fileoverview Tests for the settings page controller.
 */

goog.require('e2email.pages.settings.SettingsCtrl');

describe('SettingsCtrl', function() {
  var q, controller, settingsController, rootScope, scope, location;
  var TEST_EMAIL = 'test@email.com';
  var TEST_BACKUP_CODE = 'test-backup-code';
  var TEST_VERSION = 'test-version';
  var TEST_PLATFORM = 'test-platform';
  var TEST_KEY = {
    key: {
      fingerprintHex: 'abc'
    }
  };
  var mockAppinfoService = {
    getVersion: function() {
      return TEST_VERSION;
    },
    getPlatform: function() {
      return q.when(TEST_PLATFORM);
    }
  };
  var mockOpenpgpService = {
    searchPublicKey: function(email, remote) {
      if ((email === TEST_EMAIL) && !remote) {
        return q.when(TEST_KEY);
      } else {
        return q.reject('bad arguments');
      }
    },
    getSecretBackupCode: function(email) {
      if (email === TEST_EMAIL) {
        return q.when(TEST_BACKUP_CODE);
      } else {
        return q.reject('bad argument');
      }
    }
  };
  var mockGmailService = {
    mailbox: {
      email: TEST_EMAIL
    }
  };

  beforeEach(module(function($controllerProvider) {
    $controllerProvider.register(
        'SettingsCtrl', e2email.pages.settings.SettingsCtrl);
  }));

  beforeEach(inject(function($q, $rootScope, $controller, $location) {
    rootScope = $rootScope;
    scope = $rootScope.$new();
    controller = $controller;
    location = $location;
    q = $q;
  }));

  it('should initialize info after refresh', function() {
    settingsController = controller(
        'SettingsCtrl as settingsCtrl', {
          $scope: scope,
          $location: location,
          appinfoService: mockAppinfoService,
          openpgpService: mockOpenpgpService,
          gmailService: mockGmailService
        });
    expect(settingsController.info.email).toBe(TEST_EMAIL);
    expect(settingsController.info.fingerprintHex).toBeNull();
    settingsController.refresh_();
    rootScope.$apply();
    expect(settingsController.info.fingerprintHex).toBe(
        TEST_KEY.key.fingerprintHex);
  });

  it('should send to mailbox on return', function() {
    settingsController = controller(
        'SettingsCtrl as settingsCtrl', {
          $scope: scope,
          $location: location,
          appinfoService: mockAppinfoService,
          openpgpService: mockOpenpgpService,
          gmailService: mockGmailService
        });
    location.path('/settings');
    expect(location.path()).toBe('/settings');
    // punch back button
    scope.settingsCtrl.showThreads();
    rootScope.$apply();
    expect(location.path()).toBe('/threads');
  });


});
