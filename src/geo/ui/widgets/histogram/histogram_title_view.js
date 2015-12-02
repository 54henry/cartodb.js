var _ = require('underscore');
var cdb = require('cdb');
var $ = require('jquery');
var View = require('cdb/core/view');
var TooltipView = require('cdb/geo/ui/widgets/widget-tooltip-view');
var template = require('./histogram_title_template.tpl');

/**
 *  Show title + show if histogram sizes are applied or not
 *
 */

module.exports = View.extend({

  className: 'CDB-Widget-title CDB-Widget-contentSpaced',

  events: {
    'click .js-applySizes': '_applySizes',
    'click .js-cancelSizes': '_cancelSizes',
    'click .js-collapse': '_toggleCollapse'
  },

  initialize: function() {
    this.dataModel = this.options.dataModel;
    this._initBinds();
  },

  render: function() {
    this.$el.html(
      template({
        title: this.dataModel.get('title'),
        isSizesApplied: this.dataModel.get('histogramSizes'),
        isCollapsed: this.dataModel.isCollapsed()
      })
    );
    this._initViews();

    return this;
  },

  _initBinds: function() {
    this.dataModel.bind('change:histogramSizes change:collapsed', this.render, this);
    this.add_related_model(this.dataModel);
  },

  _initViews: function() {
    var sizesTooltip = new TooltipView({
      target: this.$('.js-sizes')
    });
    $('body').append(sizesTooltip.render().el);
    this.addView(sizesTooltip);

    var collapseTooltip = new TooltipView({
      target: this.$('.js-collapse')
    });
    $('body').append(collapseTooltip.render().el);
    this.addView(collapseTooltip);
  },

  _applySizes: function() {
    this.dataModel.set('histogramSizes', true);
  },

  _cancelSizes: function() {
    this.dataModel.set('histogramSizes', false);
  },

  _toggleCollapse: function() {
    this.dataModel.toggleCollapsed();
  }

});
