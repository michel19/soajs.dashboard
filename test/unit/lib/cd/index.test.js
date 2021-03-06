"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/cd/index.js');
var cd;
var config = helper.requireModule('./config.js');

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
	},
	insertEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};
var registry = {
	loadByEnv: function () {

	}
};
var deployer = {};

var req = {
	soajs: {
		registry: {
			coreDB: {
				provision: {}
			}
		},
		log: {
			debug: function (data) {

			},
			error: function (data) {

			},
			info: function (data) {

			}
		},
		inputmaskData: {}
	}
};

var helpers = {
	checkRecordConfig: function (req, envs, record, cb) {
		var servicesList = [{
			id: 'gzquhel9wdcrfhvpimj9r6g7o',
			mode: 'replicated',
			repo: 'soajs.controller',
			envRecord: {
				_id: 'd7e01ab1688c',
				code: 'DEV',
				locked: true,
				description: 'this is the DEV environment',
				services: {},
				profile: '/opt/soajs/node_modules/soajs.dashboard/test/integration/../profiles/profile.js'
			},
			service: {
				id: 'gzquhel9wdcrfhvpimj9r6g7o',
				version: 12998,
				name: 'dev-controller',
				labels: {},
				env: {},
				ports: [],
				tasks: {},
				repo: 'soajs.controller',
				branch: 'master'
			},
			branch: 'master',
			strategy: 'update'
		}];
		return cb(null, servicesList);
	},
	processOneService: function (req, BL, oneService, deployer, options, callback) {
		return callback();
	},
	getEnvsServices: function (envs, req, deployer, BL, fcb) {
		var envsSample = [
			{
				record: {
					_id: '8b4026e511807397f8228f4',
					code: 'DASHBOARD',
					locked: true,
					description: 'this is the Dashboard environment',
					profile: '/opt/soajs/FILES/profiles/profile.js',
					domain: 'soajs.org',
					port: 80
				},
				services: []
			},
			{
				record: {
					_id: 'd7e01ab1688c',
					code: 'DEV',
					locked: true,
					description: 'this is the DEV environment',
					deployer: {},
					dbs: {},
					services: {},
					profile: '/opt/soajs/node_modules/soajs.dashboard/test/integration/../profiles/profile.js'
				},
				services: []
			},
			{
				record: {
					_id: '5d32fab2f9ca5',
					code: 'STG',
					description: 'this is the DEV environment',
					profile: '/opt/soajs/node_modules/soajs.dashboard/test/integration/../profiles/profile.js'
				},
				services: []
			}
		];
		return fcb(null, envsSample);
	},
	doesServiceHaveUpdates: function (req, config, updateList, oneService, catalogs, images, cb) {
		return cb(null, true);
	},
	getLatestSOAJSImageInfo: function (config, cb) {
		var images = [];
		return cb(null, images);
	},
	getServices: function (config, req, deployer, {}, cb) {
		var services = [
			{
				_id: '1'
			}
		];
		return cb(null, services);
	},
	callDeployer: function (config, req, registry, deployer, opName, cb) {
		return cb(null, true);
	},
	processUndeployedServices: function(req, deployedServices, allServices, cdRecordWithEnvRecords, cb){
		return cb(null, true);
	}
};

