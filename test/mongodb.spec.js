var should = require('should');

var adapter = require('../mongodb');
var init = require('./init');

var RSVP = require('rsvp');
var Promise = RSVP.Promise;
var _ = require('lodash');

RSVP.on('error', function(err){
  throw err;
});

describe('MongoDB adapter', function(){
  var ids = {
    person: [],
    car: [],
    pet: [],
    house: []
  };

  beforeEach(function(done){
    ids = {};
    init(function(results){
      _.each(results, function(item){
        var name = item[0];
        var doc = item[1];
        ids[name] = ids[name] || [];
        ids[name].push(doc.id);
      });
      done();
    });
  });

  describe('Relationships', function(){
    describe('synchronizing many-to-many', function(){
      it('should keep in sync many-to-many relationship', function(done){
        adapter.update('person', ids.person[0], {$pushAll: {houses: [ids.house[0]]}})

          .then(function(created){
            (created.links.houses[0].toString()).should.equal(ids.house[0].toString());
          }, done)

          .then(function(){
            return adapter.find('house', {id: ids.house[0]});
          }, done)

          .then(function(found){
            (found.links.owners[0]).should.equal(ids.person[0]);
            done();
          }, done);
      });
      it('should sync correctly when many docs have reference', function(done){
        var upd =  {
          $pushAll: {
            houses: ids.house
          }
        };
        adapter.update('person', ids.person[0], upd)

          //Prove successful initial association
          .then(function(updated){
            (updated.links.houses.length).should.eql(4);
            var refHouses = [];
            updated.links.houses.forEach(function(id){
              refHouses.push(id.toString());
            });
            return adapter.findMany('house', {owners: ids.person[0]});
          })

          .then(function(found){
            (found.length).should.equal(4);
            //Do some other updates to mix docs in Mongo
            return adapter.update('person', ids.person[1], {$push: {houses: ids.house[0]}});
          })

          //Kick him out the house
          .then(function(){
            return adapter.update('person', ids.person[0], {$pull: {houses: ids.house[0]}});
          })

          //Then assert related docs sync
          .then(function(pulled){
            //Now there should be only three houses that person[0] owns
            (pulled.links.houses.length).should.eql(3);
            return adapter.findMany('house', {owners: ids.person[0]})
          })
          .then(function(found){
            (found.length).should.eql(3);
            //Assert there's no house[0] in found docs
            found.forEach(function(item){
              (item.id.toString()).should.not.equal(ids.house[0].toString());
            });
            done();
          });
      });
    });
  });
});
