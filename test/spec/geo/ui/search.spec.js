var $ = require('jquery');
var Backbone = require('backbone');
var Search = require('../../../../src/geo/ui/search/search');
var geocoder = require('../../../../src/geo/geocoder/mapbox-geocoder');
var Map = require('../../../../src/geo/map');
var LeafletMapView = require('../../../../src/geo/leaflet/leaflet-map-view');

fdescribe('geo/ui/search', function () {
  beforeEach(function () {
    this.$el = $('<div>')
      .attr('id', 'map')
      .height(500)
      .width(500);
    $('body').append(this.$el);
    this.map = new Map(null, { layersFactory: {} });
    this.mapView = new LeafletMapView({
      el: this.$el,
      mapModel: this.map,
      engine: new Backbone.Model(),
      layerViewFactory: jasmine.createSpyObj('layerViewFactory', ['createLayerView']),
      layerGroupModel: new Backbone.Model()
    });
    this.mapView.render();

    this.view = new Search({
      model: this.map,
      mapView: this.mapView,
      token: 'pk.eyJ1IjoiY2FydG8tdGVhbSIsImEiOiJjamNseTl3ZzQwZnFkMndudnIydnJoMXZxIn0.HycQBkaaV7ZwLkHm5hEmfg'
    });
    this.view.render();
  });

  it('should render properly', function () {
    expect(this.view.$('.js-form').length).toBe(1);
    expect(this.view.$('.js-textInput').length).toBe(1);
    expect(this.view.$('input[type="submit"]').length).toBe(0);
    expect(this.view.$('span.loader').length).toBe(0);
  });

  describe('onSubmit', function () {
    beforeEach(function () {
      this.result = {
        lat: 43.0,
        lon: -3.0,
        boundingbox: {
          south: 6.0,
          north: 4.0,
          west: 6.0,
          east: 4.0
        },
        type: undefined
      };
      spyOn(geocoder, 'geocode').and.callThrough();
      this.view.$('.js-textInput').val('Madrid, Spain');
    });

    it('should search with geocoder when form is submit', function () {
      this.view.$('.js-form').submit();
      expect(geocoder.geocode).toHaveBeenCalled();
    });

    it('should change map center when geocoder returns any result', function () {
      pending('Fix this test. Maybe testing search._onResult ??');
      geocoder.geocode.and.returnValue(Promise.resolve([{'center': {'lon': -3.69194, 'lat': 40.41889}, 'lat': 40.41889, 'lon': -3.69194, 'boundingbox': {'south': -3.888965, 'west': 40.311994, 'north': -3.517964, 'east': 40.643313}, 'type': 'venue'}]));
      var onBoundsChanged = jasmine.createSpy('onBoundsChange');
      this.map.bind('change:view_bounds_ne', onBoundsChanged, this.view);
      this.view.$('.js-form').submit();
      expect(onBoundsChanged).toHaveBeenCalled();
      this.map.unbind('change:view_bounds_ne', onBoundsChanged, this.view);
    });

    describe('result zoom', function () {
      pending('resolve sync issues');
      it('should zoom to 18 when search result is building type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'building'
        };
        this.view.$('.js-form').submit();
        expect(this.map.get('zoom')).toBe(18);
      });

      it('should zoom to 15 when search result is postal-area type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'postal-area'
        };
        this.view.$('.js-form').submit();
        expect(this.map.get('zoom')).toBe(15);
      });

      it('should zoom to 18 when search result is venue type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'venue'
        };
        this.view.$('form').submit();
        expect(this.map.get('zoom')).toBe(18);
      });

      it('should zoom to 8 when search result is region type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'region'
        };
        this.view.$('form').submit();
        expect(this.map.get('zoom')).toBe(8);
      });

      it('should zoom to 5 when search result is country type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'country'
        };
        this.view.$('form').submit();
        expect(this.map.get('zoom')).toBe(5);
      });

      it('should zoom to 8 when search result is county type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'county'
        };
        this.view.$('form').submit();
        expect(this.map.get('zoom')).toBe(8);
      });

      it('should zoom to 18 when search result is address type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'address'
        };
        this.view.$('form').submit();
        expect(this.map.get('zoom')).toBe(18);
      });

      it('should zoom to 12 when search result is locality type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'locality'
        };
        this.view.$('form').submit();
        expect(this.map.get('zoom')).toBe(12);
      });

      it('should zoom to 11 when search result is localadmin type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'localadmin'
        };
        this.view.$('form').submit();
        expect(this.map.get('zoom')).toBe(11);
      });

      it('should zoom to 15 when search result is neighbourhood type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'neighbourhood'
        };
        this.view.$('form').submit();
        expect(this.map.get('zoom')).toBe(15);
      });

      it('should zoom to 12 when search result is unknown type', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0,
          type: 'whatever'
        };
        this.view.$('.js-form').submit();
        expect(this.map.get('zoom')).toBe(12);
      });
    });

    describe('searchPin', function () {
      pending('resolve sync issues');
      beforeEach(function () {
        this.view.options.searchPin = true;
        this.view.$('.js-form').submit();
      });

      it('should add a pin and an infowindow when search is completed', function () {
        expect(this.view._searchPin).toBeDefined();
        expect(this.view._searchInfowindow).toBeDefined();
      });

      it('should place pin in the lat,lon if it is provided', function () {
        this.result = {
          lat: 43.0,
          lon: -3.0
        };
        expect(this.view._searchPin.get('latlng')).toEqual([ 43, -3 ]);
      });

      it('should place pin in the middle of the bbox if lat,lon is not provided', function () {
        this.result = {
          boundingbox: {
            south: 6.0,
            north: 4.0,
            west: 6.0,
            east: 4.0
          }
        };
        this.view.$('.js-form').submit();
        expect(this.view._searchPin.get('latlng')).toEqual([ 5.0, 5.0 ]);
      });

      it('should display address in the search infowindow', function () {
        expect(this.view._searchInfowindow.$('.CDB-infowindow-title').text()).toBe('Madrid, Spain');
      });

      it('should destroy/hide search pin when map is clicked', function (done) {
        jasmine.clock().install();

        var view = this.view;
        expect(view._searchPin).toBeDefined();
        expect(view._searchInfowindow).toBeDefined();
        this.mapView.trigger('click');
        setTimeout(function () {
          expect(view._searchPin).toBeUndefined();
          expect(view._searchInfowindow).toBeUndefined();
          done();
        }, 1500);

        jasmine.clock().tick(2000);
      });
    });
  });

  afterEach(function () {
    this.$el.remove();
    jasmine.clock().uninstall();
  });
});
