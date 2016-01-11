var _ = require('underscore');
var DataviewModelBase = require('./dataview-model-base');
var SearchModel = require('./category-dataview/search-model');
var CategoryModelRange = require('./category-dataview/category-model-range');
var CategoriesCollection = require('./category-dataview/categories-collection');
var LockedCatsCollection = require('./category-dataview/locked-categories-collection');

/**
 *  Category dataview model
 *
 *  - It has several internal models/collections
 *
 *  · search model: it manages category search results.
 *  · locked collection: it stores locked items.
 *  · filter model: it knows which items are accepted or rejected.
 *
 */

module.exports = DataviewModelBase.extend({

  defaults: _.extend(
    {
      allCategoryNames: [] // all (new + previously locked), updated on data fetch (see parse)
    },
    DataviewModelBase.prototype.defaults
  ),

  url: function () {
    return this.get('url') + '?bbox=' + this.get('boundingBox') + '&own_filter=' + (this.get('locked') ? 1 : 0);
  },

  initialize: function (attrs, opts) {
    this._data = new CategoriesCollection();

    DataviewModelBase.prototype.initialize.call(this, attrs, opts);

    // Locked categories collection
    this.locked = new LockedCatsCollection();

    // Internal model for calculating total amount of values in the category
    this.rangeModel = new CategoryModelRange();

    // Search model
    this.search = new SearchModel({}, {
      locked: this.locked
    });
  },

  // Set any needed parameter when they have changed in this model
  _setInternalModels: function () {
    var url = this.get('url');

    this.search.set({
      url: url,
      boundingBox: this.get('boundingBox')
    });

    this.rangeModel.setUrl(url);
  },

  _onChangeBinds: function () {
    this._setInternalModels();

    this.rangeModel.bind('change:totalCount change:categoriesCount', function () {
      this.set({
        totalCount: this.rangeModel.get('totalCount'),
        categoriesCount: this.rangeModel.get('categoriesCount')
      });
    }, this);

    this.bind('change:url', function () {
      if (this.get('sync') && !this.isDisabled()) {
        this._fetch();
      }
    }, this);

    this.bind('change:boundingBox', function () {
      // If a search is applied and bounding bounds has changed,
      // don't fetch new raw data
      if (this.get('bbox') && !this.isSearchApplied() && !this.isDisabled()) {
        this._fetch();
      }
    }, this);

    this.bind('change:url change:boundingBox', function () {
      this.search.set({
        url: this.get('url'),
        boundingBox: this.get('boundingBox')
      });
    }, this);

    this.bind('change:disabled', function (mdl, isDisabled) {
      if (!isDisabled) {
        if (mdl.changedAttributes(this._previousAttrs)) {
          this._fetch();
        }
      } else {
        this._previousAttrs = {
          url: this.get('url'),
          boundingBox: this.get('boundingBox')
        };
      }
    }, this);

    this.locked.bind('change add remove', function () {
      this.trigger('change:lockCollection', this.locked, this);
    }, this);

    this.search.bind('loading', function () {
      this.trigger('loading', this);
    }, this);
    this.search.bind('sync', function () {
      this.trigger('sync', this);
    }, this);
    this.search.bind('error', function (e) {
      if (!e || (e && e.statusText !== 'abort')) {
        this.trigger('error', this);
      }
    }, this);
    this.search.bind('change:data', function () {
      this.trigger('change:searchData', this.search, this);
    }, this);
  },

  getLockedSize: function () {
    return this.locked.size();
  },

  isLocked: function () {
    return this.get('locked');
  },

  canBeLocked: function () {
    return this.isLocked() ||
    this.getAcceptedCount() > 0;
  },

  canApplyLocked: function () {
    var acceptedCollection = this.filter.getAccepted();
    if (this.filter.getAccepted().size() !== this.locked.size()) {
      return true;
    }

    return acceptedCollection.find(function (m) {
      return !this.locked.isItemLocked(m.get('name'));
    }, this);
  },

  applyLocked: function () {
    var currentLocked = this.locked.getItemsName();
    if (!currentLocked.length) {
      this.unlockCategories();
      return false;
    }
    this.set('locked', true);
    this.filter.cleanFilter(false);
    this.filter.accept(currentLocked);
    this.filter.applyFilter();
    this.cleanSearch();
  },

  lockCategories: function () {
    this.set('locked', true);
    this._fetch();
  },

  unlockCategories: function () {
    this.set('locked', false);
    this.acceptAll();
  },

  // Search model helper methods //

  getSearchQuery: function () {
    return this.search.getSearchQuery();
  },

  setSearchQuery: function (q) {
    this.search.set('q', q);
  },

  isSearchValid: function () {
    return this.search.isValid();
  },

  getSearchResult: function () {
    return this.search.getData();
  },

  getSearchCount: function () {
    return this.search.getCount();
  },

  applySearch: function () {
    this.search.fetch();
  },

  isSearchApplied: function () {
    return this.search.isSearchApplied();
  },

  cleanSearch: function () {
    this.locked.resetItems([]);
    this.search.resetData();
  },

  setupSearch: function () {
    if (!this.isSearchApplied()) {
      var acceptedCats = this.filter.getAccepted().toJSON();
      this.locked.addItems(acceptedCats);
      this.search.setData(
        this._data.toJSON()
      );
    }
  },

  // Filter model helper methods //

  getRejectedCount: function () {
    return this.filter.rejectedCategories.size();
  },

  getAcceptedCount: function () {
    return this.filter.acceptedCategories.size();
  },

  acceptFilters: function (values) {
    this.filter.accept(values);
  },

  rejectFilters: function (values) {
    this.filter.reject(values);
  },

  rejectAll: function () {
    this.filter.rejectAll();
  },

  acceptAll: function () {
    this.filter.acceptAll();
  },

  isAllFiltersRejected: function () {
    return this.filter.get('rejectAll');
  },

  // Proper model helper methods //

  getData: function () {
    return this._data;
  },

  getSize: function () {
    return this._data.size();
  },

  getCount: function () {
    return this.get('categoriesCount');
  },

  isOtherAvailable: function () {
    return this._data.isOtherAvailable();
  },

  refresh: function () {
    if (this.isSearchApplied()) {
      this.search.fetch();
    } else {
      this._fetch();
    }
  },

  parse: function (d) {
    var newData = [];
    var _tmpArray = {};
    var allNewCategories = d.categories;
    var allNewCategoryNames = [];
    var acceptedCategoryNames = [];

    _.each(allNewCategories, function (datum, i) {
      // Category might be a non-string type (e.g. number), make sure it's always a string for concistency
      var category = datum.category.toString();

      allNewCategoryNames.push(category);
      var isRejected = this.filter.isRejected(category);
      _tmpArray[category] = true;

      newData.push({
        selected: !isRejected,
        name: category,
        agg: datum.agg,
        value: datum.value
      });
    }, this);

    if (this.isLocked()) {
      // Add accepted items that are not present in the categories data
      this.filter.getAccepted().each(function (mdl, i) {
        var category = mdl.get('name');
        acceptedCategoryNames.push(category);
        if (!_tmpArray[category]) {
          newData.push({
            selected: true,
            name: category,
            agg: false,
            value: 0
          });
        }
      }, this);
    }

    this._data.reset(newData);
    return {
      allCategoryNames: _
        .chain(allNewCategoryNames)
        .union(acceptedCategoryNames)
        .unique()
        .value(),
      data: newData,
      nulls: d.nulls,
      min: d.min,
      max: d.max,
      count: d.count
    };
  },

  // Backbone toJson function override
  toJSON: function () {
    return {
      type: 'aggregation',
      options: {
        column: this.get('column'),
        aggregation: this.get('aggregation'),
        aggregationColumn: this.get('aggregationColumn')
      }
    };
  }

});
