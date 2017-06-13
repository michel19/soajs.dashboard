"use strict";
var assert = require("assert");
var helper = require("../../../../helper.js");
var utils = helper.requireModule('./lib/cloud/deploy/index.js');
var deploy;
var config = helper.requireModule('./config');
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
// BL.model.validateCustomId
var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateCustomId: function (soajs, id, cb) {
		return cb(null, id);
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

var deployer = helper.deployer;
var registry = {
	loadByEnv: function (options, cb) {
		// registry.serviceConfig.ports.maintenanceInc
		var data = {
			serviceConfig: {
				ports: {
					maintenanceInc: 5
				}
			}
		};
		return cb(null, data);
	},
	coreDB: {
		provision: {}
	}
};
var envRecord = {
	_id: '',
	code: 'DEV',
	dbs: {
		clusters: {
			clusterName: {
				credentials: {},
				"servers": [
					{
						"host": "localhost",
						"port": 9200
					}
				]
			}
		},
		config: {
			session: {
				cluster: "clusterName"
			}
		}
	},
	deployer: {
		"type": "container",
		"selected": "container.docker.local",
		"container": {
			"docker": {
				"local": {
					"socketPath": "/var/run/docker.sock"
				},
				"remote": {
					"nodes": ""
				}
			},
			"kubernetes": {
				"local": {
					"nginxDeployType": "",
					"namespace": {},
					"auth": {
						"token": ""
					}
				},
				"remote": {
					"nginxDeployType": "",
					"namespace": {},
					"auth": {
						"token": ""
					}
				}
			}
		}
	}
};

describe("testing deploy.js", function () {
	
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
				deploy = body;
				deploy.model = mongoStub;
				done();
			});
		});
		
	});
	
	// "deployService": function (config, soajs, registry, deployer, cbMain) {
	describe("deployService", function () {
		
		it("Success deployService. service", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var catalogRecord = {
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
								"SOAJS_SRV_AUTOREGISTERHOST": {
									"type": "static",
									"value": "true"
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
				};
				if (opts.collection === 'catalogs') {
					return cb(null, catalogRecord);
				}
				return cb(null, envRecord);
			};
			req.soajs.inputmaskData = {
				deployConfig: {
					replication: {
						mode: ""
					}
				},
				recipe: {
					_id: '123456'
				},
				custom: {}
			};
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'service';
			req.soajs.inputmaskData.serviceName = 'test';
			
			deploy.deployService(config, req.soajs, registry, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
});