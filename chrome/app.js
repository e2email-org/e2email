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
 * @fileoverview main module for the safe mail app.
 */

goog.provide('e2email.application.module');

goog.require('e2email.components.appinfo.module');
goog.require('e2email.components.auth.module');
goog.require('e2email.components.autocomplete.module');
goog.require('e2email.components.autocompletedirective.module');
goog.require('e2email.components.contacts.module');
goog.require('e2email.components.gmail.module');
goog.require('e2email.components.openpgp.module');
goog.require('e2email.components.outerclick.module');
goog.require('e2email.components.relativedate.module');
goog.require('e2email.components.storage.module');
goog.require('e2email.components.translate.module');
goog.require('e2email.components.translatefilter.module');
goog.require('e2email.components.userinfo.module');
goog.require('e2email.components.userlist.module');
goog.require('e2email.constants.Location');
goog.require('e2email.pages.messages.MessagesCtrl');
goog.require('e2email.pages.recover.RecoverCtrl');
goog.require('e2email.pages.reset.ResetCtrl');
goog.require('e2email.pages.settings.SettingsCtrl');
goog.require('e2email.pages.introduction.IntroductionCtrl');
goog.require('e2email.pages.getstarted.GetStartedCtrl');
goog.require('e2email.pages.setup.SetupCtrl');
goog.require('e2email.pages.showsecret.ShowSecretCtrl');
goog.require('e2email.pages.threads.ThreadsCtrl');
goog.require('e2email.pages.welcome.WelcomeCtrl');
goog.require('e2email.pages.authorization.AuthorizationCtrl');
goog.require('e2email.util.Email');
goog.require('e2email.util.Http');


/**
 * @param {!angular.$routeProvider} $routeProvider route provider service.
 * @ngInject
 */
e2email.application.routeProvider = function($routeProvider) {
  $routeProvider.
      when(e2email.constants.Location.MESSAGES + '/:threadId', {
        pageTitle: 'E2EMail',
        templateUrl: 'pages/messages/messages.html',
        controller: 'MessagesCtrl',
        controllerAs: 'messagesCtrl'
      }).when(e2email.constants.Location.SETUP, {
        pageTitle: 'E2EMail - Setup',
        templateUrl: 'pages/setup/setup.html',
        controller: 'SetupCtrl',
        controllerAs: 'setupCtrl'
      }).when(e2email.constants.Location.SETTINGS, {
        pageTitle: 'E2EMail - Account',
        templateUrl: 'pages/settings/settings.html',
        controller: 'SettingsCtrl',
        controllerAs: 'settingsCtrl'
      }).when(e2email.constants.Location.WELCOME, {
        pageTitle: 'E2EMail - Welcome',
        templateUrl: 'pages/welcome/welcome.html',
        controller: 'WelcomeCtrl',
        controllerAs: 'welcomeCtrl'
      }).when(e2email.constants.Location.AUTHORIZATION, {
        pageTitle: 'E2EMail - Authorization',
        templateUrl: 'pages/authorization/authorization.html',
        controller: 'AuthorizationCtrl',
        controllerAs: 'authorizationCtrl'
      }).when(e2email.constants.Location.RESET, {
        pageTitle: 'E2EMail - Reset',
        templateUrl: 'pages/reset/reset.html',
        controller: 'ResetCtrl',
        controllerAs: 'resetCtrl'
      }).when(e2email.constants.Location.RECOVER, {
        pageTitle: 'E2EMail - Recover',
        templateUrl: 'pages/recover/recover.html',
        controller: 'RecoverCtrl',
        controllerAs: 'recoverCtrl'
      }).when(e2email.constants.Location.SHOWSECRET, {
        pageTitle: 'E2EMail - Recovery code',
        templateUrl: 'pages/showsecret/showsecret.html',
        controller: 'ShowSecretCtrl',
        controllerAs: 'showSecretCtrl'
      }).when(e2email.constants.Location.INTRODUCTION, {
        pageTitle: 'E2EMail - Introduction',
        templateUrl: 'pages/introduction/introduction.html',
        controller: 'IntroductionCtrl',
        controllerAs: 'introductionCtrl'
      }).when(e2email.constants.Location.GETSTARTED, {
        pageTitle: 'E2EMail - Get Started',
        templateUrl: 'pages/getstarted/getstarted.html',
        controller: 'GetStartedCtrl',
        controllerAs: 'getStartedCtrl'
      }).when(e2email.constants.Location.THREADS, {
        pageTitle: 'E2EMail',
        templateUrl: 'pages/threads/threads.html',
        controller: 'ThreadsCtrl',
        controllerAs: 'threadsCtrl'
      }).otherwise({redirectTo: '/setup'});
};


/**
 * @param {!angular.$animateProvider} $animateProvider animation service.
 * @ngInject
 */
e2email.application.animateProvider = function($animateProvider) {
  // Allow selective disabling of animations as necessary.
  $animateProvider.classNameFilter(/^((?!sm-disable-animation).)*$/);
};


/**
 * The main module for the e2email app.
 * @type {!angular.Module}
 */
e2email.application.module = angular.module('e2email.application', [
  e2email.components.appinfo.module.name,
  e2email.components.auth.module.name,
  e2email.components.autocomplete.module.name,
  e2email.components.autocompletedirective.module.name,
  e2email.components.contacts.module.name,
  e2email.components.gmail.module.name,
  e2email.components.openpgp.module.name,
  e2email.components.outerclick.module.name,
  e2email.components.relativedate.module.name,
  e2email.components.storage.module.name,
  e2email.components.translate.module.name,
  e2email.components.translatefilter.module.name,
  e2email.components.userinfo.module.name,
  e2email.components.userlist.module.name,
  'ngAnimate',
  'ngAria',
  'ngRoute'
]);

e2email.application.module.config(e2email.application.routeProvider);
e2email.application.module.config(e2email.application.animateProvider);

// register all controllers
e2email.application.module.controller(
    'MessagesCtrl', e2email.pages.messages.MessagesCtrl);
e2email.application.module.controller(
    'SetupCtrl', e2email.pages.setup.SetupCtrl);
e2email.application.module.controller(
    'SettingsCtrl', e2email.pages.settings.SettingsCtrl);
e2email.application.module.controller(
    'ShowSecretCtrl', e2email.pages.showsecret.ShowSecretCtrl);
e2email.application.module.controller(
    'ResetCtrl', e2email.pages.reset.ResetCtrl);
e2email.application.module.controller(
    'RecoverCtrl', e2email.pages.recover.RecoverCtrl);
e2email.application.module.controller(
    'ThreadsCtrl', e2email.pages.threads.ThreadsCtrl);
e2email.application.module.controller(
    'WelcomeCtrl', e2email.pages.welcome.WelcomeCtrl);
e2email.application.module.controller(
    'AuthorizationCtrl', e2email.pages.authorization.AuthorizationCtrl);
e2email.application.module.controller(
    'IntroductionCtrl', e2email.pages.introduction.IntroductionCtrl);
e2email.application.module.controller(
    'GetStartedCtrl', e2email.pages.getstarted.GetStartedCtrl);

// Change page title based on route
// TODO(kbsriram) use translationService
e2email.application.module.run(
    ['$rootScope', '$route', function($rootScope, $route) {
      $rootScope.$on('$routeChangeSuccess', function() {
        if (goog.isDefAndNotNull($route.current.pageTitle)) {
          document.title = $route.current.pageTitle;
        }
      });
    }]);
