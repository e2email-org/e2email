/**
 * @fileoverview Tests for the welcome page controller.
 */

goog.require('e2email.pages.welcome.WelcomeCtrl');

describe('WelcomeCtrl', function() {
  var q, controller, welcomeController, rootScope, scope, location;
  var approved = true;
  var mockService;
  var mockTranslateService = {
    getMessage: function(label) {
      return label;
    }
  };

  beforeEach(module(function($controllerProvider) {
    $controllerProvider.register(
        'WelcomeCtrl', e2email.pages.welcome.WelcomeCtrl);
  }));

  beforeEach(inject(function($q, $rootScope, $controller, $location) {
    rootScope = $rootScope;
    scope = $rootScope.$new();
    controller = $controller;
    location = $location;
    q = $q;
    mockService = {
      signIn: function() {
        return q.when(approved);
      }
    };
  }));

  it('should go to /setup upon approval', function() {
    approved = true;
    welcomeController = controller(
        'WelcomeCtrl as welcomeCtrl', {
          $scope: scope,
          $location: location,
          translateService: mockTranslateService,
          gmailService: mockService
        });
    location.path('/welcome');
    expect(location.path()).toBe('/welcome');
    // punch the sign-in button
    scope.welcomeCtrl.signIn();
    rootScope.$apply();
    expect(location.path()).toBe('/setup');
  });

  it('location should remain unchanged without approval', function() {
    approved = false;
    welcomeController = controller(
        'WelcomeCtrl as welcomeCtrl', {
          $scope: scope,
          $location: location,
          translateService: mockTranslateService,
          gmailService: mockService
        });
    location.path('/welcome');
    expect(location.path()).toBe('/welcome');
    // punch the sign-in button
    scope.welcomeCtrl.signIn();
    rootScope.$apply();
    expect(location.path()).toBe('/welcome');
  });

});
