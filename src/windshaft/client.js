/**
 * Windshaft client. It provides a method to create instances of dashboards.
 * @param {object} options Options to set up the client
 */
cdb.windshaft.Client = function(options) {
  this.ajax = window.$ ? window.$.ajax : reqwest.compat;
  this.windshaftURLTemplate = options.windshaftURLTemplate;
  this.userName = options.userName;
  this.url = this.windshaftURLTemplate.replace('{user}', this.userName);
  this.statTag = options.statTag;
  this.isCorsSupported = cdb.core.util.isCORSSupported();
  this.forceCors = options.forceCors;
  this.endpoint = options.endpoint;
}

cdb.windshaft.Client.DEFAULT_COMPRESSION_LEVEL = 3;
cdb.windshaft.Client.MAX_GET_SIZE = 2033;

/**
 * Creates an instance of a map in Windshaft
 * @param {object} mapDefinition An object that responds to .toJSON with the definition of the map
 * @param  {function} callback A callback that will get the public or private map
 * @return {cdb.windshaft.DashboardInstance} The instance of the dashboard
 */
cdb.windshaft.Client.prototype.instantiateMap = function(mapDefinition) {
  var payload = JSON.stringify(mapDefinition);

  var dashboardInstance = new cdb.windshaft.DashboardInstance();

  var options = {
    success: function(data) {
      if (data.errors) {
        throw "Windshaft Error: " + data.errors;
      } else {
        data.windshaftURLTemplate = this.windshaftURLTemplate;
        data.userName = this.userName;
        dashboardInstance.set(data);
      }
    }.bind(this),
    error: function(xhr) {
      var err = { errors: ['Unknown error'] };
      try {
        err = JSON.parse(xhr.responseText);
      } catch(e) {}
      throw "Windshaft Error: " + err.errors;
    }
  }

  if (this._usePOST(payload)) {
    this._post(payload, options);
  } else {
    this._get(payload, options);
  }

  return dashboardInstance;
}

cdb.windshaft.Client.prototype._usePOST = function(payload) {
  if (this.isCorsSupported && this.forceCors) {
    return true;
  }
  return payload.length >= this.constructor.MAX_GET_SIZE;
}

cdb.windshaft.Client.prototype._post = function(payload, options) {
  this.ajax({
    crossOrigin: true,
    type: 'POST',
    method: 'POST',
    dataType: 'json',
    contentType: 'application/json',
    url: this._getURL(),
    data: payload,
    success: options.success,
    error: options.error
  });
}

cdb.windshaft.Client.prototype._get = function(payload, options) {
  var compressFunction = this._getCompressor(payload);
  compressFunction(payload, this.constructor.DEFAULT_COMPRESSION_LEVEL, function(dataParameter) {
    this.ajax({
      url: this._getURL(dataParameter),
      dataType: 'jsonp',
      jsonpCallback: this._jsonpCallbackName(payload),
      cache: true,
      success: options.success,
      error: options.error
    });
  }.bind(this));
}

cdb.windshaft.Client.prototype._getCompressor = function(payload) {
  if (payload.length < this.constructor.MAX_GET_SIZE) {
    return function(data, level, callback) {
      callback("config=" + encodeURIComponent(data));
    };
  }

  return function(data, level, callback) {
    data = JSON.stringify({ config: data });
    LZMA.compress(data, level, function(encoded) {
      callback("lzma=" + encodeURIComponent(cdb.core.util.array2hex(encoded)));
    });
  };
}


cdb.windshaft.Client.prototype._getURL = function(dataParameter) {
  var params = [];
  params.push(["stat_tag", this.statTag].join("="));
  if (dataParameter) {
    params.push(dataParameter);  
  }
  return [this.url, this.endpoint].join('/') + '?' + params.join('&');
}

cdb.windshaft.Client.prototype._jsonpCallbackName = function(payload) {
  return '_cdbc_' + cdb.core.util.uniqueCallbackName(payload);
}