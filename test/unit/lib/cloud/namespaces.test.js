"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/cloud/namespaces.js');
var namespaces;
var config = {
	errors: {}
};
var req = {
	soajs: {
		registry: {
			coreDB: {
				provision: {}
			}
		},
		log: {
			debug: function (data) {
				console.log(data);
			},
			error: function (data) {
				console.log(data);
			},
			info: function (data) {
				console.log(data);
			}
		},
		inputmaskData: {}
	}
};
var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntries: function (soajs, opts, cb) {
		cb(null, []);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};

describe("testing namespaces.js", function () {

	describe("testing init", function () {

		it("No Model Requested", function (done) {
			utils.init(null, function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Model Name not found", function (done) {

			utils.init('anyName', function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Init", function (done) {

			utils.init('mongo', function (error, body) {
				assert.ok(body);
				namespaces = body;
				namespaces.model = mongoStub;
				done();
			});
		});

	});

	describe.skip("delete", function () {

		it("success", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					_id: '',
					code: 'DEV',
					deployer: {
						type: 'docker',
						selected: 'container.docker.local',
						container: {
							docker: {}, kubernetes: {}
						}
					}
				});
			};
			req.soajs.inputmaskData.env = 'dev';
			namespaces.delete(config, req.soajs, function (error, body) {
				// assert.ok(error);
				done();
			});
		});

	});
});