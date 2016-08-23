goog.provide('e2email.components.blobhrefdirective');
goog.provide('e2email.components.blobhrefdirective.module');

goog.require('goog.string');


goog.scope(function() {


/**
 * Directive that puts a blob: URL into an href attribute.
 * Directive has to be used as blob: URLs are untrusted by Angular.
 * See https://docs.angularjs.org/api/ng/provider/$compileProvider
 * @return {!angular.Directive}
 */
e2email.components.blobhrefdirective.Directive =
    function() {
  return {
    link: function(scope, element, attrs) {
      if (goog.string.startsWith(attrs['blobHref'], 'blob:')) {
        angular.element(element[0]).attr('href', attrs['blobHref']);
      }
    },
    restrict: 'A',
  };
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.blobhrefdirective.module = angular
    .module(
        'e2email.components.blobhrefdirective.FixDownloadLinkDirective',
        [])
    .directive(
        'blobHref',
        e2email.components.blobhrefdirective.Directive);
});  // goog.scope
