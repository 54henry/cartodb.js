var _ = require('underscore');
var Backbone = require('backbone');
var DataviewsFactory = require('../../../src/dataviews/dataviews-factory');
var fakeFactory = require('../../helpers/fakeFactory');

var source = fakeFactory.createAnalysisModel({ id: 'a0' });

var generateFakeAttributes = function (attrNames) {
  return _.reduce(attrNames, function (object, attributeName) {
    object[attributeName] = attributeName === 'source'
      ? source
      : 'something';
    return object;
  }, {});
};

describe('dataviews/dataviews-factory', function () {
  beforeEach(function () {
    this.dataviewsCollection = new Backbone.Collection();
    this.factory = new DataviewsFactory(null, {
      map: {},
      engine: {},
      dataviewsCollection: this.dataviewsCollection
    });
  });

  it('should create the factory as expected', function () {
    expect(this.factory).toBeDefined();
    expect(this.factory.createCategoryModel).toEqual(jasmine.any(Function));
    expect(this.factory.createFormulaModel).toEqual(jasmine.any(Function));
    expect(this.factory.createHistogramModel).toEqual(jasmine.any(Function));
  });

  var FACTORY_METHODS_AND_REQUIRED_ATTRIBUTES = [
    ['createCategoryModel', ['source', 'column']],
    ['createFormulaModel', ['source', 'column', 'operation']],
    ['createHistogramModel', ['source', 'column']]
  ];

  _.each(FACTORY_METHODS_AND_REQUIRED_ATTRIBUTES, function (element) {
    var factoryMethod = element[0];
    var requiredAttributes = element[1];

    it(factoryMethod + ' should throw an error if required attributes are not set', function () {
      expect(function () {
        this.factory[factoryMethod]({});
      }.bind(this)).toThrowError(requiredAttributes[0] + ' is required');
    });

    it(factoryMethod + ' should set the apiKey attribute on the dataview if present', function () {
      this.factory = new DataviewsFactory({
        apiKey: 'THE_API_KEY'
      }, {
        map: {},
        engine: {},
        dataviewsCollection: this.dataviewsCollection
      });

      var attributes = generateFakeAttributes(requiredAttributes);
      var model = this.factory[factoryMethod](attributes);

      expect(model.get('apiKey')).toEqual('THE_API_KEY');
    });

    it(factoryMethod + ' should set the authToken', function () {
      this.factory.set({
        authToken: 'AUTH_TOKEN'
      });

      var attributes = generateFakeAttributes(requiredAttributes);
      var model = this.factory[factoryMethod](attributes);

      expect(model.get('authToken')).toEqual('AUTH_TOKEN');
    });

    it(factoryMethod + ' should set the apiKey', function () {
      this.factory.set({
        apiKey: 'API_KEY'
      });

      var attributes = generateFakeAttributes(requiredAttributes);
      var model = this.factory[factoryMethod](attributes);

      expect(model.get('apiKey')).toEqual('API_KEY');
    });
  }, this);
});
