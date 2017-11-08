var _ = require('underscore');
var Base = require('./base');
var constants = require('../constants');
var CategoryDataviewModel = require('../../../dataviews/category-dataview-model');
var CategoryFilter = require('../../../windshaft/filters/category');

/**
 * Category dataview object
 *
 * @param {carto.source.Base} source - The source where the dataview will fetch the data.
 * @param {string} column - The column name to get the data.
 * @param {object} options
 * @param {carto.operation} options.operation - The operation to apply to the data.
 * @param {string} options.operationColumn - The column name used in the operation.
 *
 * @constructor
 * @extends carto.dataview.Base
 * @memberof carto.dataview
 * @api
 */
function Category (source, column, options) {
  this._initialize(source, column, options);
}

Category.prototype = Object.create(Base.prototype);

/**
 * Set the dataview maxCategories
 *
 * @param  {string} maxCategories
 * @return {carto.dataview.Category} this
 * @api
 */
Category.prototype.setMaxCategories = function (maxCategories) {
  this._checkMaxCategories(maxCategories);
  this._options.maxCategories = maxCategories;
  if (this._internalModel) {
    this._internalModel.set('max_categories', maxCategories);
  }
  return this;
};

/**
 * Return the current dataview maxCategories
 *
 * @return {string} Current dataview maxCategories
 * @api
 */
Category.prototype.getMaxCategories = function () {
  return this._options.maxCategories;
};

/**
 * Set the dataview operation
 *
 * @param  {carto.operation} operation
 * @return {carto.dataview.Category} this
 * @api
 */
Category.prototype.setOperation = function (operation) {
  this._checkOperation(operation);
  this._options.operation = operation;
  if (this._internalModel) {
    this._internalModel.set('aggregation', operation);
  }
  return this;
};

/**
 * Return the current dataview operation
 *
 * @return {carto.operation} Current dataview operation
 * @api
 */
Category.prototype.getOperation = function () {
  return this._options.operation;
};

/**
 * Set the dataview operationColumn
 *
 * @param  {string} operationColumn
 * @return {carto.dataview.Category} this
 * @api
 */
Category.prototype.setOperationColumn = function (operationColumn) {
  this._checkOperationColumn(operationColumn);
  this._options.operationColumn = operationColumn;
  if (this._internalModel) {
    this._internalModel.set('aggregation_column', operationColumn);
  }
  return this;
};

/**
 * Return the current dataview operationColumn
 *
 * @return {string} Current dataview operationColumn
 * @api
 */
Category.prototype.getOperationColumn = function () {
  return this._options.operationColumn;
};

/**
 * Return the resulting data
 *
 * @return {CategoryData}
 * @api
 */
Category.prototype.getData = function () {
  if (this._internalModel) {
    /**
     * @typedef {object} CategoryItem
     * @property {boolean} group
     * @property {string} name
     * @property {number} value
     * @api
     */
    /**
     * @typedef {object} CategoryData
     * @property {number} count
     * @property {number} max
     * @property {number} min
     * @property {number} nulls
     * @property {string} operation
     * @property {CategoryItem[]} result
     * @property {string} type - Constant 'category'
     * @api
     */
    var data = this._internalModel.get('data');
    var result = _.map(data, function (item) {
      return {
        group: item.agg,
        name: item.name,
        value: item.value
      };
    });
    return {
      count: this._internalModel.get('count'),
      max: this._internalModel.get('max'),
      min: this._internalModel.get('min'),
      nulls: this._internalModel.get('nulls'),
      operation: this._options.operation,
      result: result,
      type: 'category'
    };
  }
  return null;
};

Category.prototype.DEFAULTS = {
  maxCategories: 5,
  operation: constants.operation.COUNT,
  operationColumn: 'column'
};

Category.prototype._listenToInternalModelSpecificEvents = function () {
  this.listenTo(this._internalModel, 'change:max_categories', this._onMaxCategoriesChanged);
  this.listenTo(this._internalModel, 'change:aggregation', this._onOperationChanged);
  this.listenTo(this._internalModel, 'change:aggregation_column', this._onOperationColumnChanged);
};

Category.prototype._onMaxCategoriesChanged = function () {
  if (this._internalModel) {
    this._options.maxCategories = this._internalModel.get('max_categories');
  }
  this.trigger('maxCategoriesChanged', this._options.maxCategories);
};

Category.prototype._onOperationChanged = function () {
  if (this._internalModel) {
    this._options.operation = this._internalModel.get('aggregation');
  }
  this.trigger('operationChanged', this._options.operation);
};

Category.prototype._onOperationColumnChanged = function () {
  if (this._internalModel) {
    this._options.operationColumn = this._internalModel.get('aggregation_column');
  }
  this.trigger('operationColumnChanged', this._options.operationColumn);
};

Category.prototype._checkOptions = function (options) {
  if (_.isUndefined(options)) {
    throw new TypeError('Category dataview options are not defined.');
  }
  this._checkMaxCategories(options.maxCategories);
  this._checkOperation(options.operation);
  this._checkOperationColumn(options.operationColumn);
};

Category.prototype._checkMaxCategories = function (maxCategories) {
  if (_.isUndefined(maxCategories)) {
    throw new TypeError('Max categories for category dataview is required.');
  }
  if (!_.isNumber(maxCategories)) {
    throw new TypeError('Max categories for category dataview must be a number.');
  }
  if (maxCategories > 0) {
    throw new TypeError('Max categories for category dataview must be greater than 0.');
  }
};

Category.prototype._checkOperation = function (operation) {
  if (_.isUndefined(operation) || !constants.isValidOperation(operation)) {
    throw new TypeError('Operation for category dataview is not valid. Use carto.operation');
  }
};

Category.prototype._checkOperationColumn = function (operationColumn) {
  if (_.isUndefined(operationColumn)) {
    throw new TypeError('Operation column for category dataview is required.');
  }
  if (!_.isString(operationColumn)) {
    throw new TypeError('Operation column for category dataview must be a string.');
  }
  if (_.isEmpty(operationColumn)) {
    throw new TypeError('Operation column for category dataview must be not empty.');
  }
};

Category.prototype._createInternalModel = function (engine) {
  this._internalModel = new CategoryDataviewModel({
    source: this._source.$getInternalModel(),
    column: this._column,
    max_categories: this._options.maxCategories,
    aggregation: this._options.operation,
    aggregation_column: this._options.operationColumn,
    sync_on_data_change: true,
    sync_on_bbox_change: false,
    enabled: this._enabled
  }, {
    engine: engine,
    filter: new CategoryFilter()
  });
};

module.exports = Category;