describe("testing services.js", function () {
	before(() => {
	});
	after(() => {
	});

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

		it("Init model", function (done) {
			utils.init('mongo', function (error, body) {
				assert.ok(body);
				cd = body;
				cd.model = mongoStub;
				done();
			});
		});

	});

	describe("testing updateRepoSettings", function () {

		it("Success with id", function (done) {
			req.soajs.inputmaskData = {
				data: {
					id: '12345',
					serviceVersion: 1
				}
			};
			cd.cdAction(config, registry, req, deployer, helpers, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("Success", function (done) {
			req.soajs.inputmaskData = {
				data: {
					env: 'dev',
					action: 'rebuild',
					mode: 'replicated',
					serviceId: 'q6421qyr7q95tmoelykdqsgj6',
					serviceName: 'dev-urac-v1',
					serviceVersion: 1
				}
			};
			cd.cdAction(config, registry, req, deployer, helpers, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("Success without serviceVersion", function (done) {
			req.soajs.inputmaskData = {
				data: {
					env: 'dev',
					action: 'rebuild',
					mode: 'replicated',
					serviceId: 'q6421qyr7q95tmoelykdqsgj6',
					serviceName: 'dev-urac-v1'
				}
			};
			cd.cdAction(config, registry, req, deployer, helpers, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

	});

	describe("testing getLedger", function () {

		it("Success", function (done) {
			req.soajs.inputmaskData = {
				start: 1,
				env: 'dev'
			};
			cd.getLedger(config, req, helpers, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

	});

	describe("testing getUpdates", function () {

		it("Success getUpdates", function (done) {
			mongoStub.findEntries = function (soajs, opts, cb) {
				var records = [
					{
						"_id": '12',
						"name": "serviceCatalog",
						"type": "soajs",
						"description": "This is a test catalog for deploying service instances",
						"recipe": {
							"deployOptions": {
								"image": {
									"prefix": "soajstest",
									"name": "soajs",
									"tag": "latest"
								}
							},
							"buildOptions": {
								"settings": {
									"accelerateDeployment": true
								},
								"env": {
									"SOAJS_GIT_TOKEN": {
										"type": "computed",
										"value": "$SOAJS_GIT_TOKEN"
									},
									"SOAJS_DEPLOY_HA": {
										"type": "computed",
										"value": "$SOAJS_DEPLOY_HA"
									},
									"SOAJS_HA_NAME": {
										"type": "computed",
										"value": "$SOAJS_HA_NAME"
									},
									"SOAJS_MONGO_PORT": {
										"type": "computed",
										"value": "$SOAJS_MONGO_PORT_N"
									}
								},
								"cmd": {
									"deploy": {
										"command": [
											"bash",
											"-c"
										],
										"args": [
											"node index.js -T service"
										]
									}
								}
							}
						}
					}];
				return cb(null, records);
			};
			req.soajs.inputmaskData = {};
			cd.getUpdates(config, req, deployer, helpers, {}, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

	describe("testing cdDeploy", function () {

		it.skip("Success cdDeploy", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'cicd') {
					var records = {
						_id: '592806440e',
						provider: 'travis',
						domain: 'api.travis-ci.org',
						owner: 'soajs',
						gitToken: 'aaaabbbb',
						ciToken: 'abcd1234',
						type: 'account'
					};
					return cb(null, records);
				}
				cb(null, null);
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
			// 	if (opts.collection === 'cicd') {
			// 		var record = {
			// 			"_id": '5928052b61',
			// 			"DEV": {
			// 				"branch": "master",
			// 				"strategy": "notify",
			// 				"controller": {
			// 					"branch": "master",
			// 					"strategy": "update",
			// 					"v2": {
			// 						"branch": "master",
			// 						"strategy": "notify"
			// 					}
			// 				}
			// 			},
			// 			"type": "cd"
			// 		};
			// 		return cb(null, record);
			// 	}
				cb(null, []);
			};

			req.soajs.inputmaskData = {
				deploy_token: "aaaabbbb"
			};
			cd.cdDeploy(config, req, registry, deployer, helpers, function (error, body) {
				console.log(error ,body);
				assert.ok(body);
				done();
			});
		});

	});

	describe("testing markRead", function () {

		it("Success markRead by id", function (done) {
			req.soajs.inputmaskData = {
				data: {
					id: '1'
				}
			};
			cd.markRead(config, req, helpers, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("Success markRead all", function (done) {
			req.soajs.inputmaskData = {
				data: {
					all: '1'
				}
			};
			cd.markRead(config, req, helpers, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

	});

	describe("testing saveConfig", function () {

		it("Success saveConfig", function (done) {
			req.soajs.inputmaskData = {
				config: {
					env: 'DEV',
					serviceName: 'testSrv'
				}
			};
			cd.saveConfig(config, req, helpers, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

});
