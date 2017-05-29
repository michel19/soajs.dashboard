'use strict';

var fs = require("fs");
var async = require("async");
var request = require("request");
var deployer = require("soajs").drivers;
var shortid = require('shortid');

var utils = require("../../utils/utils.js");
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

var colls = {
	git: 'git_accounts',
	services: 'services',
	daemons: 'daemons',
	staticContent: 'staticContent',
	catalog: 'catalogs'
};

/**
 * Get activated git record from data store
 *
 * @param {Object} soajs
 * @param {Object} repo
 * @param {Callback Function} cb
 */
function getGitRecord(soajs, repo, cb) {
	var opts = {
		collection: colls.git,
		conditions: {'repos.name': repo},
		fields: {
			provider: 1,
			domain: 1,
			token: 1,
			'repos.$': 1
		}
	};

	BL.model.findEntry(soajs, opts, cb);
}

/**
 * map computed env variables into catalog recipe env variables
 * @param context
 * @param soajs
 * @param config
 * @param cb
 * @returns {*}
 */
function computeCatalogEnvVars(context, soajs, config, cb) {
	// context.catalog.recipe.buildOptions.env <- read environment variables config
	// context.variables <- replace computed values from this object
	// context.serviceParams.variables <- push final list of values to this array

	if (!context.catalog.recipe.buildOptions || !context.catalog.recipe.buildOptions.env || Object.keys(context.catalog.recipe.buildOptions.env).length === 0) {
		return cb(null, []);
	}

	var catalogEnvs = Object.keys(context.catalog.recipe.buildOptions.env);
	async.concat(catalogEnvs, function (oneEnvName, callback) {
		var oneEnv = context.catalog.recipe.buildOptions.env[oneEnvName];
		var result = [];

		// if env variable is of type static, just set its value and return
		if (oneEnv.type === 'static') {
			result.push(oneEnvName + '=' + oneEnv.value);
		}
		// if env variable is of type userInput, get value from request body, if not found see use default value
		else if (oneEnv.type === 'userInput') {
			var value = null;
			// first set to default value if found
			if (oneEnv.default) value = oneEnv.default;

			// if user specified value in request body, overwrite default with the new value
			if (soajs.inputmaskData.custom &&
				soajs.inputmaskData.custom.env &&
				soajs.inputmaskData.custom.env[oneEnvName]) {
				value = soajs.inputmaskData.custom.env[oneEnvName];
			}

			if (value) result.push(oneEnvName + '=' + value);
			else return callback({type: 'userInput', name: oneEnvName});
		}
		else if (oneEnv.type === 'computed') {
			// if computed value is dynamic, collect all applicable values and set them
			if (config.HA.dynamicCatalogVariables.indexOf(oneEnv.value) !== -1) {
				var nVariableName = oneEnv.value.replace(/_N$/, ''), nCount = 1;
				var regex = new RegExp(nVariableName.replace("$", "\\$") + '_[0-9]+');
				Object.keys(context.variables).forEach(function (oneVar) {
					if (oneVar.match(regex)) {
						result.push(oneEnvName + '_' + nCount++ + '=' + context.variables[oneVar]);
					}
				});
			}
			else {
				if (oneEnv.value && context.variables[oneEnv.value]) {
					result.push(oneEnvName + '=' + context.variables[oneEnv.value]);
				}
			}
		}

		return callback(null, result);
	}, cb);
}

/**
 * Get environment record and extract cluster information from it
 *
 * @param {Object} soajs
 * @param {Callback Function} cb
 */
function getDashDbInfo(soajs, cb) {
	utils.getEnvironment(soajs, BL.model, 'DASHBOARD', function (error, envRecord) {
		if (error) {
			return cb(error);
		}

		var clusterName = envRecord.dbs.config.session.cluster;
		var data = {
			mongoDbs: envRecord.dbs.clusters[clusterName].servers,
			mongoCred: envRecord.dbs.clusters[clusterName].credentials,
			clusterInfo: envRecord.dbs.clusters[clusterName],
			dbConfig: envRecord.dbs.config
		};
		return cb(null, data);
	});
}

/**
 * function that calls the drivers and deploys a service/container
 *
 * @param {Object} config
 * @param {Object} opts
 * @param {Object} soajs
 * @param {Object} registry
 * @param {Response} res
 *
 */
