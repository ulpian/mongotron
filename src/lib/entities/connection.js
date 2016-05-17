'use strict';

const MongoDb = require('mongodb').Db;
const MongoServer = require('mongodb').Server;
const MongoClient = require('mongodb').MongoClient;
const Promise = require('bluebird');
const util = require('util');
const uuid = require('node-uuid');
const _ = require('underscore');

const logger = require('lib/modules/logger');
const Database = require('lib/entities/database');
const errors = require('lib/errors');
const mongoUtils = require('src/lib/utils/mongoUtils');

/** @class */
class Connection {
  /**
   * @param {Object} options
   * @param {String} options.name
   * @param {String} [options.host]
   * @param {String} [options.port]
   * @param {Object} [options.replicaSet]
   * @param {String} [options.replicaSet.name]
   * @param {Array<Object>} [options.replicaSet.servers]
   */
  constructor(options) {
    options = options || {};

    var _this = this;
    _this.id = options.id;
    _this.name = options.name;
    _this.host = options.host;
    _this.port = options.port;
    _this.replicaSet = options.replicaSet;
    _this.databases = [];

    if (options.databaseName && !mongoUtils.isLocalHost(options.host)) {
      let newDb = {
        id: uuid.v4(),
        name: options.databaseName,
        host: options.host,
        port: options.port,
        auth: options.auth
      };

      if (options.auth && (options.auth.username || options.auth.password)) {
        newDb.auth = {};
        newDb.auth.username = options.auth.username;
        newDb.auth.password = options.auth.password;
      }

      _this.addDatabase(newDb);
    }
  }

  get connectionString() {
    if (!this._connectionString) {
      this._connectionString = _getConnectionString(this);
    }
    return this._connectionString;
  }

  /**
   * Connect to the connection
   */
  connect() {
    return new Promise((resolve, reject) => {
      logger.info(`Connecting to ${this.name} server @ ${this.connectionString}...`);

      let client = new MongoClient();

      if (!this.connectionString) {
        return reject(new Error('connection does have a connection string'));
      }

      client.connect(this.connectionString, (err, database) => {
        if (err) return reject(new errors.ConnectionError(err.message));

        logger.info(`Connected to ${this.name} server @ ${this.connectionString}`);

        if (mongoUtils.isLocalHost(this.host)) {
          _getDbsForLocalhostConnection(this, () => {
            return resolve(null);
          });
        } else {
          return resolve(database);
        }
      });
    });
  }

  /**
   * Add a new database to the connection
   * @param {Object} options
   * @param {String} options.name
   */
  addDatabase(options) {
    options = options || {};

    let existingDatabase = _.findWhere(this.databases, {
      name: options.name
    });

    if (existingDatabase) return;

    let database = new Database({
      id: options.id,
      name: options.name,
      host: options.host,
      port: options.port,
      auth: options.auth,
      connection: this
    });

    this.databases.push(database);

    return database;
  }

  /**
   * Create a new database
   * @param {Object} options
   * @param {String} options.name
   * @return Promise
   */
  createDatabase(options) {
    options = options || {};

    return new Promise((resolve, reject) => {
      if (!options) return reject(new Error('options is required'));
      if (!options.name) return reject(new Error('options.name is required'));

      let client = new MongoClient();

      client.connect(this.connectionString, (err, database) => {
        if (err) return reject(err);

        database.db(options.name);

        let newDatabase = this.addDatabase({
          name: options.name,
          host: this.host,
          port: this.port,
          auth: this.auth
        });

        return resolve(newDatabase);
      });
    });
  }
}

/**
 * @function _getDbsForLocalhostConnection
 * @param {Function} next - callback function
 * @private
 */
function _getDbsForLocalhostConnection(connection, next) {
  if (!connection) return next(new Error('connection is required'));
  if (!next) return next(new Error('next is required'));
  if (!mongoUtils.isLocalHost(connection.host)) return next(new Error('cannot get local dbs for non localhost connection'));

  var localDb = new MongoDb('local', new MongoServer(connection.host, connection.port));

  localDb.open(function(err, db) {
    if (err) return next(new errors.ConnectionError(util.format('An error occured when trying to connect to %s', connection.host)));

    // Use the admin database for the operation
    var adminDb = db.admin();

    // List all the available databases
    adminDb.listDatabases((err, result) => {
      if (err) return next(new errors.DatabaseError(err));

      db.close();

      _.each(result.databases, (db) => {
        connection.addDatabase({
          name: db.name,
          host: connection.host,
          port: connection.port
        });
      });

      return next(null);
    });
  });
}

/**
 * @function _getConnectionString
 * @param {Connection} connection
 * @private
 */
function _getConnectionString(connection) {
  if (!connection) return null;

  let db = (connection.databases && connection.databases.length) ? connection.databases[0] : null;
  let auth = '';

  if (db && db.auth && db.auth.username && db.auth.password) {
    auth += (`${db.auth.username}:${db.auth.password}@`);
  }

  let connectionString = 'mongodb://';
  let hasReplSet = false;

  if (connection && connection.replicaSet && connection.replicaSet.name && (connection.replicaSet.servers && connection.replicaSet.servers.length)) {
    hasReplSet = true;

    connectionString += auth;

    for (let i = 0; i < connection.replicaSet.servers.length; i++) {
      let set = connection.replicaSet.servers[i];

      connectionString += `${set.host}:${set.port}`;

      if (i < (connection.replicaSet.servers.length - 1)) {
        connectionString += ',';
      }
    }
  } else {
    connectionString += auth + `${connection.host}:${connection.port}`;
  }

  if (db) connectionString += `/${db.name}`;

  if (hasReplSet) connectionString += `?replicaSet=${connection.replicaSet.name}`;

  return connectionString;
}

module.exports = Connection;
