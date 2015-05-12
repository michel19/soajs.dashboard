'use strict';
var soajs = require('soajs');
var request = require('request');

var Mongo = soajs.mongo;

var config = require('./config.js');
var environment = require('./environment.js');
var product = require('./product.js');
var tenant = require('./tenant.js');
var host = require("./host.js");

var mongo = null;

var service = new soajs.server.service({
	"oauth": false,
	"session": true,
	"security": true,
	"multitenant": true,
	"acl": true,
	"config": config
});

function checkForMongo(req) {
	if(!mongo) {
		mongo = new Mongo(req.soajs.registry.coreDB.provision);
	}
}

function checkMyAccess(req, res, cb) {
	if(!req.soajs.session || !req.soajs.session.getUrac()) {
		res.jsonp(req.soajs.buildResponse({"code": 601, "msg": config.errors[601]}));
	}
	var myTenant = req.soajs.session.getUrac().tenant;
	if(!myTenant || !myTenant.id) {
		return res.jsonp(req.soajs.buildResponse({"code": 608, "msg": config.errors[608]}));
	}
	else {
		req.soajs.inputmaskData.id = myTenant.id.toString();
		return cb();
	}
}

service.init(function() {
	service.post("/environment/add", function(req, res) {
		checkForMongo(req);
		environment.add(config, mongo, req, res);
	});
	service.get("/environment/delete", function(req, res) {
		checkForMongo(req);
		environment.delete(config, mongo, req, res);
	});
	service.post("/environment/update", function(req, res) {
		checkForMongo(req);
		environment.update(config, mongo, req, res);
	});
	service.get("/environment/list", function(req, res) {
		checkForMongo(req);
		environment.list(config, mongo, req, res);
	});

	service.get("/environment/dbs/list", function(req, res) {
		checkForMongo(req);
		environment.listDbs(config, mongo, req, res);
	});
	service.get("/environment/dbs/delete", function(req, res) {
		checkForMongo(req);
		environment.deleteDb(config, mongo, req, res);
	});
	service.post("/environment/dbs/add", function(req, res) {
		checkForMongo(req);
		environment.addDb(config, mongo, req, res);
	});
	service.post("/environment/dbs/update", function(req, res) {
		checkForMongo(req);
		environment.updateDb(config, mongo, req, res);
	});

	service.post("/environment/dbs/updatePrefix", function(req, res) {
		checkForMongo(req);
		environment.updateDbsPrefix(config, mongo, req, res);
	});

	service.post("/environment/clusters/add", function(req, res) {
		checkForMongo(req);
		environment.addCluster(config, mongo, req, res);
	});
	service.get("/environment/clusters/delete", function(req, res) {
		checkForMongo(req);
		environment.deleteCluster(config, mongo, req, res);
	});
	service.post("/environment/clusters/update", function(req, res) {
		checkForMongo(req);
		environment.updateCluster(config, mongo, req, res);
	});
	service.get("/environment/clusters/list", function(req, res) {
		checkForMongo(req);
		environment.listClusters(config, mongo, req, res);
	});


	service.post("/product/add", function(req, res) {
		checkForMongo(req);
		product.add(config, mongo, req, res);
	});
	service.get("/product/delete", function(req, res) {
		checkForMongo(req);
		product.delete(config, mongo, req, res);
	});
	service.post("/product/update", function(req, res) {
		checkForMongo(req);
		product.update(config, mongo, req, res);
	});
	service.get("/product/list", function(req, res) {
		checkForMongo(req);
		product.list(config, mongo, req, res);
	});
	service.get("/product/get", function(req, res) {
		checkForMongo(req);
		product.get(config, mongo, req, res);
	});

	service.get("/product/packages/get", function(req, res) {
		checkForMongo(req);
		product.getPackage(config, mongo, req, res);
	});
	service.get("/product/packages/list", function(req, res) {
		checkForMongo(req);
		product.listPackage(config, mongo, req, res);
	});
	service.post("/product/packages/add", function(req, res) {
		checkForMongo(req);
		product.addPackage(config, mongo, req, res);
	});
	service.post("/product/packages/update", function(req, res) {
		checkForMongo(req);
		product.updatePackage(config, mongo, req, res);
	});
	service.get("/product/packages/delete", function(req, res) {
		checkForMongo(req);
		product.deletePackage(config, mongo, req, res);
	});

	service.post("/tenant/add", function(req, res) {
		checkForMongo(req);
		tenant.add(config, mongo, req, res);
	});
	service.get("/tenant/delete", function(req, res) {
		checkForMongo(req);
		tenant.delete(config, mongo, req, res);
	});
	service.get("/tenant/list", function(req, res) {
		checkForMongo(req);
		tenant.list(config, mongo, req, res);
	});
	service.post("/tenant/update", function(req, res) {
		checkForMongo(req);
		tenant.update(config, mongo, req, res);
	});
	service.get("/tenant/get", function(req, res) {
		checkForMongo(req);
		tenant.get(config, mongo, req, res);
	});

	service.get("/tenant/oauth/list", function(req, res) {
		checkForMongo(req);
		tenant.getOAuth(config, mongo, req, res);
	});
	service.post("/tenant/oauth/add", function(req, res) {
		checkForMongo(req);
		tenant.saveOAuth(config, 425, 'tenant OAuth add successful', mongo, req, res);
	});
	service.post("/tenant/oauth/update", function(req, res) {
		checkForMongo(req);
		tenant.saveOAuth(config, 426, 'tenant OAuth update successful', mongo, req, res);
	});
	service.get("/tenant/oauth/delete", function(req, res) {
		checkForMongo(req);
		tenant.deleteOAuth(config, mongo, req, res);
	});

	service.get("/tenant/oauth/users/list", function(req, res) {
		checkForMongo(req);
		tenant.getOAuthUsers(config, mongo, req, res);
	});
	service.get("/tenant/oauth/users/delete", function(req, res) {
		checkForMongo(req);
		tenant.deleteOAuthUsers(config, mongo, req, res);
	});
	service.post("/tenant/oauth/users/add", function(req, res) {
		checkForMongo(req);
		tenant.addOAuthUsers(config, mongo, req, res);
	});
	service.post("/tenant/oauth/users/update", function(req, res) {
		checkForMongo(req);
		tenant.updateOAuthUsers(config, mongo, req, res);
	});

	service.get("/tenant/application/list", function(req, res) {
		checkForMongo(req);
		tenant.listApplication(config, mongo, req, res);
	});
	service.post("/tenant/application/add", function(req, res) {
		checkForMongo(req);
		tenant.addApplication(config, mongo, req, res);
	});
	service.post("/tenant/application/update", function(req, res) {
		checkForMongo(req);
		tenant.updateApplication(config, mongo, req, res);
	});
	service.get("/tenant/application/delete", function(req, res) {
		checkForMongo(req);
		tenant.deleteApplication(config, mongo, req, res);
	});

	service.post("/tenant/application/acl/get", function(req, res) {
		checkForMongo(req);
		tenant.getTenantApplAclByExtKey(config, mongo, req, res);
	});
	service.post("/tenant/application/key/add", function(req, res) {
		checkForMongo(req);
		tenant.createApplicationKey(config, mongo, req, res);
	});
	service.get("/tenant/application/key/list", function(req, res) {
		checkForMongo(req);
		tenant.getApplicationKeys(config, mongo, req, res);
	});
	service.get("/tenant/application/key/delete", function(req, res) {
		checkForMongo(req);
		tenant.deleteApplicationKey(config, mongo, req, res);
	});

	service.get("/tenant/application/key/ext/list", function(req, res) {
		checkForMongo(req);
		tenant.listApplicationExtKeys(config, mongo, req, res);
	});
	service.post("/tenant/application/key/ext/add", function(req, res) {
		checkForMongo(req);
		tenant.addApplicationExtKeys(config, mongo, req, res);
	});
	service.post("/tenant/application/key/ext/update", function(req, res) {
		checkForMongo(req);
		tenant.updateApplicationExtKeys(config, mongo, req, res);
	});
	service.post("/tenant/application/key/ext/delete", function(req, res) {
		checkForMongo(req);
		tenant.deleteApplicationExtKeys(config, mongo, req, res);
	});

	service.post("/tenant/application/key/config/update", function(req, res) {
		checkForMongo(req);
		tenant.updateApplicationConfig(config, mongo, req, res);
	});
	service.get("/tenant/application/key/config/list", function(req, res) {
		checkForMongo(req);
		tenant.listApplicationConfig(config, mongo, req, res);
	});
	service.get("/tenant/permissions/get", function(req, res) {
		checkForMongo(req);
		tenant.injectTenantACL(config, mongo, req, res);
	});
	
	service.get("/hosts/list", function(req, res) {
		checkForMongo(req);
		host.list(config, mongo, req, res);
	});
	service.get("/hosts/delete", function(req, res) {
		checkForMongo(req);
		host.delete(config, mongo, req, res);
	});
	service.post("/hosts/maintenanceOperation", function(req, res) {
		checkForMongo(req);
		host.maintenanceOperation(config, mongo, req, res);
	});

	service.post("/services/list", function(req, res) {
		checkForMongo(req);
		var colName = 'services';
		var criteria = ((req.soajs.inputmaskData.serviceNames) && (req.soajs.inputmaskData.serviceNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.serviceNames}} : {};
		mongo.find(colName, criteria, function(err, records) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }
			return res.jsonp(req.soajs.buildResponse(null, records));
		});
	});
	service.post("/services/update", function(req, res) {
		checkForMongo(req);
		var set = {
			'$set': {
				"extKeyRequired": req.soajs.inputmaskData.extKeyRequired || false,
				"requestTimeout": req.soajs.inputmaskData.requestTimeout || null,
				"requestTimeoutRenewal": req.soajs.inputmaskData.requestTimeoutRenewal || null
			}
		};
		mongo.update('services', {'name': req.soajs.inputmaskData.name}, set, {'upsert': false, 'safe': true}, function(err, data) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]})); }
			if(data === 0) { return res.jsonp(req.soajs.buildResponse({"code": 604, "msg": config.errors[604]})); }
			return res.jsonp(req.soajs.buildResponse(null, "service updated successfully."));
		});
	});
	
	service.post("/settings/tenant/update", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.update(config, mongo, req, res);
		});
	});
	service.get("/settings/tenant/get", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.get(config, mongo, req, res);
		});
	});

	service.get("/settings/tenant/oauth/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.getOAuth(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/oauth/add", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.saveOAuth(config, 425, 'tenant OAuth add successful', mongo, req, res);
		});
	});
	service.post("/settings/tenant/oauth/update", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.saveOAuth(config, 426, 'tenant OAuth update successful', mongo, req, res);
		});
	});
	service.get("/settings/tenant/oauth/delete", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.deleteOAuth(config, mongo, req, res);
		});
	});

	service.get("/settings/tenant/oauth/users/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.getOAuthUsers(config, mongo, req, res);
		});
	});
	service.get("/settings/tenant/oauth/users/delete", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.deleteOAuthUsers(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/oauth/users/add", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.addOAuthUsers(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/oauth/users/update", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.updateOAuthUsers(config, mongo, req, res);
		});
	});

	service.get("/settings/tenant/application/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.listApplication(config, mongo, req, res);
		});
	});

	service.post("/settings/tenant/application/key/add", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.createApplicationKey(config, mongo, req, res);
		});
	});
	service.get("/settings/tenant/application/key/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.getApplicationKeys(config, mongo, req, res);
		});
	});
	service.get("/settings/tenant/application/key/delete", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.deleteApplicationKey(config, mongo, req, res);
		});
	});

	service.get("/settings/tenant/application/key/ext/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.listApplicationExtKeys(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/application/key/ext/add", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.addApplicationExtKeys(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/application/key/ext/update", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.updateApplicationExtKeys(config, mongo, req, res);
		});
	});
	service.post("/settings/tenant/application/key/ext/delete", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.deleteApplicationExtKeys(config, mongo, req, res);
		});
	});

	service.post("/settings/tenant/application/key/config/update", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.updateApplicationConfig(config, mongo, req, res);
		});
	});
	service.get("/settings/tenant/application/key/config/list", function(req, res) {
		checkForMongo(req);
		checkMyAccess(req, res, function() {
			tenant.listApplicationConfig(config, mongo, req, res);
		});
	});

	service.start();
});