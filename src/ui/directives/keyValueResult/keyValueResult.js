angular.module('app').directive('keyValueResult', [
  'recursionHelper',
  function(recursionHelper) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: __dirname + '/directives/keyValueResult/keyValueResult.html',
      controller: 'keyValueResultCtrl',
      scope: {
        result: '=',
        resultOriginal: '=',
        level: '@'
      },
      compile: function(element) {
        return recursionHelper.compile(element);
      }
    };
  }
]);
