var Backbone = require('backbone');
var AnalysisModel = require('../../../src/analysis/analysis-model.js');
var AnalysisFactory = require('../../../src/analysis/analysis-factory.js');

describe('src/analysis/analysis-model.js', function () {
  describe('bindings', function () {
    beforeEach(function () {
      this.map = jasmine.createSpyObj('map', ['reload']);
      var fakeCamshaftReference = {
        getSourceNamesForAnalysisType: function (analysisType) {
          var map = {
            'analysis-type-1': ['source1', 'source2']
          };
          return map[analysisType];
        },
        getParamNamesForAnalysisType: function (analysisType) {
          var map = {
            'analysis-type-1': ['attribute1', 'attribute2']
          };

          return map[analysisType];
        }
      };

      this.analysisModel = new AnalysisModel({
        type: 'analysis-type-1',
        attribute1: 'value1',
        attribute2: 'value2'
      }, {
        map: this.map,
        camshaftReference: fakeCamshaftReference
      });
    });

    describe('on params change', function () {
      it('should reload the map', function () {
        this.analysisModel.set({
          attribute1: 'newValue1'
        });

        expect(this.map.reload).toHaveBeenCalled();
        this.map.reload.calls.reset();

        this.analysisModel.set({
          attribute2: 'newValue2'
        });

        expect(this.map.reload).toHaveBeenCalled();
        this.map.reload.calls.reset();

        this.analysisModel.set({
          attribute900: 'something'
        });

        expect(this.map.reload).not.toHaveBeenCalled();
      });
    });

    describe('on type change', function () {
      it('should unbind old params and bind new params', function () {
        spyOn(this.analysisModel, '_initBinds').and.callThrough();
        spyOn(this.analysisModel, 'unbind').and.callThrough();
        this.analysisModel.set('type', 'new!');
        expect(this.analysisModel.unbind).toHaveBeenCalled();
        expect(this.analysisModel._initBinds).toHaveBeenCalled();
      });

      it('should reload the map', function () {
        this.analysisModel.set('type', 'something');
        expect(this.map.reload).toHaveBeenCalled();
      });
    });
  });

  describe('.findAnalysisById', function () {
    it('should find a node in the graph', function () {
      var map = jasmine.createSpyObj('map', ['reload']);
      var fakeCamshaftReference = {
        getSourceNamesForAnalysisType: function (analysisType) {
          var map = {
            'analysis-type-1': ['source1', 'source2'],
            'analysis-type-2': [],
            'analysis-type-3': ['source3'],
            'analysis-type-4': []
          };
          return map[analysisType];
        },
        getParamNamesForAnalysisType: function (analysisType) {
          var map = {
            'analysis-type-1': ['a'],
            'analysis-type-2': [],
            'analysis-type-3': [],
            'analysis-type-4': ['a4']
          };

          return map[analysisType];
        }
      };

      var analysisFactory = new AnalysisFactory({
        map: map,
        analysisCollection: new Backbone.Collection(),
        camshaftReference: fakeCamshaftReference
      });
      var analysisModel = analysisFactory.analyse({
        id: 'a1',
        type: 'analysis-type-1',
        params: {
          a: 1,
          source1: {
            id: 'a2',
            type: 'analysis-type-2',
            params: {
              a2: 2
            }
          },
          source2: {
            id: 'a3',
            type: 'analysis-type-3',
            params: {
              source3: {
                id: 'a4',
                type: 'analysis-type-4',
                params: {
                  a4: 4
                }
              }
            }
          }
        }
      });

      expect(analysisModel.findAnalysisById('a1')).toEqual(analysisModel);
      expect(analysisModel.findAnalysisById('a2').get('id')).toEqual('a2');
      expect(analysisModel.findAnalysisById('a3').get('id')).toEqual('a3');
      expect(analysisModel.findAnalysisById('b9')).toBeUndefined();
    });
  });

  describe('.toJSON', function () {
    it('should serialize the graph', function () {
      var map = jasmine.createSpyObj('map', ['reload']);
      var fakeCamshaftReference = {
        getSourceNamesForAnalysisType: function (analysisType) {
          var map = {
            'analysis-type-1': ['source1', 'source2'],
            'analysis-type-2': [],
            'analysis-type-3': ['source3'],
            'analysis-type-4': []
          };
          return map[analysisType];
        },
        getParamNamesForAnalysisType: function (analysisType) {
          var map = {
            'analysis-type-1': ['a'],
            'analysis-type-2': ['a2'],
            'analysis-type-3': [],
            'analysis-type-4': ['a4']
          };

          return map[analysisType];
        }
      };

      var analysisFactory = new AnalysisFactory({
        map: map,
        analysisCollection: new Backbone.Collection(),
        camshaftReference: fakeCamshaftReference
      });
      var analysisModel = analysisFactory.analyse({
        id: 'a1',
        type: 'analysis-type-1',
        params: {
          a: 1,
          source1: {
            id: 'a2',
            type: 'analysis-type-2',
            params: {
              a2: 2
            }
          },
          source2: {
            id: 'a3',
            type: 'analysis-type-3',
            params: {
              source3: {
                id: 'a4',
                type: 'analysis-type-4',
                params: {
                  a4: 4
                }
              }
            }
          }
        }
      });

      expect(analysisModel.toJSON()).toEqual({
        id: 'a1',
        type: 'analysis-type-1',
        params: {
          a: 1,
          source1: {
            id: 'a2',
            type: 'analysis-type-2',
            params: {
              a2: 2
            }
          },
          source2: {
            id: 'a3',
            type: 'analysis-type-3',
            params: {
              source3: {
                id: 'a4',
                type: 'analysis-type-4',
                params: {
                  a4: 4
                }
              }
            }
          }
        }
      });
    });
  });
});
