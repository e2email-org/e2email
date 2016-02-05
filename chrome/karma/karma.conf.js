module.exports = function(config) {
  config.set({
    'basePath': '../',
    'frameworks': [
      'jasmine'
    ],
    'plugins': [
      'karma-jasmine',
      'karma-ng-html2js-preprocessor',
      'karma-html2js-preprocessor',
      'karma-chrome-launcher'
    ],
    'preprocessors': {
      '**/*.html': [
        'ng-html2js'
      ]
    },
    'usePolling': true,
    'files': [
      '../build/e2email/assets/js/angular.js',
      '../build/e2email/assets/js/angular-aria.js',
      '../build/e2email/assets/js/angular-animate.js',
      '../build/e2email/assets/js/angular-route.js',
      '../build/e2email/e2email_binary.js',
      'karma/angular-mocks.js',
      '**/*_test.js',
      '**/*.html'
    ]
  });
};
