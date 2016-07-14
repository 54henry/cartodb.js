var LayerModelBase = require('./layer-model-base');

var GMapsBaseLayer = LayerModelBase.extend({
  OPTIONS: ['roadmap', 'satellite', 'terrain', 'custom'],
  defaults: {
    type: 'GMapsBase',
    visible: true,
    base_type: 'gray_roadmap',
    style: null
  }
});

module.exports = GMapsBaseLayer;
