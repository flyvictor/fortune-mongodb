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
  describe('Select', function(){
    describe('findMany', function(){
      it('should provide interface for selecting fields to return', function(done){
        var projection = {
          select: ['name']
        };
        (function(){
          adapter.findMany('person', {}, projection)
            .then(function(docs){
              should.exist(docs);
              done();
            });
        }).should.not.throw();
      });
      it('should select specified fields for a collection', function(done){
        var projection = {
          select: ['name']
        };
        adapter.findMany('person', {}, projection)
          .then(function(docs){
            //email is included behind the scenes to provide id
            (Object.keys(docs[0]).length).should.equal(2);
            should.exist(docs[0].name);
            should.exist(docs[0].id);
            done();
          });
      });
      it('should return all existing fields when no select is specified', function(done){
        adapter.findMany('person')
          .then(function(docs){
            (Object.keys(docs[0]).length).should.equal(4);
            done();
          });
      });
      it('should not affect business id selection', function(done){
        adapter.findMany('person', [ids.person[0]], {select: ['name']})
          .then(function(docs){
            (docs[0].id).should.equal(ids.person[0]);
            should.not.exist(docs[0].email);
            done();
          });
      });
      it('should apply be able to apply defaults for query and projection', function(done){
        (function(){
          adapter.findMany('person');
        }).should.not.throw();
        done();
      });
      it('should be able to work with numerical limits', function(done){
        (function(){
          adapter.findMany('person', 1)
            .then(function(docs){
              (docs.length).should.equal(1);
              done();
            });
        }).should.not.throw();
      });
    });
    describe('find', function(){
      it('should provide interface for selecting fields to return', function(done){
        var projection = {
          select: ['name']
        };
        (function(){
          adapter.find('person', {email: ids.person[0]}, projection)
            .then(function(docs){
              should.exist(docs);
              done();
            });
        }).should.not.throw();
      });
      it('should select specified fields for a single document', function(done){
        var projection = {
          select: ['name']
        };
        adapter.find('person', ids.person[0], projection)
          .then(function(doc){
            (Object.keys(doc).length).should.equal(2);
            should.exist(doc.name);
            done();
          });
      });
      it('should return all existing fields when no select is specified', function(done){
        adapter.find('person', ids.person[0])
          .then(function(doc){
            (Object.keys(doc).length).should.equal(4);
            done();
          });
      });
      it('should not affect business id selection', function(done){
        adapter.find('person', [ids.person[0]], {select: ['name']})
          .then(function(doc){
            (doc.id).should.equal(ids.person[0]);
            should.not.exist(doc.email);
            done();
          });
      });
      it('should apply be able to apply defaults for query and projection', function(done){
        (function(){
          adapter.find('person', ids.person[0]);
        }).should.not.throw();
        done();
      });
    });
  });
});
