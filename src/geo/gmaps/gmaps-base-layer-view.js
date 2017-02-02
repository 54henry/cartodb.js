/* global google */
var _ = require('underscore');
var GMapsLayerView = require('./gmaps-layer-view');

var GOOGLE_MAP_TYPE_IDS = {
  'roadmap': google.maps.MapTypeId.ROADMAP,
  'gray_roadmap': google.maps.MapTypeId.ROADMAP,
  'dark_roadmap': google.maps.MapTypeId.ROADMAP,
  'hybrid': google.maps.MapTypeId.HYBRID,
  'satellite': google.maps.MapTypeId.SATELLITE,
  'terrain': google.maps.MapTypeId.TERRAIN
};

var GMapsBaseLayerView = function (layerModel, gmapsMap) {
  GMapsLayerView.call(this, layerModel, gmapsMap);
};

_.extend(
  GMapsBaseLayerView.prototype,
  GMapsLayerView.prototype, {
    addToMap: function () {
      this.gmapsMap.setOptions({
        mapTypeId: GOOGLE_MAP_TYPE_IDS[this.model.get('baseType')],
        styles: this.model.get('style')
      });
    },

    remove: function () { },

    _onModelUpdated: function () {
      this.gmapsMap.setOptions({
        mapTypeId: GOOGLE_MAP_TYPE_IDS[this.model.get('baseType')],
        styles: JSON.parse(this.model.get('style'))
      });
    }
  }
);

module.exports = GMapsBaseLayerView;
