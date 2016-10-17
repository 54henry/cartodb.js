var _ = require('underscore');
var Backbone = require('backbone');
var template = require('./layer-legends-template.tpl');
var LegendViewFactory = require('./legend-view-factory');

var LayerLegendsView = Backbone.View.extend({

  className: 'CDB-LayerLegends js-layer-legends',

  events: {
    'click .js-toggle-layer': '_onToggleLayerCheckboxClicked'
  },

  initialize: function (options) {
    this._legendViews = [];

    this.settingsModel = options.settingsModel;
    this.tryContainerVisibility = options.tryContainerVisibility;

    this.model.on('change:visible', this.render, this);
    this.model.on('change:layer_name', this.render, this);

    this._getLegendModels().forEach(function (model) {
      model.on('change:state', _.debounce(this.render, 150), this);
      model.on('change:visible', _.debounce(this.render, 150), this);
    }, this);

    this.settingsModel.on('change', this.render, this);
  },

  render: function () {
    var showLegends = this._shouldLegendsBeVisible();
    var showLayerSelector = this._shouldLayerSelectorBeVisible();
    var shouldVisible = this._shouldLayerLegendsBeVisible();

    this.$el.html(
      template({
        shouldVisible: shouldVisible,
        layerName: this.model.getName(),
        isLayerVisible: this._isLayerVisible(),
        showLegends: showLegends,
        showLayerSelector: showLayerSelector
      })
    );

    if (shouldVisible) {
      this._renderLegends();
    }

    this.tryContainerVisibility();
    return this;
  },

  _shouldLegendsBeVisible: function () {
    var showLegends = this.settingsModel.get('showLegends');
    return showLegends && this._isLayerVisible();
  },

  _shouldLayerLegendsBeVisible: function () {
    var isLayerSelectorEnabled = this.settingsModel.get('layerSelectorEnabled');
    var showLayerSelector = this.settingsModel.get('showLayerSelector');
    var showLegends = this.settingsModel.get('showLegends');
    var hasLegends = this.model.legends.hasAnyLegend();
    var shouldVisible;

    if (!isLayerSelectorEnabled) {
      shouldVisible = this._isLayerVisible() && showLegends && hasLegends;
    } else {
      shouldVisible = showLayerSelector || this._isLayerVisible() && showLegends && hasLegends;
    }

    return shouldVisible;
  },

  _shouldLayerSelectorBeVisible: function () {
    var isLayerSelectorEnabled = this.settingsModel.get('layerSelectorEnabled');
    var showLayerSelector = this.settingsModel.get('showLayerSelector');
    var shouldVisible = showLayerSelector && isLayerSelectorEnabled;

    return shouldVisible;
  },

  _renderLegends: function () {
    _.each(this._getLegendModels(), this._renderLegend, this);
  },

  _renderLegend: function (legendModel) {
    var legendView = LegendViewFactory.createLegendView(legendModel);
    this._legendViews.push(legendView);
    this._legendsContainer().append(legendView.render().$el);
  },

  _legendsContainer: function () {
    return this.$('.js-legends');
  },

  _onToggleLayerCheckboxClicked: function (event) {
    var isLayerEnabled = event.target.checked;
    if (isLayerEnabled) {
      this.model.show();
    } else {
      this.model.hide();
    }
  },

  _getLegendViews: function () {
    return this._legendViews || [];
  },

  _getLegendModels: function () {
    return [
      this.model.legends.custom,
      this.model.legends.html,
      this.model.legends.choropleth,
      this.model.legends.category,
      this.model.legends.bubble
    ];
  },

  _isLayerVisible: function () {
    return this.model.isVisible();
  }
});

module.exports = LayerLegendsView;
