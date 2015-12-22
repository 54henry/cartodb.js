var $ = require('jquery');
var Attribution = require('../../../../src/geo/ui/attribution/attribution-view');
var Map = require('../../../../src/geo/map');

describe('geo/ui/attribution', function () {
  beforeEach(function () {
    this.keyEsc = function () {
      var e = $.Event('keydown');
      e.keyCode = 27; // ESC
      $(document).trigger(e);
    };

    this.map = new Map();
    spyOn(this.map, 'bind').and.callThrough();

    this.view = new Attribution({
      map: this.map
    });
    this.view.render();
    this.$button = this.view.$('.js-button');
    this.$text = this.view.$('.js-text');
    this.viewHasClass = function (className) {
      return this.view.$el.hasClass(className);
    };
  });

  describe('render', function () {
    it('should render properly', function () {
      expect(this.$button.length).toBe(1);
      expect(this.$text.length).toBe(1);
    });

    it('should render when map attributions has changed', function () {
      spyOn(this.view, 'render');
      this.$button.click();
      this.map.trigger('change:attribution');
      expect(this.view.render).toHaveBeenCalled();
    });

    it('should add GMaps properly when provider is not Leaflet', function () {
      expect(this.viewHasClass('CDB-Attribution--gmaps')).toBeFalsy();
      this.map.set('provider', 'gmaps');
      this.view.render();
      expect(this.viewHasClass('CDB-Attribution--gmaps')).toBeTruthy();
    });
  });

  describe('when the attributions are displayed', function () {
    beforeEach(function () {
      this.$button.click();
    });

    it('should hide attributions text when js-button is clicked', function () {
      this.$button.click();
      expect(this.viewHasClass('is-active')).toBeFalsy();
    });

    it('should collapse the attributions when ESC is pressed', function () {
      this.keyEsc();
      expect(this.viewHasClass('is-active')).toBeFalsy();
    });

    it('should collapse the attributions when user clicks on the document', function () {
      $(document).trigger('click');
      expect(this.viewHasClass('is-active')).toBeFalsy();
    });
  });

  describe('when attributions are hidden', function () {
    beforeEach(function () {
      this.$button.click();
      this.keyEsc();
    });

    it('should show attributions text when js-button is clicked', function () {
      this.$button.click();
      expect(this.viewHasClass('is-active')).toBeTruthy();
    });

    it('should not respond to ESC', function () {
      expect(this.viewHasClass('is-active')).toBeFalsy();
      this.keyEsc();
      expect(this.viewHasClass('is-active')).toBeFalsy();
    });

    it('should not respond to clicks on the document', function () {
      expect(this.viewHasClass('is-active')).toBeFalsy();
      $(document).trigger('click');
      expect(this.viewHasClass('is-active')).toBeFalsy();
    });
  });
});
