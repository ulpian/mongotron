'use strict';

require('tests/unit/before-all');

const should = require('should');

let expression;

before(() => {
  expression = require('lib/modules/expression');
});

describe('modules', () => {
  describe('expression', () => {
    describe('getMongoMethodName', () => {
      describe('when an expression is not passed', () => {
        let expr = null;

        it('should return null', () => {
          let value = expression.getMongoMethodName(expr);
          should(value).equal(null);
        });
      });

      describe('when an expression is passed by doesn\'t begin with db Identifier', () => {
        let expr = 'foooobar';

        it('should return null', () => {
          let value = expression.getMongoMethodName(expr);
          should(value).equal(null);
        });
      });

      describe('when an expression is passed begins with db Identifier but has no collection name', () => {
        let expr = 'db.';

        it('should return null', () => {
          let value = expression.getMongoMethodName(expr);
          should(value).equal(null);
        });
      });

      describe('when an expression is passed begins with db Identifier and a collection name but no method Identifier', () => {
        let expr = 'db.Cars';

        it('should return null', () => {
          let value = expression.getMongoMethodName(expr);
          should(value).equal(null);
        });
      });

      describe('when an expression is passed begins with db Identifier,a collection name and a method Identifier in dot notation', () => {
        let expr = 'db.Cars.find';

        it('should return null', () => {
          let value = expression.getMongoMethodName(expr);
          should(value).equal('find');
        });
      });

      describe('when an expression is passed begins with db Identifier,a collection name and a method Identifier in bracket notation', () => {
        let expr = `db.Cars['find']`;

        it('should return null', () => {
          let value = expression.getMongoMethodName(expr);
          should(value).equal('find');
        });
      });
    });
  });
});
