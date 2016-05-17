'use strict';

angular.module('app').controller('listConnectionsCtrl', [
  '$scope',
  '$timeout',
  'connectionCache',
  'notificationService',
  function($scope, $timeout, connectionCache, notificationService) {
    const connectionModule = require('lib/modules/connection');
    const logger = require('lib/modules/logger');

    $scope.connections = [];

    $scope.loading = false;

    $scope.$parent.selectedConnection = null; //reset the parent's selected connection

    _listConnections();

    $scope.selectAndConnect = function(connection, $event) {
      if (!connection) return false;
      if ($event) $event.preventDefault();

      _.each($scope.connections, (conn) => {
        conn.selected = false;
      });

      connection.selected = true;

      $scope.connect();
    };

    $scope.selectConnection = function(connection, $event) {
      if (!connection) return false;
      if ($event) $event.preventDefault();

      if (connection.selected) {
        connection.selected = false;
        return;
      }

      _.each($scope.connections, function(conn) {
        conn.selected = false;
      });

      connection.selected = true;
    };

    $scope.copyConnection = function(connection, $event) {
      if (!connection) return false;
      if ($event) $event.preventDefault();

      let newConnection = _.clone(connection);
      delete newConnection.id;
      newConnection.name += ' copy';

      $scope.changePage('add', newConnection);
    };

    $scope.connectionSelected = function() {
      return _.any($scope.connections, (conn) => {
        return conn.selected;
      });
    };

    $scope.connect = function($event) {
      if ($event) $event.preventDefault();

      var activeConnection = _.findWhere($scope.connections, {
        selected: true
      });

      if (!activeConnection) return;

      activeConnection.connecting = true;

      let startTime = performance.now();

      activeConnection.connect()
        .then(() => {
          var ellapsed = (performance.now() - startTime).toFixed(5);

          $timeout(() => {
            connectionCache.add(activeConnection);

            $scope.close();
          }, (ellapsed >= 1000 ? 0 : 1000));
        })
        .catch(err => {
          $timeout(() => {
            err.message = 'Error connecting to your database. Verify your connection settings are correct and the mongod process is running.';

            notificationService.error({
              title: 'Error connecting',
              message: err
            });
          });
        })
        .finally(() => {
          var ellapsed = (performance.now() - startTime).toFixed(5);

          $timeout(() => {
            activeConnection.connecting = false;
          }, (ellapsed >= 1000 ? 0 : 1000));
        });
    };

    function _listConnections() {
      $scope.loading = true;

      connectionModule.list()
        .then((connections) => {
          $timeout(() => {
            $scope.connections = connections;
          });
        })
        .catch((response) => {
          $timeout(() => {
            logger.error(response);
          });
        })
        .finally(() => {
          $timeout(() => {
            $scope.loading = false;
          });
        });
    }
  }
]);
