var _ = require('underscore');
var Backbone = require('backbone');
var Template = require('./template');
var logProxy = require('log-proxy');

var TemplateList = Backbone.Collection.extend({
  model: Template,

  getTemplate: function(template_name) {
    if (this.namespace) {
      template_name = this.namespace + template_name;
    }

    var t = this.find(function(t) {
        return t.get('name') === template_name;
    });

    if(t) {
      return _.bind(t.render, t);
    }

    logProxy.get().error(template_name + " not found");

    return null;
  }
});

module.exports = TemplateList;
