"use strict";
var fs = require("fs");
var crypto = require("crypto");

var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var config = require('../../../../config.js');
var BitbucketClient = require('bitbucket-server-nodejs').Client;
var bitbucketClient;

function checkIfError(error, options, cb, callback) {
	if (error) {
		if (options && options.code) {
			if (typeof(error) === 'object' && error.code) {
				error.code = options.code;
			}
			else {
				error = {
					code: options.code,
					message: options.message || error
				};
			}
		}
		if(!error.code && error.statusCode){
			error.code = error.statusCode;
		}
		
		return cb(error);
	}
	
	return callback();
}

var lib = require('./helper.js');

var driver = {
	helper: lib,
	
	"login": function (soajs, data, model, options, cb) {
		data.checkIfAccountExists(soajs, model, options, function (error, count) {
			checkIfError(error, {}, cb, function () {
				checkIfError(count > 0, { code: 752, message: 'Account already exists' }, cb, function () {
					
					if (options.access === 'public') { //in case of public access, no tokens are created, just verify that user/org exists and save
						driver.helper.checkUserRecord(options, function (error) {
							checkIfError(error, {}, cb, function () {
								bitbucketClient = driver.helper.authenticate(options);
								data.saveNewAccount(soajs, model, options, cb);
							});
						});
					}
					else if (options.access === 'private') {
						driver.helper.checkUserRecord(options, function (error) {
							checkIfError(error, {}, cb, function () {
								options.token = options.owner + ":" + options.password;
								var domain = 'https://' + config.gitAccounts.bitbucket_enterprise.apiDomain.replace('%PROVIDER_DOMAIN%', options.domain);
								var tempClient = new BitbucketClient(domain, {
									type: 'basic',
									username: options.owner,
									password: options.password
								});
								// if able to get user's settings, it means we have valid credentials
								tempClient.settings.get(options.owner)
									.then(function () {
										delete options.password;
										bitbucketClient = driver.helper.authenticate(options);
										
										options.token = new Buffer(options.token).toString('base64');
										data.saveNewAccount(soajs, model, options, cb);
									})
									.catch(function (error) {
										return cb(error);
									})
									.finally(function () {
										// delete temp client
										tempClient = null;
									});
							});
						});
					}
				});
			});
		});
	},
	
	"logout": function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			checkIfError(error || !accountRecord, {}, cb, function () {
				checkIfError(accountRecord.repos.length > 0, {
					code: 754,
					message: 'Active repositories exist for this user'
				}, cb, function () {
					data.removeAccount(soajs, model, accountRecord._id, cb);
				});
			});
		});
	},
	
	"getRepos": function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			checkIfError(error || !accountRecord, {}, cb, function () {
				options.domain = accountRecord.domain;
				
				if (accountRecord.token) {
					options.token = new Buffer(accountRecord.token, 'base64').toString();
					bitbucketClient = driver.helper.authenticate(options);
				}
				
				options.type = accountRecord.type;
				options.owner = accountRecord.owner;
				
				if (error) {
					return cb(error, null);
				}
				
				driver.helper.getAllRepos(options, bitbucketClient, function (error, result) {
					checkIfError(error, {}, cb, function () {
						driver.helper.addReposStatus(result, accountRecord.repos, function (repos) {
							return cb(null, repos);
						});
					});
				});
			});
		});
	},
	
	"getBranches": function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			checkIfError(error, {}, cb, function () {
				options.domain = accountRecord.domain;
				
				if (accountRecord.token) {
					options.token = new Buffer(accountRecord.token, 'base64').toString();
					bitbucketClient = driver.helper.authenticate(options);
				}
				
				driver.helper.getRepoBranches(options, bitbucketClient, function (error, branches) {
					checkIfError(error, {}, cb, function () {
						var result = {
							owner: options.owner,
							repo: options.repo,
							branches: branches
						};
						return cb(null, result);
					});
				});
			});
		});
	},
	
	"getJSONContent": function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			checkIfError(error || !accountRecord, {}, cb, function () {
				if (accountRecord.token) {
					options.token = new Buffer(accountRecord.token, 'base64').toString();
					options.domain = accountRecord.domain;
					bitbucketClient = driver.helper.authenticate(options);
				}
				
				driver.helper.getRepoContent(options, bitbucketClient, function (error, response) {
					checkIfError(error, {}, cb, function () {
						
						// bitbucket Client returns no 'sha', use the path instead, its unique
						var configSHA = options.repo + options.path;
						var hash = crypto.createHash(config.gitAccounts.bitbucket_enterprise.hash.algorithm);
						configSHA = hash.update(configSHA).digest('hex');
						
						// bitbucket Client returns file content as an array of lines
						// concatenate them in one string
						var content = "";
						for (var i = 0; i < response.lines.length; ++i) {
							content += response.lines[i].text + "\n";
						}
						
						// remove all "require('...')" occurrences
						var configFile = content;
						configFile = configFile.toString().replace(/require\s*\(.+\)/g, '""');
						
						var repoConfigsFolder = config.gitAccounts.bitbucket_enterprise.repoConfigsFolder;
						var configDirPath = repoConfigsFolder + options.path.substring(0, options.path.lastIndexOf('/'));
						
						var fileInfo = {
							configDirPath: configDirPath,
							configFilePath: repoConfigsFolder + options.path,
							configFile: configFile,
							soajs: soajs
						};
						
						driver.helper.writeFile(fileInfo, function (error) {
							checkIfError(error, {}, cb, function () {
								var repoConfig;
								if (require.resolve(fileInfo.configFilePath)) {
									delete require.cache[require.resolve(fileInfo.configFilePath)];
								}
								try {
									repoConfig = require(fileInfo.configFilePath);
								}
								catch (e) {
									soajs.log.error(e);
								}
								repoConfig = repoConfig || { "type" : "custom" };
								driver.helper.clearDir({ repoConfigsFolder: repoConfigsFolder }, function () {
									return cb(null, repoConfig, configSHA);
								});
							});
						});
					});
				});
			});
		});
	},
	
	"getAnyContent": function (soajs, data, model, options, cb) {
		if (options.accountRecord.token) {
			options.token = new Buffer(options.accountRecord.token, 'base64').toString();
			options.domain = options.accountRecord.domain;
			bitbucketClient = driver.helper.authenticate(options);
		}
		
		driver.helper.getRepoContent(options, bitbucketClient, function (error, response) {
			checkIfError(error, {}, cb, function () {
				// bitbucket Client returns file content as an array of lines
				// concatenate them in one string
				var content = "";
				for (var i = 0; i < response.lines.length; ++i) {
					content += response.lines[i].text + "\n";
				}
				
				var downloadLink = 'https://' + config.gitAccounts.bitbucket_enterprise.downloadUrl
						.replace('%PROVIDER_DOMAIN%', options.domain)
						.replace('%PROJECT_NAME%', options.project)
						.replace('%REPO_NAME%', options.repo)
						.replace('%PATH%', options.path)
						.replace('%BRANCH%', options.ref || 'master');
				
				return cb(null, {
					token: options.token,
					downloadLink: downloadLink,
					content: content
				});
			});
		});
	}
};

module.exports = driver;