function deployContainer(config, context, soajs, res, cbMain) {
	// console.log(JSON.stringify(context, null, 2));

	var options = context.options;
	var platform = context.platform;

	function verifyReplicationMode(soajs) {
		if (soajs.inputmaskData.deployConfig.isKubernetes) {
			if (soajs.inputmaskData.deployConfig.replication.mode === 'replicated') return "deployment";
			else if (soajs.inputmaskData.deployConfig.replication.mode === 'global') return "daemonset";
			else return soajs.inputmaskData.deployConfig.replication.mode
		}

		return soajs.inputmaskData.deployConfig.replication.mode
	}

	function createService(cb) {
		options.params = context.serviceParams;
		soajs.log.debug("Creating service with deployer: " + JSON.stringify(options.params));
		deployer.deployService(options, function (error, data) {
			utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, cb);
		});
	}

	function rebuildService(cb) {
		options.params = {
			id: soajs.inputmaskData.serviceId,
			mode: soajs.inputmaskData.mode, //NOTE: only required for kubernetes driver
			action: soajs.inputmaskData.action,
			newBuild: context.serviceParams
		};

		soajs.log.debug("Rebuilding service with deployer: " + JSON.stringify(options.params));
		deployer.redeployService(options, function (error) {
			utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, cb);
		});
	}

	function buildAvailableVariables() {
		var variables = {
			'$SOAJS_ENV': context.envRecord.code.toLowerCase(),
			'$SOAJS_DEPLOY_HA': '$SOAJS_DEPLOY_HA', // field computed at the driver level
			'$SOAJS_HA_NAME': '$SOAJS_HA_NAME' // field computed at the driver level
		};

		for (var i in context.variables) {
			variables[i] = context.variables[i];
		}

		return variables;
	}

	function constructDeployerParams(serviceName) {
		if (!soajs.inputmaskData.action || soajs.inputmaskData.action !== 'rebuild') {
			//settings replication is only applicable in deploy operations, not when rebuilding
			soajs.inputmaskData.deployConfig.replication.mode = verifyReplicationMode(soajs);
		}

		var image = '';
		if (context.catalog.recipe.deployOptions.image.prefix) image += context.catalog.recipe.deployOptions.image.prefix + '/';
		image += context.catalog.recipe.deployOptions.image.name;
		if (context.catalog.recipe.deployOptions.image.tag) image += ':' + context.catalog.recipe.deployOptions.image.tag;

		if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.image && soajs.inputmaskData.custom.image.name) {
			image = '';
			if (soajs.inputmaskData.custom.image.prefix) image += soajs.inputmaskData.custom.image.prefix + '/';
			image += soajs.inputmaskData.custom.image.name;
			if (soajs.inputmaskData.custom.image.tag) image += ':' + soajs.inputmaskData.custom.image.tag;
		}

		var serviceParams = {
			"env": context.envRecord.code.toLowerCase(),
			"id": serviceName.toLowerCase(),
			"name": serviceName.toLowerCase(),
			"image": image,
			"imagePullPolicy": context.catalog.recipe.deployOptions.image.pullPolicy || '',
			"labels": {
				"soajs.env.code": context.envRecord.code.toLowerCase(),
				"soajs.service.mode": (soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.mode : null, //replicated || global for swarm, deployment || daemonset for kubernetes
				"soajs.catalog.id": context.catalog._id.toString()
			},
			"memoryLimit": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.memoryLimit : null),
			"replication": {
				"mode": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.mode : null)
			},
			"version": parseFloat(soajs.inputmaskData.custom.version) || 1,
			"containerDir": config.imagesDir,
			"restartPolicy": {
				"condition": "any",
				"maxAttempts": 5
			},
			"network": ((platform === 'docker') ? config.network : ''),
			"ports": context.ports
		};

		if(context.catalog.v){
			serviceParams.labels["soajs.catalog.v"] = context.catalog.v.toString();
		}

		for (var oneLabel in context.labels) {
			serviceParams.labels[oneLabel] = context.labels[oneLabel];
		}

		//Add readiness probe configuration if present, only for kubernetes deployments
		if (platform === 'kubernetes' && context.catalog.recipe && context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.readinessProbe) {
			serviceParams.readinessProbe = context.catalog.recipe.deployOptions.readinessProbe;
		}

		//Add replica count in case of docker replicated service or kubernetes deployment
		if (soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.replication.replicas) {
			serviceParams.replication.replicas = soajs.inputmaskData.deployConfig.replication.replicas;
		}

		//Override the default docker network of the user wants to use a custom overlay network
		if (platform === 'docker' && context.catalog.recipe.deployOptions.container && context.catalog.recipe.deployOptions.container.network) {
			serviceParams.network = context.catalog.recipe.deployOptions.container.network;
		}

		//Override the default container working directory if the user wants to set a custom path
		if (context.catalog.recipe.deployOptions.container && context.catalog.recipe.deployOptions.container.workingDir) {
			serviceParams.containerDir = context.catalog.recipe.deployOptions.container.workingDir;
		}

		//Override the default container restart policy if set
		if (context.catalog.recipe.deployOptions.restartPolicy) {
			serviceParams.restartPolicy.condition = context.catalog.recipe.deployOptions.restartPolicy.condition;
			if (context.catalog.recipe.deployOptions.restartPolicy.maxAttempts) {
				serviceParams.restartPolicy.maxAttempts = context.catalog.recipe.deployOptions.restartPolicy.maxAttempts;
			}
		}

		//Add the commands to execute when running the containers
		if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd && context.catalog.recipe.buildOptions.cmd.deploy && context.catalog.recipe.buildOptions.cmd.deploy.command) {
			serviceParams.command = context.catalog.recipe.buildOptions.cmd.deploy.command;
		}

		//Add the command arguments
		if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd && context.catalog.recipe.buildOptions.cmd.deploy && context.catalog.recipe.buildOptions.cmd.deploy.args) {
			serviceParams.args = context.catalog.recipe.buildOptions.cmd.deploy.args;
		}

		//If a service requires to run cmd commands before starting, get them from service record and add them
		if (serviceParams.command && context.serviceCmd) {
			if (!serviceParams.args) {
				serviceParams.args = [];
			}

			serviceParams.args = context.serviceCmd.concat(serviceParams.args);
			serviceParams.args = serviceParams.args.join(";");
			serviceParams.args = [serviceParams.args];

		}

		//Add the user-defined volumes if any
		if (context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.voluming) {
			serviceParams.voluming = context.catalog.recipe.deployOptions.voluming || {};
		}

		return serviceParams;
	}

	context.serviceParams = constructDeployerParams(context.name);
	context.variables = buildAvailableVariables();

	computeCatalogEnvVars(context, soajs, config, function (error, variables) {
		if (error) {
			var errorMessage = config.errors[911];
			errorMessage = errorMessage.replace('%ENV_NAME%', error.name);
			errorMessage = errorMessage.replace('%ENV_TYPE%', error.type);
			return cbMain({code: 911, msg: errorMessage});
		}

		context.serviceParams.variables = variables;
		if(soajs.inputmaskData.action && soajs.inputmaskData.action === 'analytics'){
			return cbMain(null, context.serviceParams)
		}
		if (!soajs.inputmaskData.action || soajs.inputmaskData.action !== 'rebuild') {
			createService(function () {
				return cbMain(null, true);
			});
		}
		else {
			rebuildService(function () {
				return cbMain(null, true);
			});
		}
	});
}

