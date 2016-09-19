var _ = require('underscore');
var Backbone = require('backbone');
var VisModel = require('../../../src/vis/vis.js');
var DataviewModelBase = require('../../../src/dataviews/dataview-model-base');
var AnalysisFactory = require('../../../src/analysis/analysis-factory.js');

var fakeCamshaftReference = {
  getSourceNamesForAnalysisType: function (analysisType) {
    var map = {
      'source': [],
      'trade-area': ['source'],
      'estimated-population': ['source'],
      'point-in-polygon': ['points_source', 'polygons_source'],
      'union': ['source']
    };
    if (!map[analysisType]) {
      throw new Error('analysis type ' + analysisType + ' not supported');
    }
    return map[analysisType];
  },

  getParamNamesForAnalysisType: function (analysisType) {
    var map = {
      'source': ['query'],
      'trade-area': ['kind', 'time'],
      'estimated-population': ['columnName'],
      'point-in-polygon': [],
      'union': ['join_on']
    };
    if (!map[analysisType]) {
      throw new Error('analysis type ' + analysisType + ' not supported');
    }
    return map[analysisType];
  }
};

describe('dataviews/dataview-model-base', function () {
  beforeEach(function () {
    this.map = new Backbone.Model();
    this.map.getViewBounds = function () {};
    this.vis = new VisModel();
    spyOn(this.vis, 'reload');
    spyOn(this.map, 'getViewBounds').and.returnValue([[1, 2], [3, 4]]);

    this.analysisCollection = new Backbone.Collection();
    this.a0 = this.analysisCollection.add({id: 'a0'});
    this.layer = new Backbone.Model();
    this.layer.getDataProvider = jasmine.createSpy('getDataProvider');

    this.model = new DataviewModelBase({
      source: {id: 'a0'}
    }, {
      layer: this.layer,
      map: this.map,
      vis: this.vis,
      analysisCollection: this.analysisCollection
    });
    this.model.toJSON = jasmine.createSpy('toJSON').and.returnValue({});

    this.analysisFactory = new AnalysisFactory({
      analysisCollection: this.analysisCollection,
      camshaftReference: fakeCamshaftReference,
      vis: this.vis
    });

    // Disable debounce
    spyOn(_, 'debounce').and.callFake(function (func) { return function () { func.apply(this, arguments); }; });
  });

  describe('url', function () {
    it('should include the bbox param', function () {
      this.map.getViewBounds.and.returnValue([['south', 'west'], ['north', 'east']]);

      this.model.set('url', 'http://example.com');
      expect(this.model.url()).toEqual('http://example.com?bbox=west,south,east,north');
    });

    it('should allow subclasses to define specific URL params', function () {
      this.map.getViewBounds.and.returnValue([['south', 'west'], ['north', 'east']]);

      this.model.set('url', 'http://example.com');

      spyOn(this.model, '_getDataviewSpecificURLParams').and.returnValue([ 'a=b', 'c=d' ]);

      expect(this.model.url()).toEqual('http://example.com?bbox=west,south,east,north&a=b&c=d');
    });

    it('should append an api_key param if apiKey attr is present (and not use the auth_token)', function () {
      this.map.getViewBounds.and.returnValue([['south', 'west'], ['north', 'east']]);

      this.model.set({
        url: 'http://example.com',
        apiKey: 'THE_API_KEY',
        authToken: 'THE_AUTH_TOKEN'
      });

      spyOn(this.model, '_getDataviewSpecificURLParams').and.returnValue([ 'a=b', 'c=d' ]);

      expect(this.model.url()).toEqual('http://example.com?bbox=west,south,east,north&a=b&c=d&api_key=THE_API_KEY');
    });

    it('should append an auth_token param if authToken is present', function () {
      this.map.getViewBounds.and.returnValue([['south', 'west'], ['north', 'east']]);

      this.model.set({
        url: 'http://example.com',
        authToken: 'THE_AUTH_TOKEN'
      });

      spyOn(this.model, '_getDataviewSpecificURLParams').and.returnValue([ 'a=b', 'c=d' ]);

      expect(this.model.url()).toEqual('http://example.com?bbox=west,south,east,north&a=b&c=d&auth_token=THE_AUTH_TOKEN');
    });
  });

  describe('when url changes', function () {
    beforeEach(function () {
      spyOn(this.model, 'fetch');
      spyOn(this.model, 'listenTo');
      spyOn(this.model, 'on');
      this.model.set('url', 'new-url');
    });

    it('should fetch', function () {
      expect(this.model.fetch).toHaveBeenCalled();
    });

    describe('when fetch succeeds', function () {
      beforeEach(function () {
        this.model.fetch.calls.argsFor(0)[0].success();
      });

      it('should change bounds', function () {
        expect(this.model.listenTo.calls.argsFor(0)[0]).toEqual(this.model._map);
        expect(this.model.listenTo.calls.argsFor(0)[1]).toEqual('change:center change:zoom');
        expect(this.model.on.calls.argsFor(0)[0]).toEqual('change:url');
        expect(this.model.on.calls.argsFor(1)[0]).toEqual('change:enabled');
      });
    });
  });

  describe('after first load', function () {
    beforeEach(function () {
      this.model.fetch = function (opts) {
        opts.success();
      };
      this.model.set('url', 'newurl');
    });

    it('should not fetch new data when url changes and sync_on_data_change is disabled', function () {
      this.model.set('sync_on_data_change', false);
      spyOn(this.model, 'fetch');
      this.model.trigger('change:url', this.model);
      expect(this.model.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch new data when url changes and dataview is disabled', function () {
      this.model.set('enabled', false);
      spyOn(this.model, 'fetch');
      this.model.trigger('change:url', this.model);
      expect(this.model.fetch).not.toHaveBeenCalled();
    });

    it('should fetch if url changes and forceFetch option is true, no matter rest of variables', function () {
      this.model.set('enabled', false);
      this.model.set('sync_on_data_change', false);
      spyOn(this.model, 'fetch');
      this.model.trigger('change:url', this.model, {}, { forceFetch: true });
      expect(this.model.fetch).toHaveBeenCalled();
      this.model.fetch.calls.reset();
      this.model.trigger('change:url', this.model, {}, { forceFetch: false });
      expect(this.model.fetch).not.toHaveBeenCalled();
    });

    it('should fetch if url changes and sourceId is not defined', function () {
      spyOn(this.model, 'fetch');

      this.model.set('url', 'http://somethingelese.com');

      expect(this.model.fetch).toHaveBeenCalled();
    });

    describe('when change:url has a sourceId option', function () {
      beforeEach(function () {
        this.analysisCollection.reset([]);
        this.analysisFactory.analyse({
          id: 'a2',
          type: 'estimated-population',
          params: {
            columnName: 'estimated_people',
            source: {
              id: 'a1',
              type: 'trade-area',
              params: {
                kind: 'walk',
                time: 300,
                source: {
                  id: 'a0',
                  type: 'source',
                  params: {
                    query: 'select * from subway_stops'
                  }
                }
              }
            }
          }
        });

        this.model.set('source', {
          id: 'a1'
        }, { silent: true });

        spyOn(this.model, 'fetch');
      });

      it("should fetch if sourceId matches the dataview's source", function () {
        this.model.set('url', 'http://somethingelese.com', {
          sourceId: 'a1'
        });

        expect(this.model.fetch).toHaveBeenCalled();
      });

      it("should fetch if sourceId is a node that affects the dataview's source", function () {
        this.model.set('url', 'http://somethingelese.com', {
          sourceId: 'a0'
        });

        expect(this.model.fetch).toHaveBeenCalled();
      });

      it("should NOT fetch if sourceId is a node that doesn't affect the dataview's source", function () {
        this.model.set('url', 'http://somethingelese.com', {
          sourceId: 'a2'
        });

        expect(this.model.fetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('when enabled is changed to true from false', function () {
    beforeEach(function () {
      this.model.fetch = function (opts) {
        opts.success();
      };
      this.model.set('url', 'http://example.com');

      this.model.set('enabled', false);

      spyOn(this.model, 'fetch');
    });

    it('should NOT fetch if nothing has changed', function () {
      this.model.set('enabled', true);

      expect(this.model.fetch).not.toHaveBeenCalled();
    });

    it('should fetch if the bounding box have changed while the dataview was disabled', function () {
      // Map bounds have changed
      this.map.getViewBounds.and.returnValue([102, 200], [300, 400]);
      this.map.trigger('change:center');

      this.model.set('enabled', true);

      expect(this.model.fetch).toHaveBeenCalled();

      this.model.fetch.calls.reset();

      // Disable and enable again
      this.model.set('enabled', false);
      this.model.set('enabled', true);

      expect(this.model.fetch).not.toHaveBeenCalled();
    });

    it('should NOT fetch if the bounding box have changed while the dataview was disabled and sync_on_bbox_change is disabled', function () {
      this.model.set('sync_on_bbox_change', false);

      // Map bounds have changed
      this.map.getViewBounds.and.returnValue([102, 200], [300, 400]);
      this.map.trigger('change:center');

      this.model.set('enabled', true);

      expect(this.model.fetch).not.toHaveBeenCalled();
    });

    it('should fetch if URL has changed while the dataview was disabled', function () {
      this.model.set('url', 'http://somethingelse.com');

      this.model.set('enabled', true);

      expect(this.model.fetch).toHaveBeenCalled();

      this.model.fetch.calls.reset();

      // Disable and enable again
      this.model.set('enabled', false);
      this.model.set('enabled', true);

      expect(this.model.fetch).not.toHaveBeenCalled();
    });

    it('should NOT fetch if a new instance of the windshaft map has been created while the dataview was disabled and sync_on_data_change is false', function () {
      this.model.set('sync_on_data_change', false);

      this.model.set('url', 'http://somethingelse.com');

      this.model.set('enabled', true);

      expect(this.model.fetch).not.toHaveBeenCalled();
    });
  });

  describe('bindings to map bounds', function () {
    beforeEach(function () {
      this.model.fetch = function (opts) {
        opts.success();
      };
      this.model.set('url', 'http://example.com');

      spyOn(this.model, 'fetch');
    });

    it('should fetch when the bounding box has changed', function () {
      this.map.getViewBounds.and.returnValue([102, 200], [300, 400]);
      this.map.trigger('change:center');

      expect(this.model.fetch).toHaveBeenCalled();
    });

    it('should NOT fetch when the bounding box has changed and the dataview is not enabled', function () {
      this.model.set('enabled', false);

      this.map.getViewBounds.and.returnValue([102, 200], [300, 400]);
      this.map.trigger('change:center');

      expect(this.model.fetch).not.toHaveBeenCalled();
    });

    it('should NOT fetch when the bounding box has changed and the dataview has sync_on_bbox_change disabled', function () {
      this.model.set('sync_on_bbox_change', false);

      this.map.getViewBounds.and.returnValue([102, 200], [300, 400]);
      this.map.trigger('change:center');

      expect(this.model.fetch).not.toHaveBeenCalled();
    });
  });

  describe('bindings to the filter', function () {
    beforeEach(function () {
      this.layer = new Backbone.Model({
        id: 'layerId'
      });
      this.layer.getDataProvider = jasmine.createSpy('getDataProvider').and.returnValue(undefined);
    });

    it('should reload the map by default when the filter changes', function () {
      var filter = new Backbone.Model();
      new DataviewModelBase({ // eslint-disable-line
        source: { id: 'a0' }
      }, {
        layer: this.layer,
        map: this.map,
        vis: this.vis,
        filter: filter,
        analysisCollection: this.analysisCollection
      });

      // Filter changes
      filter.trigger('change', filter);

      expect(this.vis.reload).toHaveBeenCalledWith({ sourceId: 'a0' });
    });
  });

  describe('.remove', function () {
    beforeEach(function () {
      this.removeSpy = jasmine.createSpy('remove');
      this.model.once('destroy', this.removeSpy);
      spyOn(this.model, 'stopListening');
      spyOn(this.model, '_reloadVis');
      spyOn(this.model.layer, 'off').and.callThrough();
      spyOn(this.a0, 'off').and.callThrough();

      this.model.filter = jasmine.createSpyObj('filter', ['remove', 'isEmpty']);
      this.model.filter.isEmpty.and.returnValue(false);

      this.model.remove();
    });

    it('should trigger a destroy event', function () {
      expect(this.removeSpy).toHaveBeenCalledWith(this.model);
    });

    it('should remove filter', function () {
      expect(this.model.filter.remove).toHaveBeenCalled();
    });

    it('should reload the map if there is a filter and it is not empty', function () {
      expect(this.model._reloadVis).toHaveBeenCalled();
    });

    it('should stop listening to events', function () {
      expect(this.model.stopListening).toHaveBeenCalled();
      expect(this.a0.off).toHaveBeenCalledWith('change:status', jasmine.any(Function), this.model);
    });
  });

  describe('.update', function () {
    it('should only update the attrs set on ATTRS_NAMES', function () {
      this.model.update({ foo: 'bar' });
      expect(this.model.changedAttributes()).toBe(false);

      expect(this.model.get('sync_on_bbox_change')).toBe(true);
      this.model.update({
        sync_on_bbox_change: false,
        foo: 'bar'
      });
      expect(this.model.changedAttributes()).toEqual({
        sync_on_bbox_change: false
      });
    });
  });

  describe('.fetch', function () {
    it('should trigger a loading event', function () {
      spyOn(this.model, 'trigger');

      this.model.fetch();

      expect(this.model.trigger).toHaveBeenCalledWith('loading', this.model);
    });
  });

  describe('when the layer has a data provider', function () {
    beforeEach(function () {
      this.geoJSONDataProvider = jasmine.createSpyObj('dataProvider', ['getDataFor', 'canProvideDataFor', 'applyFilter', 'canApplyFilterTo']);
      _.extend(this.geoJSONDataProvider, Backbone.Events);

      this.layer = new Backbone.Model({
        id: 'layerId'
      });
      this.layer.getDataProvider = jasmine.createSpy('getDataProvider').and.returnValue(this.geoJSONDataProvider);
    });

    it('should get data from a data provider if data provider can provide data for the dataview', function () {
      var dataview = new DataviewModelBase({ // eslint-disable-line
        column: 'columnName',
        source: { id: 'a0' }
      }, {
        layer: this.layer,
        map: this.map,
        vis: this.vis,
        analysisCollection: this.analysisCollection
      });

      this.geoJSONDataProvider.canProvideDataFor.and.returnValue(true);

      dataview.fetch();

      expect(this.geoJSONDataProvider.getDataFor).toHaveBeenCalledWith(dataview);
    });

    it("should NOT get data from a data provider if data provider CAN'T provide data for the dataview", function () {
      var dataview = new DataviewModelBase({ // eslint-disable-line
        column: 'columnName',
        source: { id: 'a0' }
      }, {
        layer: this.layer,
        map: this.map,
        vis: this.vis,
        analysisCollection: this.analysisCollection
      });

      this.geoJSONDataProvider.canProvideDataFor.and.returnValue(false);

      dataview.fetch();

      expect(this.geoJSONDataProvider.getDataFor).not.toHaveBeenCalledWith(dataview);
    });

    it('should be bound to changes on the map bounds', function () {
      var dataview = new DataviewModelBase({
        source: { id: 'a0' }
      }, {
        layer: this.layer,
        map: this.map,
        vis: this.vis,
        analysisCollection: this.analysisCollection
      });

      // Bindings are done
      this.geoJSONDataProvider.trigger('dataChanged');

      spyOn(dataview, 'fetch');

      // Map bounds change
      this.map.getViewBounds.and.returnValue([100, 200], [300, 400]);
      this.map.trigger('change:center');

      expect(dataview.fetch).toHaveBeenCalled();
    });

    it('should apply the filter to the data provider when the filter changes and data provider can apply filters to the dataview', function () {
      var filter = new Backbone.Model();
      var dataview = new DataviewModelBase({ // eslint-disable-line
        column: 'columnName',
        source: { id: 'a0' }
      }, {
        layer: this.layer,
        map: this.map,
        vis: this.vis,
        filter: filter,
        analysisCollection: this.analysisCollection
      });

      this.geoJSONDataProvider.canApplyFilterTo.and.returnValue(true);

      // Filter changes
      filter.trigger('change', filter);

      expect(this.vis.reload).not.toHaveBeenCalled();
      expect(this.geoJSONDataProvider.applyFilter).toHaveBeenCalledWith(dataview, filter);
    });

    it("should NOT apply the filter to the data provider when the filter changes and data provider CAN'T apply filters to the dataview", function () {
      var filter = new Backbone.Model();
      var dataview = new DataviewModelBase({ // eslint-disable-line
        column: 'columnName',
        source: { id: 'a0' }
      }, {
        layer: this.layer,
        map: this.map,
        vis: this.vis,
        filter: filter,
        analysisCollection: this.analysisCollection
      });

      this.geoJSONDataProvider.canApplyFilterTo.and.returnValue(false);

      // Filter changes
      filter.trigger('change', filter);

      expect(this.vis.reload).toHaveBeenCalled();
      expect(this.geoJSONDataProvider.applyFilter).not.toHaveBeenCalled();
    });
  });

  describe('getSourceId', function () {
    it('should return the id of the source', function () {
      var layer = new Backbone.Model({
        id: 'layerId',
        source: 'a1'
      });
      layer.getDataProvider = jasmine.createSpy('getDataProvider').and.returnValue(undefined);

      var dataview = new DataviewModelBase({
        source: {
          id: 'THE_SOURCE_ID'
        }
      }, { // eslint-disable-line
        layer: layer,
        map: this.map,
        vis: this.vis,
        analysisCollection: this.analysisCollection
      });

      expect(dataview.getSourceId()).toEqual('THE_SOURCE_ID');
    });

    it("should return the id of the layer's source", function () {
      var layer = new Backbone.Model({
        id: 'layerId',
        source: 'a1'
      });
      layer.getDataProvider = jasmine.createSpy('getDataProvider').and.returnValue(undefined);

      var dataview = new DataviewModelBase({
        source: {
          id: layer.id
        }
      }, { // eslint-disable-line
        layer: layer,
        map: this.map,
        vis: this.vis,
        analysisCollection: this.analysisCollection
      });

      expect(dataview.getSourceId()).toEqual('a1');
    });
  });

  describe('.hasSameSourceAsLayer', function () {
    it("should return true if dataview has the same source as it's layer", function () {
      var layer = new Backbone.Model({
        id: 'layerId',
        source: 'SOURCE_ID'
      });
      layer.getDataProvider = jasmine.createSpy('getDataProvider').and.returnValue(undefined);

      var dataview = new DataviewModelBase({
        source: {
          id: 'SOURCE_ID'
        }
      }, { // eslint-disable-line
        layer: layer,
        map: this.map,
        vis: this.vis,
        analysisCollection: this.analysisCollection
      });

      expect(dataview.hasSameSourceAsLayer()).toBe(true);
    });

    it("should return false if dataview doen't have the same source as it's layer", function () {
      var layer = new Backbone.Model({
        id: 'layerId',
        source: 'SOURCE_ID'
      });
      layer.getDataProvider = jasmine.createSpy('getDataProvider').and.returnValue(undefined);

      var dataview = new DataviewModelBase({
        source: {
          id: 'DIFFERENT_SOURCE_ID'
        }
      }, { // eslint-disable-line
        layer: layer,
        map: this.map,
        vis: this.vis,
        analysisCollection: this.analysisCollection
      });

      expect(dataview.hasSameSourceAsLayer()).toBe(false);
    });
  });

  describe('when analysis changes status', function () {
    beforeEach(function () {
      this.a0.isLoading = jasmine.createSpy('a0.isLoading');
      this.a0.isFailed = jasmine.createSpy('a0.isFailed');
      this.model.on({
        loading: this.loadingSpy = jasmine.createSpy('loading'),
        error: this.errorSpy = jasmine.createSpy('failed')
      });
    });

    sharedTestsForAnalysisEvents();

    describe('when changed source', function () {
      beforeEach(function () {
        this.model.set('source', {id: 'a0'});
      });

      sharedTestsForAnalysisEvents();
    });
  });
});

function sharedTestsForAnalysisEvents () {
  describe('should trigger the event according to state', function () {
    it('should trigger loading event', function () {
      this.loadingSpy.calls.reset();
      this.errorSpy.calls.reset();
      this.a0.isLoading.and.returnValue(true);

      this.a0.set('status', 'whatever');
      expect(this.loadingSpy).toHaveBeenCalled();
      expect(this.errorSpy).not.toHaveBeenCalled();

      this.loadingSpy.calls.reset();
      this.errorSpy.calls.reset();
      this.a0.isLoading.and.returnValue(false);
      this.a0.isFailed.and.returnValue(true);

      this.a0.set({
        status: 'failed',
        error: this.err = {}
      });
      expect(this.loadingSpy).not.toHaveBeenCalled();
      expect(this.errorSpy).toHaveBeenCalledWith(this.model, this.err);
    });
  });
}
