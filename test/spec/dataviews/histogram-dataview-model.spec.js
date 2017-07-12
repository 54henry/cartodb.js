var Backbone = require('backbone');
var Model = require('../../../src/core/model');
var VisModel = require('../../../src/vis/vis');
var RangeFilter = require('../../../src/windshaft/filters/range');
var HistogramDataviewModel = require('../../../src/dataviews/histogram-dataview-model');

describe('dataviews/histogram-dataview-model', function () {
  beforeEach(function () {
    this.map = jasmine.createSpyObj('map', ['getViewBounds', 'bind']);
    this.map.getViewBounds.and.returnValue([[1, 2], [3, 4]]);
    this.vis = new VisModel();
    spyOn(this.vis, 'reload');

    this.filter = new RangeFilter();

    this.layer = new Model();
    this.layer.getDataProvider = jasmine.createSpy('layer.getDataProvider');

    this.analysisCollection = new Backbone.Collection();

    spyOn(HistogramDataviewModel.prototype, 'listenTo').and.callThrough();
    spyOn(HistogramDataviewModel.prototype, 'fetch').and.callThrough();
    spyOn(HistogramDataviewModel.prototype, '_updateBindings');
    spyOn(HistogramDataviewModel.prototype, '_resetFilterAndFetch');

    this.model = new HistogramDataviewModel({
      source: { id: 'a0' }
    }, {
      map: this.map,
      vis: this.vis,
      layer: this.layer,
      filter: this.filter,
      analysisCollection: new Backbone.Collection()
    });
  });

  it('defaults', function () {
    expect(this.model.get('type')).toBe('histogram');
    expect(this.model.get('totalAmount')).toBe(0);
    expect(this.model.get('filteredAmount')).toBe(0);
  });

  it('should not listen any url change from the beginning', function () {
    this.model.set('url', 'https://carto.com');
    expect(this.model.fetch).not.toHaveBeenCalled();
  });

  it('should set unfiltered model url when model has changed it', function () {
    spyOn(this.model._originalData, 'setUrl');
    this.model.set('url', 'hey!');
    expect(this.model._originalData.setUrl).toHaveBeenCalled();
  });

  it('should set the api_key attribute on the internal models', function () {
    this.model = new HistogramDataviewModel({
      apiKey: 'API_KEY',
      source: { id: 'a0' }
    }, {
      map: this.map,
      vis: this.vis,
      layer: jasmine.createSpyObj('layer', ['get', 'getDataProvider']),
      filter: this.filter,
      analysisCollection: new Backbone.Collection()
    });

    expect(this.model._originalData.get('apiKey')).toEqual('API_KEY');
  });

  describe('should get the correct histogram shape', function () {
    beforeEach(function () {
      this.model.set('bins', 6);
    });

    it('when it is flat', function () {
      this.model.set('data', [
        { bin: 0, freq: 25 },
        { bin: 1, freq: 26 },
        { bin: 2, freq: 25 },
        { bin: 3, freq: 26 },
        { bin: 4, freq: 26 },
        { bin: 5, freq: 25 }
      ]);
      expect(this.model.getDistributionType()).toEqual('F');
    });

    it('when it is A', function () {
      this.model.set('data', [
        { bin: 0, freq: 0 },
        { bin: 1, freq: 5 },
        { bin: 2, freq: 25 },
        { bin: 3, freq: 18 },
        { bin: 4, freq: 8 },
        { bin: 5, freq: 2 }
      ]);
      expect(this.model.getDistributionType()).toEqual('A');
    });

    it('when it is J', function () {
      this.model.set('data', [
        { bin: 0, freq: 0 },
        { bin: 1, freq: 2 },
        { bin: 2, freq: 5 },
        { bin: 3, freq: 8 },
        { bin: 4, freq: 18 },
        { bin: 5, freq: 25 }
      ]);
      expect(this.model.getDistributionType()).toEqual('J');
    });

    it('when it is L', function () {
      this.model.set('data', [
        { bin: 0, freq: 25 },
        { bin: 1, freq: 18 },
        { bin: 4, freq: 8 },
        { bin: 2, freq: 5 },
        { bin: 5, freq: 2 },
        { bin: 3, freq: 0 }
      ]);
      expect(this.model.getDistributionType()).toEqual('L');
    });

    xit('when it is clustered', function () {
      this.model.set('data', [
       { bin: 0, freq: 20 },
       { bin: 1, freq: 18 },
       { bin: 2, freq: 5 },
       { bin: 3, freq: 0 },
       { bin: 4, freq: 32 },
       { bin: 5, freq: 16 }
      ]);
      expect(this.model.getDistributionType()).toEqual('C');
    });
  });

  describe('when _originalData changes:data', function () {
    beforeEach(function () {
      var histogramData = {
        bin_width: 10,
        bins_count: 3,
        bins_start: 1,
        nulls: 0,
        aggregation: 'quarter'
      };

      spyOn(this.model._originalData, 'sync').and.callFake(function (method, model, options) {
        options.success(histogramData);
      });
    });

    it('should set start, end, bins and aggregation', function () {
      expect(this.model.get('start')).toBeUndefined();
      expect(this.model.get('end')).toBeUndefined();

      this.model._originalData.fetch();

      expect(this.model.get('start')).toEqual(1);
      expect(this.model.get('end')).toEqual(31);
      expect(this.model.get('bins')).toEqual(3);
      expect(this.model.get('aggregation')).toEqual('quarter');
    });

    it('should call _updateBindings only once', function () {
      this.model._originalData.fetch();
      expect(this.model._updateBindings).toHaveBeenCalled();

      this.model._updateBindings.calls.reset();

      this.model._originalData.fetch();
      expect(this.model._updateBindings).not.toHaveBeenCalled();
    });
  });

  describe('when column changes', function () {
    it('should set column_type to original data, set undefined aggregation and reload map and force fetch', function () {
      this.vis.reload.calls.reset();

      this.model.set({
        aggregation: 'quarter',
        column: 'random_col',
        column_type: 'aColumnType'
      });

      expect(this.model._originalData.get('column_type')).toEqual('aColumnType');
      expect(this.model.get('aggregation')).toBeUndefined();
      expect(this.vis.reload).toHaveBeenCalledWith({ forceFetch: true, sourceId: 'a0' });
    });
  });

  describe('.parse', function () {
    it('should parse the bins', function () {
      var data = {
        bin_width: 14490.25,
        bins: [
          { bin: 0, freq: 2, max: 70151, min: 55611 },
          { bin: 1, freq: 2, max: 79017, min: 78448 },
          { bin: 3, freq: 1, max: 113572, min: 113572 }
        ],
        bins_count: 4,
        bins_start: 55611,
        nulls: 0,
        type: 'histogram'
      };

      this.model.parse(data);

      var parsedData = this.model.getData();

      expect(data.nulls).toBe(0);
      expect(parsedData.length).toBe(4);
      expect(JSON.stringify(parsedData)).toBe('[{"bin":0,"start":55611,"end":70101.25,"freq":2,"max":70151,"min":55611},{"bin":1,"start":70101.25,"end":84591.5,"freq":2,"max":79017,"min":78448},{"bin":2,"start":84591.5,"end":99081.75,"freq":0},{"bin":3,"start":99081.75,"end":113572,"freq":1,"max":113572,"min":113572}]');
    });

    it('should calculate total amount and filtered amount in parse when a filter is present', function () {
      var data = {
        bin_width: 1,
        bins: [
          { bin: 0, freq: 2 },
          { bin: 1, freq: 3 },
          { bin: 2, freq: 7 }
        ],
        bins_count: 3,
        bins_start: 1,
        nulls: 0,
        type: 'histogram'
      };
      this.model.filter = new RangeFilter({ min: 1, max: 3 });

      var parsedData = this.model.parse(data);

      expect(parsedData.totalAmount).toBe(12);
      expect(parsedData.filteredAmount).toBe(5);
    });

    it('should calculate only total amount in parse when there is no filter', function () {
      var data = {
        bin_width: 1,
        bins: [
          { bin: 0, freq: 2 },
          { bin: 1, freq: 3 },
          { bin: 2, freq: 7 }
        ],
        bins_count: 3,
        bins_start: 1,
        nulls: 0,
        type: 'histogram'
      };

      var parsedData = this.model.parse(data);

      expect(parsedData.totalAmount).toBe(12);
      expect(parsedData.filteredAmount).toBe(0);
    });

    it('parser do not fails when there are no bins', function () {
      var data = {
        bin_width: 0,
        bins: [],
        bins_count: 0,
        bins_start: 0,
        nulls: 0,
        type: 'histogram'
      };

      this.model.parse(data);

      var parsedData = this.model.getData();

      expect(data.nulls).toBe(0);
      expect(parsedData.length).toBe(0);
    });

    it('should parse the bins and fix end bucket issues', function () {
      var data = {
        bin_width: 1041.66645833333,
        bins_count: 48,
        bins_start: 0.01,
        nulls: 0,
        avg: 55.5007561961441,
        bins: [{
          bin: 47,
          min: 50000,
          max: 50000,
          avg: 50000,
          freq: 6
          // NOTE - The end of this bucket is 48 * 1041.66645833333 = 49999.98999999984
          // but it must be corrected to 50.000.
        }],
        type: 'histogram'
      };

      this.model.parse(data);

      var parsedData = this.model.getData();

      expect(data.nulls).toBe(0);
      expect(parsedData.length).toBe(48);
      expect(parsedData[47].end).not.toBeLessThan(parsedData[47].max);
    });

    it('should call .fillNumericBuckets if aggregation is not present', function () {
      spyOn(this.model._originalData, 'fillNumericBuckets');
      this.model._initBinds();
      this.model.set('column_type', 'number');
      var data = {
        bin_width: 0,
        bins: [],
        bins_count: 0,
        bins_start: 0,
        nulls: 0,
        type: 'histogram'
      };

      this.model.parse(data);

      expect(this.model._originalData.fillNumericBuckets).toHaveBeenCalled();
    });

    it('should call .fillTimestampBuckets if aggregation is present', function () {
      spyOn(this.model._originalData, 'fillTimestampBuckets');
      this.model._initBinds();
      this.model.set({
        aggregation: 'month',
        column_type: 'date'
      }, { silent: true });
      var data = {
        bin_width: 0,
        bins: [],
        bins_count: 0,
        bins_start: 0,
        nulls: 0,
        type: 'histogram'
      };

      this.model.parse(data);

      expect(this.model._originalData.fillTimestampBuckets).toHaveBeenCalled();
    });
  });

  describe('when layer changes meta', function () {
    beforeEach(function () {
      expect(this.model.filter.get('column_type')).not.toEqual('date');
      this.model.layer.set({
        meta: {
          column_type: 'date'
        }
      });
    });

    it('should change the filter column_type', function () {
      expect(this.model.filter.get('column_type')).toEqual('date');
    });
  });

  describe('.url', function () {
    beforeEach(function () {
      this.model.set('url', 'http://example.com');
    });

    it('should include bbox', function () {
      expect(this.model.url()).toEqual('http://example.com?bbox=2,1,4,3');
    });

    it('should include start if present', function () {
      this.model.set('start', 11);
      expect(this.model.url()).toEqual('http://example.com?bbox=2,1,4,3&start=11');
    });

    it('should include end if present', function () {
      this.model.set('end', 22);
      expect(this.model.url()).toEqual('http://example.com?bbox=2,1,4,3&end=22');
    });

    it('should include bins if present and the column type is number', function () {
      this.model.set({
        bins: 33,
        column_type: 'number'
      });
      expect(this.model.url()).toEqual('http://example.com?bbox=2,1,4,3&bins=33');
    });

    it('should only include aggregation if aggregation and bins present and column type is date', function () {
      this.model.set({
        aggregation: 'month',
        bins: 33,
        column_type: 'date'
      });
      expect(this.model.url()).toEqual('http://example.com?bbox=2,1,4,3&aggregation=month');
    });

    it('should not include start, end and bins when own_filter is enabled', function () {
      this.model.set({
        'url': 'http://example.com',
        'start': 0,
        'end': 10,
        'bins': 25,
        column_type: 'number'
      });
      expect(this.model.url()).toEqual('http://example.com?bbox=2,1,4,3&start=0&end=10&bins=25');
      this.model.enableFilter();
      expect(this.model.url()).toEqual('http://example.com?bbox=2,1,4,3&own_filter=1');
    });
  });

  describe('.enableFilter', function () {
    it('should set the own_filter attribute', function () {
      expect(this.model.get('own_filter')).toBeUndefined();

      this.model.enableFilter();

      expect(this.model.get('own_filter')).toEqual(1);
    });
  });

  describe('.disableFilter', function () {
    it('should unset the own_filter attribute', function () {
      this.model.enableFilter();
      this.model.disableFilter();

      expect(this.model.get('own_filter')).toBeUndefined();
    });
  });

  describe('._onDataChanged', function () {
    it('should call _resetFilterAndFetch if column is data and aggregation changes', function () {
      var model = new Backbone.Model({
        aggregation: 'week'
      });
      this.model.set('column_type', 'date', { silent: true });

      this.model._onDataChanged(model);

      expect(this.model._resetFilterAndFetch).toHaveBeenCalled();
    });

    it('should call _resetFilterAndFetch if column is number and bins changes', function () {
      var model = new Backbone.Model({
        bins: 5
      });
      this.model.set('column_type', 'number', { silent: true });

      this.model._onDataChanged(model);

      expect(this.model._resetFilterAndFetch).toHaveBeenCalled();
    });

    it('should call only fetch in the rest of cases', function () {
      var model = new Backbone.Model({
        start: this.model.get('start') + 1,
        end: 22
      });

      this.model._onDataChanged(model);

      expect(this.model.fetch).toHaveBeenCalled();
    });

    it('should set the data fetched', function () {
      var model = new Backbone.Model({
        start: 11,
        end: 22,
        bins: 5
      });

      this.model._onDataChanged(model);

      expect(this.model.get('start')).toEqual(11);
      expect(this.model.get('end')).toEqual(22);
      expect(this.model.get('bins')).toEqual(5);
    });
  });
});
