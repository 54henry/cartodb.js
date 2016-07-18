var _ = require('underscore');
var Model = require('../core/model');
var BackboneCancelSync = require('../util/backbone-abort-sync');
var WindshaftFiltersBoundingBoxFilter = require('../windshaft/filters/bounding-box');
var BOUNDING_BOX_FILTER_WAIT = 500;

/**
 * Default dataview model
 */
module.exports = Model.extend({
  defaults: {
    url: '',
    data: [],
    sync_on_data_change: true,
    sync_on_bbox_change: true,
    enabled: true
  },

  url: function () {
    var params = _.union(
      [ this._getBoundingBoxFilterParam() ],
      this._getDataviewSpecificURLParams()
    );

    if (this.get('apiKey')) {
      params.push('api_key=' + this.get('apiKey'));
    } else if (this.get('authToken')) {
      params.push('auth_token=' + this.get('authToken'));
    }
    return this.get('url') + '?' + params.join('&');
  },

  _getBoundingBoxFilterParam: function () {
    var boundingBoxFilter = new WindshaftFiltersBoundingBoxFilter(this._map.getViewBounds());
    return 'bbox=' + boundingBoxFilter.toString();
  },

  /**
   * Subclasses might override this method to define extra params that will be appended
   * to the dataview's URL.
   * @return {[Array]} An array of strings in the form of "key=value".
   */
  _getDataviewSpecificURLParams: function () {
    return [];
  },

  initialize: function (attrs, opts) {
    attrs = attrs || {};
    opts = opts || {};

    if (!opts.map) throw new Error('map is required');
    if (!opts.analysisCollection) throw new Error('analysisCollection is required');
    if (!attrs.source) throw new Error('source is a required attr');

    if (!attrs.id) {
      this.set('id', this.defaults.type + '-' + this.cid);
    }

    this.layer = opts.layer;
    this._map = opts.map;
    this._analysisCollection = opts.analysisCollection;

    this.sync = BackboneCancelSync.bind(this);

    // filter is optional, so have to guard before using it
    this.filter = opts.filter;
    if (this.filter) {
      this.filter.set('dataviewId', this.id);
    }

    this._initBinds();
    this._setupAnalysisStatusEvents();
  },

  _getLayerDataProvider: function () {
    return this.layer.getDataProvider();
  },

  _initBinds: function () {
    this.listenTo(this.layer, 'change:visible', this._onLayerVisibilityChanged);
    this.listenTo(this.layer, 'change:source', this._setupAnalysisStatusEvents);
    this.on('change:source', this._setupAnalysisStatusEvents, this);

    var layerDataProvider = this._getLayerDataProvider();
    if (layerDataProvider) {
      this.listenToOnce(layerDataProvider, 'dataChanged', this._onChangeBinds, this);
      this.listenTo(layerDataProvider, 'dataChanged', this.fetch);
    } else {
      this.listenToOnce(this, 'change:url', function () {
        this.fetch({
          success: this._onChangeBinds.bind(this)
        });
      });
    }

    if (this.filter) {
      this.listenTo(this.filter, 'change', this._onFilterChanged);
    }
  },

  _setupAnalysisStatusEvents: function () {
    this._removeExistingAnalysisBindings();
    this._analysis = this._analysisCollection.get(this.getSourceId());
    if (this._analysis) {
      this._analysis.on('change:status', this._onAnalysisStatusChange, this);
    }
  },

  _removeExistingAnalysisBindings: function () {
    if (!this._analysis) return;
    this._analysis.off('change:status', this._onAnalysisStatusChange, this);
  },

  _onAnalysisStatusChange: function (analysis, status) {
    if (analysis.isLoading()) {
      this._triggerLoading();
    } else if (analysis.isFailed()) {
      this._triggerError(analysis.get('error'));
    }
    // loaded will be triggered through the default behavior, so not necessary to react on that status here
  },

  _triggerLoading: function () {
    this.trigger('loading', this);
  },

  _triggerError: function (error) {
    this.trigger('error', this, error);
  },

  /**
   * @private
   */
  _onFilterChanged: function (filter) {
    var layerDataProvider = this._getLayerDataProvider();
    if (layerDataProvider && layerDataProvider.canApplyFilterTo(this)) {
      layerDataProvider.applyFilter(this, filter);
    } else {
      this._reloadMap();
    }
  },

  /**
   * @protected
   */
  _reloadMap: function (opts) {
    opts = opts || {};
    this._map.reload(
      _.extend(
        opts, {
          sourceId: this.getSourceId()
        }
      )
    );
  },

  _reloadMapAndForceFetch: function () {
    this._reloadMap({
      forceFetch: true
    });
  },

  /**
   * Enable/disable the dataview depending on the layer visibility.
   * @private
   * @param  {LayerModel} model the layer model which visible property has changed.
   * @param  {Boolean} value New value for visible.
   * @returns {void}
   */
  _onLayerVisibilityChanged: function (model, value) {
    this.set({enabled: value});
  },

  _onChangeBinds: function () {
    this.listenTo(this._map, 'change:center change:zoom', _.debounce(this._onMapBoundsChanged.bind(this), BOUNDING_BOX_FILTER_WAIT));

    this.on('change:url', function (model, value, opts) {
      if (this.get('sync_on_data_change')) {
        this._newDataAvailable = true;
      }
      if (this._shouldFetchOnURLChange(opts && _.pick(opts, ['forceFetch', 'sourceId']))) {
        this.fetch();
      }
    }, this);

    this.on('change:enabled', function (mdl, isEnabled) {
      if (isEnabled && this._newDataAvailable) {
        this.fetch();
        this._newDataAvailable = false;
      }
    }, this);
  },

  _onMapBoundsChanged: function () {
    if (this._shouldFetchOnBoundingBoxChange()) {
      this.fetch();
    }

    if (this.get('sync_on_bbox_change')) {
      this._newDataAvailable = true;
    }
  },

  _shouldFetchOnURLChange: function (options) {
    options = options || {};
    var sourceId = options.sourceId;
    var forceFetch = options.forceFetch;

    if (forceFetch) {
      return true;
    }

    return this.get('sync_on_data_change') &&
      this.get('enabled') &&
        (!sourceId || sourceId && this._sourceAffectsMyOwnSource(sourceId));
  },

  _sourceAffectsMyOwnSource: function (sourceId) {
    var sourceAnalysis = this._analysisCollection.get(this.getSourceId());
    return sourceAnalysis && sourceAnalysis.findAnalysisById(sourceId);
  },

  _shouldFetchOnBoundingBoxChange: function () {
    return this.get('enabled') && this.get('sync_on_bbox_change');
  },

  refresh: function () {
    this.fetch();
  },

  update: function (attrs) {
    attrs = _.pick(attrs, this.constructor.ATTRS_NAMES);
    this.set(attrs);
  },

  getData: function () {
    return this.get('data');
  },

  getPreviousData: function () {
    return this.previous('data');
  },

  fetch: function (opts) {
    opts = opts || {};
    var layerDataProvider = this._getLayerDataProvider();
    if (layerDataProvider && layerDataProvider.canProvideDataFor(this)) {
      this.set(this.parse(layerDataProvider.getDataFor(this)));
    } else {
      this._triggerLoading();

      if (opts.success) {
        var successCallback = opts && opts.success;
      }

      return Model.prototype.fetch.call(this, _.extend(opts, {
        success: function () {
          successCallback && successCallback(arguments);
          this.trigger('loaded', this);
        }.bind(this),
        error: function (mdl, err) {
          if (!err || (err && err.statusText !== 'abort')) {
            this._triggerError(err);
          }
        }.bind(this)
      }));
    }
  },

  toJSON: function () {
    throw new Error('toJSON should be defined for each dataview');
  },

  hasSameSourceAsLayer: function () {
    return this.getSourceId() === this.layer.get('source');
  },

  getSourceId: function () {
    // Dataview is pointing to a layer that has a source, so its
    // source is actually the the layers's source
    if (this.hasLayerAsSource() && this.layer.has('source')) {
      return this.layer.get('source');
    }

    // Dataview is pointing to a layer with `sql` or an analysis
    // node directly, so just return the id that has been set by
    // dataviews-factory.js
    return this._ownSourceId();
  },

  _ownSourceId: function () {
    return this.has('source') && this.get('source').id;
  },

  hasLayerAsSource: function () {
    return this._ownSourceId() === this.layer.id;
  },

  remove: function () {
    this._removeExistingAnalysisBindings();

    if (this.filter) {
      var isFilterEmpty = this.filter.isEmpty();
      this.filter.remove();
      if (!isFilterEmpty) {
        this._reloadMap();
      }
    }

    this.trigger('destroy', this);
    this.stopListening();
  }
},

  // Class props
  {
    ATTRS_NAMES: [
      'id',
      'sync_on_data_change',
      'sync_on_bbox_change',
      'enabled',
      'source'
    ]
  }
);