var BL = {
	model: null,

	/**
	 * Deploy a new SOAJS service of type [ nginx || controller || service || daemon ], routes to specific function
	 *
	 * @param {Response Object} res
	 */
	"deployService": function (config, soajs, registry, res, cbMain) {
		var context = {
			env: soajs.inputmaskData.env.toUpperCase(),
			envRecord: {},
			catalog: {},
			ports: {},
			variables: {},
			name: '',
			origin: ''
		};
		var options = {};

		function getEnvInfo(cb) {
			//from envCode, load env, get port and domain
			utils.getEnvironment(soajs, BL.model, context.env.toUpperCase(), function (error, envRecord) {
				utils.checkErrorReturn(soajs, cbMain, {config: config, error: error || !envRecord, code: 600}, function () {
					utils.checkErrorReturn(soajs, cbMain, {
						config: config,
						error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
						code: 743
					}, function () {
						context.envRecord = envRecord;
						context.variables['$SOAJS_NX_DOMAIN'] = context.envRecord.domain;
						context.variables['$SOAJS_NX_SITE_DOMAIN'] = context.envRecord.sitePrefix + "." + context.envRecord.domain;
						context.variables['$SOAJS_NX_API_DOMAIN'] = context.envRecord.apiPrefix + "." + context.envRecord.domain;
						context.variables['$SOAJS_PROFILE'] = context.envRecord.profile;
						options = utils.buildDeployerOptions(context.envRecord, soajs, BL);
						return cb();
					});
				});
			});
		}

		function getCatalogRecipe(cb) {
			BL.model.validateCustomId(soajs, soajs.inputmaskData.recipe, function (error, recipeId) {
				utils.checkErrorReturn(soajs, cbMain, {config: config, error: error || !recipeId, code: 701}, function () {
					var opts = {
						collection: colls.catalog,
						conditions: {_id: recipeId}
					};

					BL.model.findEntry(soajs, opts, function (error, catalogRecord) {
						utils.checkErrorReturn(soajs, cbMain, {config: config, error: error, code: 600}, function () {
							utils.checkErrorReturn(soajs, cbMain, {
								config: config,
								error: !catalogRecord,
								code: 950
							}, function () {

								if (catalogRecord.recipe.buildOptions && catalogRecord.recipe.buildOptions.settings && catalogRecord.recipe.buildOptions.settings.accelerateDeployment) {
									catalogRecord.recipe.buildOptions.env['SOAJS_DEPLOY_ACC'] = {
										"type": "static",
										"value": "true"
									};
								}

								//If user wants to use local SOAJS package inside the image, add the option to the deployer params
								if (catalogRecord.recipe.buildOptions && catalogRecord.recipe.buildOptions.settings && catalogRecord.recipe.buildOptions.settings.accelerateDeployment) {
									context.variables['$SOAJS_DEPLOY_ACC'] = 'true';
								}

								context.catalog = catalogRecord;
								context.ports = context.catalog.recipe.deployOptions.ports
								return cb();
							});
						});
					});
				});
			});
		}

		function checkPort(cb) {
			var deployType = context.envRecord.deployer.selected.split('.')[1];
			if (deployType !== 'kubernetes') {
				return cb();
			}

			if (!context.catalog.recipe.deployOptions || !context.catalog.recipe.deployOptions.ports || context.catalog.recipe.deployOptions.ports.length === 0) {
				return cb();
			}

			var ports = context.catalog.recipe.deployOptions.ports;
			async.each(ports, function (onePort, callback) {
				if (!onePort.published) {
					return callback();
				}

				if (onePort.published < config.kubeNginx.minPort || onePort.published > config.kubeNginx.maxPort) {
					return callback({wrongPort: onePort});
				}

				return callback();
			}, function (error) {
				if (error && error.wrongPort) {
					var errMsg = config.errors[824];
					errMsg = errMsg.replace("%PORTNUMBER%", error.wrongPort.published);
					errMsg = errMsg.replace("%MINNGINXPORT%", config.kubeNginx.minPort);
					errMsg = errMsg.replace("%MAXNGINXPORT%", config.kubeNginx.maxPort);
					return cbMain({"code": 824, "msg": errMsg});
				}
				else {
					async.map(ports, function (onePort, callback) {
						// Increment all exposed port by 30000 to be in the port range of kubernetes exposed ports
						// NOTE: It's better to leave it for the user to set the proper ports
						if (onePort.published) {
							onePort.published += 30000;
						}

						return callback(null, onePort)
					}, function (error, updatedPorts) {
						//No error to be handled
						context.ports = context.catalog.recipe.deployOptions.ports = updatedPorts;
						return cb();
					});
				}
			});
		}

		function getControllerDomain(cb) {
			var getControllers = false;
			if(context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env){
				for (var env in context.catalog.recipe.buildOptions.env) {
					if (context.catalog.recipe.buildOptions.env[env].value === '$SOAJS_NX_CONTROLLER_NB') {
						getControllers = true;
					}
				}
			}

			if (getControllers) {
				options.params = {
					env: context.envRecord.code.toLowerCase(),
					serviceName: 'controller',
					version: '1'
				};
				deployer.getServiceHost(options, function (error, controllerDomainName) {
					utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
						context.variables['$SOAJS_NX_CONTROLLER_IP_1'] = controllerDomainName;
						context.variables['$SOAJS_NX_CONTROLLER_NB'] = '1';
						context.variables['$SOAJS_NX_CONTROLLER_PORT'] = '' + context.envRecord.services.config.ports.controller;
						return cb();
					});
				});
			}
			else {
				return cb();
			}
		}

		function getGitInfo(cb) {
			if (soajs.inputmaskData && soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.owner && soajs.inputmaskData.gitSource.repo) {
				getGitRecord(soajs, soajs.inputmaskData.gitSource.owner + '/' + soajs.inputmaskData.gitSource.repo, function (error, accountRecord) {
					utils.checkErrorReturn(soajs, cbMain, {
						config: config,
						error: error || !accountRecord,
						code: 600
					}, function () {
						accountRecord.providerName = accountRecord.provider;

						if (accountRecord.providerName.indexOf('_') !== -1) {
							accountRecord.providerName = accountRecord.providerName.split('_')[0];
						}

						//if private repo, add token to env variables
						if (accountRecord.token) {
							if (accountRecord.provider === 'bitbucket_enterprise') {
								accountRecord.token = new Buffer(accountRecord.token, 'base64').toString();
							}
							context.variables["$SOAJS_GIT_TOKEN"] = accountRecord.token;
						}
						context.variables['$SOAJS_GIT_PROVIDER'] = accountRecord.providerName;
						context.variables['$SOAJS_GIT_DOMAIN'] = accountRecord.domain;

						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.owner) {
							context.variables['$SOAJS_GIT_OWNER'] = soajs.inputmaskData.gitSource.owner;
						}
						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.repo) {
							context.variables['$SOAJS_GIT_REPO'] = soajs.inputmaskData.gitSource.repo;
						}
						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.branch) {
							context.variables['$SOAJS_GIT_BRANCH'] = soajs.inputmaskData.gitSource.branch;
						}
						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.commit) {
							context.variables['$SOAJS_GIT_COMMIT'] = soajs.inputmaskData.gitSource.commit;
						}

						return cb();
					});
				});
			}
			else {
				return cb();
			}
		}

		function getServiceDaemonInfo(cb) {
			if (context.catalog.type === 'soajs') {
				var opts = {
					collection: (soajs.inputmaskData.custom && soajs.inputmaskData.custom.daemonGroup) ? colls.daemons : colls.services,
					conditions: {
						name: (soajs.inputmaskData.custom && soajs.inputmaskData.custom.gc && soajs.inputmaskData.custom.gc.gcName) ? soajs.inputmaskData.custom.gc.gcName : soajs.inputmaskData.custom.name
					}
				};
				BL.model.findEntry(soajs, opts, function (error, dbRecord) {
					utils.checkErrorReturn(soajs, cbMain, {config: config, error: error || !dbRecord, code: 600}, function () {
						registry.loadByEnv({envCode: context.envRecord.code.toLowerCase()}, function (error, registry) {
							utils.checkErrorReturn(soajs, cbMain, {config: config, error: error, code: 446}, function () {
								dbRecord.maintenancePort = dbRecord.port + registry.serviceConfig.ports.maintenanceInc;

								//If the service has a custom entry point, add it as an option to the deployer
								if (dbRecord.src && dbRecord.src.main) {
									context.variables['$SOAJS_SRV_MAIN'] = dbRecord.src.main;
								}

								context.ports = [
									{
										"name": "service",
										"isPublished": false,
										"target": dbRecord.port
									},
									{
										"name": "maintenance",
										"isPublished": false,
										"target": dbRecord.maintenancePort
									}
								];
								context.serviceName = dbRecord.name;
								context.serviceGroup = dbRecord.group;

								//Daemons read additional environment variable that points out the name of the group configuration that should be used
								if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.daemonGroup) {
									context.variables['$SOAJS_DAEMON_GRP_CONF'] = soajs.inputmaskData.custom.daemonGroup;
								}

								//if gc, add gc info to env variables
								if (soajs.inputmaskData.custom.gc) {
									context.variables["$SOAJS_GC_NAME"] = soajs.inputmaskData.custom.gc.gcName;
									context.variables["$SOAJS_GC_VERSION"] = soajs.inputmaskData.custom.gc.gcVersion;

									context.origin = context.name = soajs.inputmaskData.custom.name;
									context.name = soajs.inputmaskData.custom.gc.gcName;
									context.origin = "gcs";
								}

								//If a service requires to run cmd commands before starting, get them from service record and add them
								if (dbRecord.src && dbRecord.src.cmd && Array.isArray(dbRecord.src.cmd) && dbRecord.src.cmd.length > 0) {
									for (var cmd = dbRecord.src.cmd.length - 1; cmd >= 0; cmd--) {
										if (dbRecord.src.cmd[cmd].trim() === '') {
											dbRecord.src.cmd.splice(cmd, 1);
										}
									}
									if (dbRecord.src.cmd.length > 0) {
										context.serviceCmd = dbRecord.src.cmd;
									}
								}

								var platform = context.envRecord.deployer.selected.split('.')[1];
								var serviceName = context.envRecord.code.toLowerCase() + "-" + soajs.inputmaskData.custom.name;

								var version = "1";
								if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.version) {
									version = soajs.inputmaskData.custom.version;
								}
								soajs.inputmaskData.custom.version = version;

								if (platform === 'docker' && soajs.inputmaskData.custom.name !== 'controller') {
									serviceName += (soajs.inputmaskData.custom.version) ? "-v" + soajs.inputmaskData.custom.version : "";
								}
								else if (platform === 'kubernetes') {
									serviceName += (soajs.inputmaskData.custom.version) ? "-v" + soajs.inputmaskData.custom.version : "";
								}

								context.name = serviceName;

								if (dbRecord && dbRecord.prerequisites && dbRecord.prerequisites.memory) {
									utils.checkErrorReturn(soajs, cbMain, {
										config: config,
										error: (dbRecord.prerequisites.memory > soajs.inputmaskData.deployConfig.memoryLimit),
										code: 910
									}, cb);
								}
								else {
									return cb();
								}
							});
						});
					});
				});
			}
			else {
				return cb();
			}
		}

		function getDashboardConnection(cb) {
			getDashDbInfo(soajs, function (error, data) {
				utils.checkErrorReturn(soajs, cbMain, {config: config, error: error, code: 600}, function () {

					context.variables['$SOAJS_MONGO_NB'] = data.mongoDbs.length;

					//adding info about database servers
					for (var i = 0; i < data.mongoDbs.length; i++) {
						context.variables["$SOAJS_MONGO_IP_" + (i + 1)] = data.mongoDbs[i].host;
						context.variables["$SOAJS_MONGO_PORT_" + (i + 1)] = data.mongoDbs[i].port;
					}

					//if database prefix exists, add it to env variables
					if (data.dbConfig && data.dbConfig.prefix) {
						context.variables["$SOAJS_MONGO_PREFIX"] = data.dbConfig.prefix;
					}

					//if mongo credentials exist, add them to env variables
					if (data.mongoCred && data.mongoCred.username && data.mongoCred.password) {
						context.variables["$SOAJS_MONGO_USERNAME"] = data.mongoCred.username;
						context.variables["$SOAJS_MONGO_PASSWORD"] = data.mongoCred.password;
					}

					//if replica set is used, add name to env variables
					if (data.clusterInfo.URLParam && data.clusterInfo.URLParam.replicaSet && data.clusterInfo.URLParam.replicaSet) {
						context.variables["$SOAJS_MONGO_RSNAME"] = data.clusterInfo.URLParam.replicaSet;
					}

					//if authSource is set, add it to env variables
					if (data.clusterInfo.URLParam && data.clusterInfo.URLParam.authSource) {
						context.variables["$SOAJS_MONGO_AUTH_DB"] = data.clusterInfo.URLParam.authSource;
					}

					//if ssl is set, add it to env variables
					if (data.clusterInfo.URLParam && data.clusterInfo.URLParam.ssl) {
						context.variables["$SOAJS_MONGO_SSL"] = 'true';
					}
					return cb();
				});
			});
		}

		function getAnalyticsEsInfo(cb) {
			var env = process.env.SOAJS_ENV || 'dashboard'; //NOTE: analytics cluster config is restricted to dashboard environment
			utils.getEnvironment(soajs, BL.model, env, function (error, envRecord) {
				if (error) {
					return cb(error);
				}

				if (!envRecord || !envRecord.dbs || !envRecord.dbs.databases) return cb();

				async.detect(envRecord.dbs.databases, function (oneDb, callback) {
					return callback(null, oneDb.useForAnalytics);
				}, function (error, analyticsDb) {
					if (!analyticsDb) return cb();

					var analyticsCluster = envRecord.dbs.clusters[analyticsDb.cluster];
					if (!analyticsCluster) return cb();

					context.variables["$SOAJS_ANALYTICS_ES_NB"] = analyticsCluster.servers.length;
					if (analyticsCluster.credentials) {
						if (analyticsCluster.credentials.username) {
							context.variables['$SOAJS_ANALYTICS_ES_USERNAME'] = analyticsCluster.credentials.username;
						}
						if (analyticsCluster.credentials.password) {
							context.variables['$SOAJS_ANALYTICS_ES_PASSWORD'] = analyticsCluster.credentials.password;
						}
					}
					async.eachOf(analyticsCluster.servers, function (oneServer, index, callback) {
						context.variables["$SOAJS_ANALYTICS_ES_IP_" + (index + 1)] = oneServer.host;
						context.variables["$SOAJS_ANALYTICS_ES_PORT_" + (index + 1)] = oneServer.port;
						return callback();
					}, cb);
				});
			});
		}

		/**
		 * get the latest soajs images
		 * @param cb
		 */
		function getLatestSOAJSImageInfo(cb){
			let myUrl = config.docker.url;
			var prefix = "library";
			if(context.catalog.recipe.deployOptions.image.prefix && context.catalog.recipe.deployOptions.image.prefix !== ''){
				prefix = context.catalog.recipe.deployOptions.image.prefix;
			}
			myUrl = myUrl.replace("%organization%", prefix).replace("%imagename%", context.catalog.recipe.deployOptions.image.name);
			var tag = "latest";
			if(context.catalog.recipe.deployOptions.image.tag && context.catalog.recipe.deployOptions.image.tag !==''){
				tag = context.catalog.recipe.deployOptions.image.tag;
			}
			myUrl += tag;
			let opts = {
				method: 'GET',
				url: myUrl,
				headers: { 'cache-control': 'no-cache' },
				json: true
			};
			request.get(opts, function(error, response, body){
				utils.checkErrorReturn(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					context.imageInfo = body;
					return cb();
				});
			});
		}

		async.series([getEnvInfo, getCatalogRecipe, checkPort, getLatestSOAJSImageInfo], function () {
			var platform = context.envRecord.deployer.selected.split('.')[1];
			context.platform = platform;
			context.options = options;

			if (soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.memoryLimit) {
				context.variables['$SOAJS_SRV_MEMORY'] = (soajs.inputmaskData.deployConfig.memoryLimit / 1048576);
			}

			async.series([getDashboardConnection, getAnalyticsEsInfo, getControllerDomain, getGitInfo, getServiceDaemonInfo], function () {

				if (context.catalog.recipe.deployOptions.labels) {
					context.labels = context.catalog.recipe.deployOptions.labels;
				}
				switch (context.catalog.type) {
					case 'soajs':
						context.labels = {
							"soajs.content": "true",
							"soajs.service.name": context.serviceName,
							"soajs.service.group": (context.serviceGroup) ? context.serviceGroup.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-') : '',
							"soajs.service.label": context.name
						};

						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.type) {
							context.labels["soajs.service.type"] = soajs.inputmaskData.custom.type;
						}

						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.version) {
							context.labels["soajs.service.version"] = soajs.inputmaskData.custom.version.toString();
						}

						//add repo and branch as labels
						if (context.catalog && context.catalog.recipe && context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env) {
							for (let i = 0, oneEnvKey = '', oneEnv = {}; i < Object.keys(context.catalog.recipe.buildOptions.env).length; i++) {
								oneEnvKey = Object.keys(context.catalog.recipe.buildOptions.env)[i];
								oneEnv = context.catalog.recipe.buildOptions.env[oneEnvKey];

								if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_REPO') {
									context.labels['service.repo'] = context.variables['$SOAJS_GIT_REPO'];
								}
								else if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_BRANCH') {
									context.labels['service.branch'] = context.variables['$SOAJS_GIT_BRANCH'];
								}

								if (context.labels['service.repo'] && context.labels['service.branch']) break;
							}
						}

						break;
					case 'nginx':
						context.labels = {
							"soajs.content": "true",
							"soajs.service.name": "nginx",
							"soajs.service.group": "nginx",
							"soajs.service.type": "nginx",
							"soajs.service.label": context.envRecord.code.toLowerCase() + "-nginx"
						};
						context.name = context.envRecord.code.toLowerCase() + "_nginx";

						//add repo and branch as labels
						if (context.catalog && context.catalog.recipe && context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env) {
							for (let i = 0, oneEnvKey = '', oneEnv = {}; i < Object.keys(context.catalog.recipe.buildOptions.env).length; i++) {
								oneEnvKey = Object.keys(context.catalog.recipe.buildOptions.env)[i];
								oneEnv = context.catalog.recipe.buildOptions.env[oneEnvKey];

								if (oneEnvKey === 'SOAJS_GIT_REPO') {
									if (oneEnv.type === 'static') {
										context.labels['service.repo'] = oneEnv.value;
									}
									else if (oneEnv.type === 'userInput') {
										context.labels['service.repo'] = soajs.inputmaskData.custom.env['SOAJS_GIT_REPO'] || oneEnv.default;
									}
								}
								else if (oneEnvKey === 'SOAJS_GIT_BRANCH') {
									if (oneEnv.type === 'static') {
										context.labels['service.branch'] = oneEnv.value;
									}
									else if (oneEnv.type === 'userInput') {
										context.labels['service.branch'] = soajs.inputmaskData.custom.env['SOAJS_GIT_BRANCH'] || oneEnv.default;
									}
								}

								if (context.labels['service.repo'] && context.labels['service.branch']) break;
							}
						}

						break;
					default:
						context.name = context.envRecord.code.toLowerCase() + "_" + context.catalog.type;
						var serviceUid = shortid.generate().replace(/[\.-_]/g, '0'); //remove characters that might cause errors on kubernetes
						var serviceLabel = context.envRecord.code.toLowerCase() + "-" + context.catalog.type + "-" + serviceUid;
						context.labels = {
							"soajs.service.name": serviceLabel,
							"soajs.service.type": context.catalog.type,
							"soajs.service.label": serviceLabel
						};

						if(config.HA.clustersList.indexOf(context.catalog.type.toLowerCase()) !== -1){
							context.labels['soajs.content'] = "true";
							context.labels['soajs.service.group'] = "db";
						}

						//add repo and branch as labels
						if (context.catalog && context.catalog.recipe && context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env) {
							for (let i = 0, oneEnvKey = '', oneEnv = {}; i < Object.keys(context.catalog.recipe.buildOptions.env).length; i++) {
								oneEnvKey = Object.keys(context.catalog.recipe.buildOptions.env)[i];
								oneEnv = context.catalog.recipe.buildOptions.env[oneEnvKey];

								if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_REPO') {
									context.labels['service.repo'] = context.variables['$SOAJS_GIT_REPO'];
								}
								else if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_BRANCH') {
									context.labels['service.branch'] = context.variables['$SOAJS_GIT_BRANCH'];
								}

								if (context.labels['service.repo'] && context.labels['service.branch']) break;
							}
						}

						break;
				}

				//add image tag where applicable
				if(soajs.inputmaskData.action === 'rebuild'){
					if(context.platform === 'kubernetes' && context.catalog.recipe.deployOptions.image.pullPolicy !== 'Always'){
						context.labels['service.image.ts'] = soajs.inputmaskData.imageLastTs;
					}
					else{
						context.labels['service.image.ts'] = new Date(context.imageInfo.last_updated).getTime().toString();
					}
				}
				else{
					context.labels['service.image.ts'] = new Date(context.imageInfo.last_updated).getTime().toString();
				}
				doDeploy();
			});
		});

		function doDeploy() {
			deployContainer(config, context, soajs, res, cbMain);
		}
	},

	/**
	 * Redeploy a service (does not update config, only simulates a deployment restart)
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
	"redeployService": function (config, soajs, registry, res, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			utils.checkErrorReturn(soajs, cbMain, {config: config, error: error || !envRecord, code: 402}, function () {
				if (!soajs.inputmaskData.custom) {
					soajs.inputmaskData.custom = {};
				}

				var options = utils.buildDeployerOptions(envRecord, soajs, BL);
				if (soajs.inputmaskData.action === 'redeploy') {
					options.params = {
						id: soajs.inputmaskData.serviceId,
						mode: soajs.inputmaskData.mode, //NOTE: only required for kubernetes driver
						action: soajs.inputmaskData.action
					};

					deployer.redeployService(options, function (error) {
						utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
							return cbMain(null, true);
						});
					});
				}
				else if (soajs.inputmaskData.action === 'rebuild') {
					options.params = {id: soajs.inputmaskData.serviceId, excludeTasks: true};
					deployer.inspectService(options, function (error, record) {
						utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
							utils.checkErrorReturn(soajs, cbMain, {
								config: config,
								error: !record.service || !record.service.labels || !record.service.labels['soajs.catalog.id'],
								code: 954
							}, function () {
								//set catalog id and rebuild option and forward to deploy() function
								soajs.inputmaskData.recipe = record.service.labels['soajs.catalog.id'];
								soajs.inputmaskData.custom.name = record.service.labels['soajs.service.name'];
								soajs.inputmaskData.imageLastTs = record.service.labels['service.image.ts'] || "";
								soajs.inputmaskData.deployConfig = {
									memoryLimit: 500,
									replication: {
										mode: record.service.labels["soajs.service.mode"]
									}
								};
								if (['deployment', 'daemonset'].indexOf(soajs.inputmaskData.deployConfig.replication.mode) !== -1) {
									soajs.inputmaskData.deployConfig.isKubernetes = true;
								}
								if (['replicated', 'deployment'].indexOf(soajs.inputmaskData.deployConfig.replication.mode) !== -1) {
									soajs.inputmaskData.deployConfig.replication.replicas = (record.service.tasks.length - record.service.failures) || 1;
								}
								//'replicated', 'global', 'deployment', 'daemonset'
								record.service.env.forEach(function (oneEnv) {
									if (oneEnv.indexOf('SOAJS_SRV_MEMORY') !== -1) {
										soajs.inputmaskData.deployConfig.memoryLimit = parseInt(oneEnv.split('=')[1]);
									}
								});
								soajs.inputmaskData.deployConfig.memoryLimit = soajs.inputmaskData.deployConfig.memoryLimit * 1048576;

								if (record.service.labels['soajs.service.type'] === 'service' || record.service.labels['soajs.service.type'] === 'daemon') {
									soajs.inputmaskData.custom.type = record.service.labels['soajs.service.type'];
									soajs.inputmaskData.custom.version = record.service.labels['soajs.service.version'];
									soajs.inputmaskData.gitSource = {};

									async.each(record.service.env, function (oneEnv, callback) {
										if (oneEnv.indexOf('SOAJS_GIT_OWNER') !== -1) soajs.inputmaskData.gitSource.owner = oneEnv.split('=')[1];
										else if (oneEnv.indexOf('SOAJS_GIT_REPO') !== -1) soajs.inputmaskData.gitSource.repo = oneEnv.split('=')[1];
										else if (oneEnv.indexOf('SOAJS_GIT_BRANCH') !== -1) soajs.inputmaskData.gitSource.branch = oneEnv.split('=')[1];

										else if (soajs.inputmaskData.custom.type === 'daemon' && oneEnv.indexOf('SOAJS_DAEMON_GRP_CONF') !== -1) {
											soajs.inputmaskData.custom.daemonGroup = oneEnv.split('=')[1];
										}
										else if (soajs.inputmaskData.custom.type === 'service' && oneEnv.indexOf('SOAJS_GC_NAME') !== -1) {
											if (oneEnv !== 'SOAJS_GC_NAME=null') {
												if (!soajs.inputmaskData.custom.gc) {
													soajs.inputmaskData.custom.gc = {};
												}
												soajs.inputmaskData.custom.gc.gcName = oneEnv.split('=')[1];
											}
										}
										else if (soajs.inputmaskData.type === 'service' && oneEnv.indexOf('SOAJS_GC_VERSION') !== -1) {
											if (oneEnv !== 'SOAJS_GC_VERSION=null') {
												if (!soajs.inputmaskData.custom.gc) {
													soajs.inputmaskData.custom.gc = {};
												}
												soajs.inputmaskData.custom.gc.gcVersion = oneEnv.split('=')[1];
											}
										}

										return callback();
									}, function () {
										return BL.deployService(config, soajs, registry, res, cbMain);
									});
								}
								else{
									return BL.deployService(config, soajs, registry, res, cbMain);
								}
							});
						});
					});
				}
			});
		});
	}
};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;

		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}

		modelPath = __dirname + "/../../models/" + modelName + ".js";
		return requireModel(modelPath, cb);

		/**
		 * checks if model file exists, requires it and returns it.
		 * @param filePath
		 * @param cb
		 */
		function requireModel(filePath, cb) {
			//check if file exist. if not return error
			fs.exists(filePath, function (exists) {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}

				BL.model = require(filePath);
				return cb(null, BL);
			});
		}
	}
};
