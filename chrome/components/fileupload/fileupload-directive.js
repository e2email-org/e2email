goog.provide('e2email.components.fileuploaddirective');
goog.provide('e2email.components.fileuploaddirective.module');

goog.scope(function() {


/**
 * Directive to upload files. An input element with file type is created, which
 * binds clicks to invoke the upload function which requires a file as it's
 * element.
 * @return {!angular.Directive}
 */
e2email.components.fileuploaddirective.fileuploadDirective = function() {
  return {
    link: function(scope, element, attrs, ctrl) {
      var rootElement = element[0];
      var inputAttachment = rootElement.lastChild;

      // Click the hidden input tag when the directive root element is clicked.
      rootElement.addEventListener('click', function(event) {
        inputAttachment.click();
      });

      // Clicking on the directive root element will trigger hidden input tag
      // to be activated, which isn't needed a second time.
      inputAttachment.addEventListener('click', function(event) {
        event.stopPropagation();
      });

      // Upload each file that the user has selected from the modal dialog.
      inputAttachment.addEventListener('change', function(event) {
        var files = event.target.files;

        angular.forEach(files, function(file) {
          var reader = new FileReader();
          reader.onload = function(fileEvent) {
            scope.$apply(function() {
              scope.upload({'name': file.name, 'type': file.type,
                'contents': fileEvent.target.result, 'size': file.size});
            });
          };
          reader.readAsText(file);
        });
      });
    },
    restrict: 'A',
    scope: {
      /** @export */
      accept: '@asAccept',
      /** @export */
      upload: '&asUpload'
    },
    template: '<ng-transclude></ng-transclude>' +
        '<input type="file" style="display:none;" multiple>',
    transclude: true
  };
};


/**
 * Angular module.
 * @type {!angular.Module}
 */
e2email.components.fileuploaddirective.module = angular
    .module(
        'e2email.components.fileuploaddirective.FileuploadDirective', [])
    .directive(
        'asUpload',
        e2email.components.fileuploaddirective.fileuploadDirective);
});  // goog.scope
