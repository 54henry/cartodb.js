var Backbone = require('backbone');

/**
 * Collection of Dataviews
 */
module.exports = Backbone.Collection.extend({
  initialize: function () {
    // If a histogram model applies the histogram sizes, rest should remove/disable
    // the sizes applied before.
    this.bind('change:histogram_sizes', function (m, isSizesApplied) {
      if (isSizesApplied) {
        this.each(function (mdl) {
          if (mdl !== m && mdl.layer.get('layer_name') === m.layer.get('layer_name') && mdl.get('histogram_sizes')) {
            mdl.set('histogram_sizes', false);
          }
        });
      }

    }, this);
  },

  getTemporaryStyles: function () {
    var tempStyles = {};
    this.each(function (mdl) {
      if (mdl.tempStyle) {
        tempStyles[mdl.layer.collection.indexOf(mdl.layer)] = mdl.tempStyle
      }
    });
    return tempStyles
  }
});
