var _ = require('underscore');
var Backbone = require('backbone');
var DataviewModelBase = require('./dataview-model-base');

module.exports = DataviewModelBase.extend({
  url: function () {
    var params = [];

    if (this.get('columnType')) {
      params.push('column_type=' + this.get('columnType'));
    }
    if (_.isNumber(this.get('start'))) {
      params.push('start=' + this.get('start'));
    }
    if (_.isNumber(this.get('end'))) {
      params.push('end=' + this.get('end'));
    }
    if (_.isNumber(this.get('bins'))) {
      params.push('bins=' + this.get('bins'));
    }
    if (_.isNumber(this.get('own_filter'))) {
      params.push('own_filter=' + this.get('own_filter'));
    }
    if (this.get('boundingBox') && this.get('submitBBox')) {
      params.push('bbox=' + this.get('boundingBox'));
    }

    var url = this.get('url');
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return url;
  },

  initialize: function (attrs, opts) {
    DataviewModelBase.prototype.initialize.apply(this, arguments);
    this._data = new Backbone.Collection(this.get('data'));

    // BBox should only be included until after the first fetch, since we want to get the range of the full dataset
    this.once('change:data', function () {
      this.set('submitBBox', true);
    }, this);

    this.layer.bind('change:meta', this._onChangeLayerMeta, this);
  },

  getData: function () {
    return this._data.toJSON();
  },

  getSize: function () {
    return this._data.size();
  },

  parse: function (data) {
    var numberOfBins = data.bins_count;
    var width = data.bin_width;
    var start = data.bins_start;

    var buckets = new Array(numberOfBins);

    _.each(data.bins, function (b) {
      buckets[b.bin] = b;
    });

    for (var i = 0; i < numberOfBins; i++) {
      buckets[i] = _.extend({
        bin: i,
        start: start + (i * width),
        end: start + ((i + 1) * width),
        freq: 0
      }, buckets[i]);
    }

    this._data.reset(buckets);

    return {
      data: buckets,
      nulls: data.nulls
    };
  },

  toJSON: function (d) {
    return {
      type: 'histogram',
      options: {
        column: this.get('column'),
        bins: this.get('bins')
      }
    };
  },

  _onChangeLayerMeta: function () {
    this.filter.set('columnType', this.layer.get('meta').column_type);
  },

  _onChangeBinds: function () {
    DataviewModelBase.prototype._onChangeBinds.call(this);
    this.bind('change:histogramSizes', function (mdl, isSizesApplied, d) {
      if (isSizesApplied) {
        this.trigger('histogramSizes', this);
      }
    }, this);
  }
});
