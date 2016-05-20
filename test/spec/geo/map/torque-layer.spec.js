var _ = require('underscore');
var TorqueLayer = require('../../../../src/geo/map/torque-layer');
var sharedTestsForInteractiveLayers = require('./shared-for-interactive-layers');

describe('geo/map/torque-layer', function () {
  sharedTestsForInteractiveLayers(TorqueLayer);

  describe('map reloading', function () {
    var ATTRIBUTES = ['visible', 'sql', 'source'];

    _.each(ATTRIBUTES, function (attribute) {
      it("should reload the map when '" + attribute + "' attribute changes", function () {
        var map = jasmine.createSpyObj('map', ['reload']);
        var layer = new TorqueLayer({}, { map: map });

        layer.set(attribute, 'new_value');

        expect(map.reload).toHaveBeenCalled();
      });
    });

    it('should reload the map just once when multiple attributes change', function () {
      var map = jasmine.createSpyObj('map', ['reload']);
      var layer = new TorqueLayer({}, { map: map });

      var newAttributes = {};
      _.each(ATTRIBUTES, function (attr, index) {
        newAttributes[attr] = 'new_value_' + index;
      });
      layer.set(newAttributes);

      expect(map.reload).toHaveBeenCalled();
      expect(map.reload.calls.count()).toEqual(1);
    });

    it('should NOT reload the map when cartocss is set and it was previously empty', function () {
      var map = jasmine.createSpyObj('map', ['reload']);
      var layer = new TorqueLayer({}, { map: map });

      layer.set('cartocss', 'new_value');

      expect(map.reload).not.toHaveBeenCalled();
    });

    it('should NOT reload the map if a cartocss property has changed and a reload is not needed', function () {
      var map = jasmine.createSpyObj('map', ['reload']);
      var layer = new TorqueLayer({
        cartocss: 'Map { something: "a"; -torque-time-attribute: "column"; }'
      }, { map: map });

      layer.set('cartocss', 'Map { something: "b"; -torque-time-attribute: "column"; }');

      expect(map.reload).not.toHaveBeenCalled();
    });

    _.each([
      '-torque-frame-count',
      '-torque-time-attribute',
      '-torque-aggregation-function',
      '-torque-data-aggregation',
      '-torque-resolution'
    ], function (property) {
      it('should reload the map if cartocss attribute has changed and "' + property + '"" property has changed', function () {
        var map = jasmine.createSpyObj('map', ['reload']);
        var layer = new TorqueLayer({
          cartocss: 'Map { something: "a"; ' + property + ': "valueA"; }'
        }, { map: map });

        layer.set('cartocss', 'Map { something: "b"; ' + property + ': "valueB"; }');

        expect(map.reload).toHaveBeenCalled();
      });
    });
  });
});
