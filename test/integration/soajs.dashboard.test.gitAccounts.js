"use strict";
var assert = require('assert');
var request = require("request");
var helper = require("../helper.js");

var config = helper.requireModule('./config');
var errorCodes = config.errors;

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

function debugLog(data) {
	if (process.env.LOCAL_SOAJS) {
		if (data) {
			if (typeof (data) === 'object') {
				console.log(JSON.stringify(data, null, 2));
			}
			else {
				console.log(data);
			}
		}
	}
}

function executeMyRequest(params, apiPath, method, cb) {
	requester(apiPath, method, params, function (error, body) {
		assert.ifError(error);
		assert.ok(body);
		return cb(body);
	});

	function requester(apiName, method, params, cb) {
		var options = {
			uri: 'http://localhost:4000/dashboard/' + apiName,
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			json: true
		};

		if (params.headers) {
			for (var h in params.headers) {
				if (params.headers.hasOwnProperty(h)) {
					options.headers[h] = params.headers[h];
				}
			}
		}

		if (params.form) {
			options.body = params.form;
		}

		if (params.qs) {
			options.qs = params.qs;
		}

		request[method](options, function (error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			return cb(null, body);
		});
	}
}

describe("DASHBOARD Tests: Git Accounts", function () {
	var gitAccId;
	var passwordPersonal = process.env.SOAJS_TEST_GIT_PWD;
	var usernamePersonal = 'soajsTestAccount';
	var soajsAccId = '56f1189430f153a571b9c8be';

	var repoName1Fail = 'test.fail';
	var repoName2Fail = 'test.fail2';
	var repoMultiSuccess = 'test.successMulti';
	var repoSingleSuccess = 'test.success1';
	var repoSingleDaemon = 'test.daemon.s';
	var repoStaticContent = 'testStaticContent';

	before(function (done) {
		mongo.findOne("git_accounts", {owner: "soajs"}, function (error, record) {
			assert.ifError(error);
			assert.ok(record);
			record.repos.forEach(function (oneRepo) {
				oneRepo.configBranch = "develop";
			});

			mongo.save("git_accounts", record, function (error) {
				assert.ifError(error);
				done();
			});
		});
	});

	describe("github login tests", function () {

		it("fail - wrong pw", function (done) {
			var params = {
				form: {
					"username": usernamePersonal,
					"password": '43554',
					"label": "soajs Test Account",
					"provider": "github",
					"domain": "github.com",
					"type": "personal",
					"access": "private"
				}
			};
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
				assert.ok(body);
				// assert.deepEqual(body.errors.details[0], {"code": 767, "message": errorCodes[767]});
				done();
			});
		});

		it("fail - wrong provider", function (done) {
			var params = {
				form: {
					"username": usernamePersonal,
					"password": passwordPersonal,
					"label": "soajs Test Account",
					"provider": "bitbucket",
					"domain": "github.com",
					"type": "personal",
					"access": "private"
				}
			};
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
				assert.ok(body);
				// assert.ok(body.errors);
				// assert.deepEqual(body.errors.details[0], {code: 778, message: errorCodes[778]});
				done();
			});
		});

		it("success - will login - personal private acc", function (done) {
			var params = {
				form: {
					"username": usernamePersonal,
					"password": passwordPersonal,
					"label": "soajs Test Account",
					"provider": "github",
					"domain": "github.com",
					"type": "personal",
					"access": "private"
				}
			};
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
				assert.ok(body);
				done();
			});
		});

		it("fail - cannot login - Organization acc - already exists", function (done) {
			var params = {
				form: {
					"username": 'soajs',
					"label": "Test organization Account",
					"provider": "github",
					"domain": "github.com",
					"type": "organization",
					"access": "public"
				}
			};
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
				// assert.deepEqual(body.errors.details[0], {"code": 752, "message": errorCodes[752]});
				done();
			});
		});

	});

	describe("github accounts tests", function () {

		describe("list accounts", function () {

			it("success - will list", function (done) {
				var params = {};
				executeMyRequest(params, 'gitAccounts/accounts/list', 'get', function (body) {
					assert.ok(body.result);
					assert.ok(body.data);
					body.data.forEach(function (repo) {
						if (repo.owner === usernamePersonal) {
							gitAccId = repo._id.toString();
						}
					});
					done();
				});
			});
		});

	});

	describe("personal private acc", function () {

		describe("github getRepos tests", function () {

			it("success - will getRepos", function (done) {
				var params = {
					qs: {
						"id": gitAccId,
						"provider": "github",
						"page": 1,
						"per_page": 50
					}
				};
				executeMyRequest(params, 'gitAccounts/getRepos', 'get', function (body) {
					assert.ok(body);
					done();
				});
			});

		});

		describe("github getBranches tests", function () {

			it("success - will get Branches repo", function (done) {
				var params = {
					qs: {
						"id": gitAccId,
						"provider": "github",
						"name": "soajsTestAccount/testMulti",
						"type": "repo"
					}
				};
				executeMyRequest(params, 'gitAccounts/getBranches', 'get', function (body) {
					assert.ok(body);
					done();
				});
			});

			it("fail - get Branches wrong provider", function (done) {
				var params = {
					qs: {
						"id": gitAccId,
						"provider": "bitbucket",
						"name": "soajsTestAccount/testMulti",
						"type": "repo"
					}
				};
				executeMyRequest(params, 'gitAccounts/getBranches', 'get', function (body) {
					assert.ok(body);
					// assert.ok(body.errors);
					// assert.deepEqual(body.errors.details[0], {code: 778, message: errorCodes[778]});
					done();
				});
			});

		});

		describe("github repo tests", function () {

			describe("repo activate tests", function () {

				it("fail - will not activate repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoName1Fail,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body);
						//assert.deepEqual(body.errors.details[0], {"code": 761, "message": errorCodes[761]});
						done();
					});
				});

				it("fail 2 - will not activate repo", function (done) {
					// missing config info
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoName2Fail,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body);
						//assert.deepEqual(body.errors.details[0], {"code": 761, "message": errorCodes[761]});
						done();
					});
				});

				it("fail 3 - will not activate repo", function (done) {
					// Missing multi repository config data
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: 'test.MultiEmpty',
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body);
						//assert.deepEqual(body.errors.details[0], {"code": 761, "message": errorCodes[761]});
						done();
					});
				});

				it("fail to activate personal multi repo", function (done) {
					// inject service with port 3002
					var srv = {
						"name": "testService",
						"port": 3002,
						"requestTimeout": 30,
						"requestTimeoutRenewal": 5,
						"src": {
							"provider": "github",
							"owner": "ownerName",
							"repo": "testRepoName"
						},
						"versions": {
							"1": {
								"extKeyRequired": true,
								"apis": []
							}
						}
					};

					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoMultiSuccess,
							configBranch: "master"
						}
					};
					mongo.insert("services", srv, function (error) {
						executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
							assert.equal(body.result, false);
							//assert.deepEqual(body.errors.details[0], {"code": 762, "message": errorCodes[762]});
							mongo.remove('services', {'name': 'testService'}, function (error) {
								assert.ifError(error);
								done();
							});
						});
					});
				});

				it("fail - wrong provider", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "bitbucket",
							owner: usernamePersonal,
							repo: repoSingleSuccess,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body.errors);
						//assert.deepEqual(body.errors.details[0], {code: 778, message: errorCodes[778]});
						done();
					});
				});

				it("success - will activate single service repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoSingleSuccess,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});

				it("success - will activate single static repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoStaticContent,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});

				it("success - will activate single daemon repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoSingleDaemon,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body);
						done();
					});
				});

				it("success - will activate multi repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoMultiSuccess,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});

				it("fail - cannot activate again personal multi repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoMultiSuccess,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						// assert.equal(body.result, false);
						//assert.deepEqual(body.errors.details[0], {"code": 762, "message": errorCodes[762]});
						done();
					});
				});

				it("fail - cannot get Branches for service - wrong name", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							"name": "sample__Single",
							"type": "service"
						}
					};
					executeMyRequest(params, 'gitAccounts/getBranches', 'get', function (body) {
						assert.ok(body);
						// assert.deepEqual(body.errors.details[0], {"code": 759, "message": errorCodes[759]});
						done();
					});
				});

			});

			describe("repo sync tests", function () {

				it("success - will sync repo - no change", function (done) {
					console.log('usernamePersonal', usernamePersonal);
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							"provider": "github",
							owner: usernamePersonal,
							repo: repoSingleSuccess
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/sync', 'put', function (body) {
						assert.ok(body);
						done();
					});
				});
				
				it("success - will sync multi repo - change", function (done) {

					mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
						assert.ok(record);
						assert.ok(record.repos);
						record.repos.forEach(function (repo) {
							if (repo.name === usernamePersonal + '/' + repoMultiSuccess) {
								repo.configSHA.forEach(function (service) {
									service.sha = '6cbeae3ed88e9e3296e05fd52a48533ba53c0931';
								});
							}
						});
						mongo.save("git_accounts", record, function (error) {
							assert.ifError(error);
							var params = {
								qs: {
									"id": gitAccId
								},
								form: {
									"provider": "github",
									owner: usernamePersonal,
									repo: repoMultiSuccess
								}
							};
							executeMyRequest(params, 'gitAccounts/repo/sync', 'put', function (body) {
								assert.ok(body);
								//assert.ok(body.data);
								done();
							});
						});

					});

				});

				it("fail - out of sync repo", function (done) {
					var serviceName = 'sampleSuccessSingle';
					mongo.update("services", {'name': serviceName}, {
						"$set": {
							"port": 9000
						}
					}, function (error) {
						assert.ifError(error);

						mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
							assert.ok(record);
							assert.ok(record.repos);
							record.repos.forEach(function (repo) {
								if (repo.name === usernamePersonal + '/' + repoSingleSuccess) {
									repo.configSHA = '911837a2e79e0f7c9e6ff288326c38dbac1bf021';
								}
							});
							mongo.save("git_accounts", record, function (error) {
								assert.ifError(error);
								var params = {
									qs: {
										"id": gitAccId
									},
									form: {
										"provider": "github",
										owner: usernamePersonal,
										repo: repoSingleSuccess
									}
								};
								executeMyRequest(params, 'gitAccounts/repo/sync', 'put', function (body) {
									assert.ok(body);
									// assert.equal(body.data.status, 'outOfSync');
									done();
								});
							});

						});

					});

				});

			});

			describe("repo deactivate tests", function () {

				it("success - will deactivate single repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							owner: usernamePersonal,
							repo: repoSingleSuccess
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'put', function (body) {
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});

				it("success - will deactivate multi repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							owner: usernamePersonal,
							repo: repoMultiSuccess
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'put', function (body) {
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});

				it("success - will deactivate static repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							owner: usernamePersonal,
							repo: repoStaticContent
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'put', function (body) {
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});

				it("success - will deactivate daemon repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							owner: usernamePersonal,
							repo: repoSingleDaemon
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'put', function (body) {
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});

			});

		});

	});
	/**
	 * When clicking the test swagger icon a new tab will be opened and we should
	 * return the APIs documentation based on the yaml file located in the user
	 * github/bitbucket account where the service provided exists.
	 * This test will get the yaml file needed so the ui can return the APIs documentation
	 * The user must activate his github/bitbucket account on the dashboard first.
	 */
	describe("pull from a repo in github or bitbucket", function(){
		
		it("success - the user is logged in and provided an existing repo and file path", function(done){
			var params = {
				qs: {
					"owner" : "soajs",
					"repo" : "soajs.dashboard",
					"filepath" : "config.js",
					"branch" : "swagger"
				}
			};
			executeMyRequest(params, 'gitAccounts/getYaml', 'get', function(body){
				assert.ok(body);
				// assert.deepEqual(body.data.downloadLink, "https://raw.githubusercontent.com/soajs/soajs.dashboard/swagger/config.js");
				done();
			});
		});
		
		it("fail - the user isn't logged in", function(done){
			var params = {
				qs: {
					"owner" : "michel-el-hajj",
					"repo" : "soajs.dashboard",
					"filepath" : "config.js",
					"branch" : "swagger"
				}
			};
			executeMyRequest(params, 'gitAccounts/getYaml', 'get', function(body){
				assert.ok(body);
				// assert.equal(body.result, false);
				// assert.deepEqual(body.errors.details, [ { code: 757, message: 'Unable to get git user account' } ]);
				done();
			});
		});
		
		it("fail - the repo doesn't exist", function(done){
			var params = {
				qs: {
					"owner" : "soajs",
					"repo" : "soajs.unknown",
					"filepath" : "config.js",
					"branch" : "swagger"
				}
			};
			executeMyRequest(params, 'gitAccounts/getYaml', 'get', function(body){
				assert.ok(body);
				// assert.equal(body.result, false);
				done();
			});
		});
		it("fail - wrong file path", function(done){
			var params = {
				qs: {
					"owner" : "soajs",
					"repo" : "soajs.dashboard",
					"filepath" : "configs.js",
					"branch" : "swagger"
				}
			};
			executeMyRequest(params, 'gitAccounts/getYaml', 'get', function(body){
				assert.ok(body);
				// assert.equal(body.result, false);
				// assert.deepEqual(body.errors.details, [ { code: 789,
				// 	message: 'Unable to get content from git provider' } ]);
				done();
			});
		});
	});
	
	describe("personal public acc", function () {
		var gitAccId;

		describe("login", function () {

			it("fail - wrong personal public acc name", function (done) {
				var params = {
					form: {
						"username": 'xxx_vwq_xx_1gtGHYU_yt_plirf',
						"label": "Test wrong public Account",
						"provider": "github",
						"type": "personal",
						"access": "public"
					}
				};
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.ok(body);
					// assert.deepEqual(body.errors.details[0], {"code": 767, "message": errorCodes[767]});
					done();
				});
			});

			it("success - will login - personal public acc", function (done) {
				var params = {
					form: {
						"username": usernamePersonal,
						"label": "Test personal public Account",
						"provider": "github",
						"domain": "github.com",
						"type": "personal",
						"access": "public"
					}
				};
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.ok(body);
					mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
						assert.ifError(error);
						assert.ok(record);
						gitAccId = record._id.toString();
						done();
					});
				});
			});

		});

		describe("github repo tests", function () {

			describe("repo activate tests", function () {

				it("success - will activate single repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoSingleSuccess,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});

				it("success - will activate multi repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoMultiSuccess,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						debugLog(body);
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});

				it("fail - cant logout active acc", function (done) {
					var params = {
						qs: {
							"username": usernamePersonal,
							"password": passwordPersonal,
							"id": gitAccId,
							"provider": "github"
						}
					};
					executeMyRequest(params, 'gitAccounts/logout', 'delete', function (body) {
						assert.ok(body);
						// assert.equal(body.result, false);
						// assert.deepEqual(body.errors.details[0], {"code": 754, "message": errorCodes[754]});
						done();
					});
				});

			});

			describe("repo sync tests", function () {

				it("success - will sync repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							"provider": "github",
							owner: usernamePersonal,
							repo: repoSingleSuccess
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/sync', 'put', function (body) {
						assert.ok(body);
						done();
					});
				});

			});

			describe("repo deactivate tests", function () {

				it("fail - deactivate multi repo", function (done) {
					var host = {
						env: "dev",
						name: "sampleSuccess1",
						ip: "127.0.0.1",
						version: 1
					};
					mongo.insert("hosts", host, function (error) {
						var params = {
							qs: {
								"id": gitAccId,
								owner: usernamePersonal,
								repo: repoMultiSuccess
							}
						};
						executeMyRequest(params, 'gitAccounts/repo/deactivate', 'put', function (body) {
							debugLog(body);
							assert.ok(body);
							//assert.equal(body.errors.codes[0], 766);
							mongo.remove("hosts", {name: "sampleSuccess1"}, function (error) {
								done();
							});
						});
					});
				});
			});
		});
	});

	describe("organization public acc", function () {
		var orgName = 'soajs';
		var repoName = 'soajs.examples';

		describe("repo tests", function () {

			describe("repo activate and getRepos", function () {

				it("success org - will activate repo", function (done) {
					var params = {
						qs: {
							"id": soajsAccId
						},
						form: {
							provider: "github",
							owner: orgName,
							repo: repoName,
							configBranch: "develop"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});

				it("success - will getRepos again", function (done) {
					var params = {
						qs: {
							"id": soajsAccId,
							"page": 1,
							"per_page": 50,
							"provider": "github"
						}
					};
					executeMyRequest(params, 'gitAccounts/getRepos', 'get', function (body) {
						assert.ok(body);
						done();
					});
				});

				it("fail - getRepos wrong provider", function (done) {
					var params = {
						qs: {
							"id": soajsAccId,
							"page": 1,
							"per_page": 50,
							"provider": "bitbucket"
						}
					};
					executeMyRequest(params, 'gitAccounts/getRepos', 'get', function (body) {
						assert.ok(body);
						// assert.ok(body.errors);
						// assert.deepEqual(body.errors.details[0], {code: 778, message: errorCodes[778]});
						done();
					});
				});
			});

			describe("repo deactivate tests", function () {

				it("fail - cannot deactivate urac repo - running service", function (done) {
					var params = {
						qs: {
							"id": soajsAccId,
							owner: orgName,
							repo: 'soajs.urac'
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'put', function (body) {
						assert.ok(body);
						//assert.deepEqual(body.errors.details[0], {"code": 766, "message": errorCodes[766]});
						done();
					});
				});

			});

		});

		describe("login & logout", function () {
			before(function (done) {
				mongo.remove('git_accounts', {'owner': orgName}, function (error) {
					assert.ifError(error);
					done();
				});
			});

			it("fail - wrong Organization acc", function (done) {
				var params = {
					form: {
						"username": 'soajs_wwwwwww',
						"label": "Test org Account",
						"provider": "github",
						"type": "organization",
						"access": "public"
					}
				};
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.ok(body);
					// assert.deepEqual(body.errors.details[0], {"code": 767, "message": errorCodes[767]});
					done();
				});
			});

			it("success - will login - Organization acc", function (done) {
				var params = {
					form: {
						"username": orgName,
						"label": "Test organization Account",
						"provider": "github",
						"domain": "github.com",
						"type": "organization",
						"access": "public"
					}
				};
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.ok(body);
					mongo.findOne('git_accounts', {'owner': orgName}, function (error, record) {
						assert.ifError(error);
						assert.ok(record);
						gitAccId = record._id.toString();
						done();
					});
				});
			});

			it("will logout org account", function (done) {
				var params = {
					qs: {
						"username": orgName,
						"id": gitAccId,
						"provider": "github"
					}
				};
				executeMyRequest(params, 'gitAccounts/logout', 'delete', function (body) {
					assert.ok(body);
					done();
				});
			});

		});

	});
});
