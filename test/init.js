var adapter = require('../mongodb');
var fixtures = require('./fixtures.json');
var _ = require('lodash');
var RSVP = require('rsvp');

module.exports = function(done){
  var options = {
    connectionString: '',
    host: 'localhost',
    port: '27017',
    db: 'fortune-mongodb'
  };
  adapter._init(options);
  adapter.db.once('connected', function(err){
    if (err) return done(err);
    var person = {
      name: String,
      appearances: Number,
      email: String,
      pets: ['pet'],
      soulmate: {ref: 'person', inverse: 'soulmate', pkType: String},
      lovers: [{ref: 'person', inverse: 'lovers', pkType: String}],
      externalResources: [{ ref: "externalResourceReference", pkType: String, external: true }],
      cars: [{ref:'car', pkType: String}],
      houses: [{ref: 'house', inverse: 'owners'}]
    };
    var pet = {
      name: String,
      appearances: Number,
      owner: {ref:'person', pkType: String}
    };
    var car = {
      licenseNumber: String,
      model: String,
      owner: {ref:'person', pkType: String},
      MOT: {ref: 'service', external: true, pkType: String},
      additionalDetails: {
        seats: Number
      }
    };
    var house = {
      address: String,
      owners: [{ref: 'person', inverse: 'houses', pkType: String}]
    };

    adapter.model('person', adapter.schema('person', person, {model: {pk: 'email'}}), {pk: 'email'});
    adapter.model('car', adapter.schema('car', car, {model: {pk: 'licenseNumber'}}), {pk: 'licenseNumber'});
    adapter.model('pet', adapter.schema('pet', pet));
    adapter.model('house', adapter.schema('house', house));
    dropDb().then(function(){
      loadData().then(function(results){
        done(results);
      }, function(err){
        console.error('failed to load data');
        throw err;
      });
    }, function(err){
      console.error('failed to drop data');
      throw err;
    });
  });
};

function loadData(){
  var promises = [];
  _.each(fixtures, function(data, modelName){
      //var Model = adapter._models[modelName];
    _.each(data, function(item){
      promises.push(new RSVP.Promise(function(resolve, reject){
        adapter.create(modelName, item).then(function(doc){
            resolve([modelName, doc]);
        }, reject);
      }));
    });
  });
  return RSVP.all(promises);
}

function dropDb(){
  var promises = [];
  _.each(fixtures, function(data, modelName){
    promises.push(adapter.delete(modelName));
  });
  return RSVP.all(promises);
}
