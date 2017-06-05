"use strict";

var fs = require("fs");
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var config = require('../../../../config.js');
var BitbucketClient = require('bitbucket-server-nodejs').Client;

var bitbucketClient;

function checkIfError (error, options, cb, callback) {
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

		return cb(error);
	}

	return callback();
}

var lib = {
	"authenticate": function (options) {
		var domain = 'https://' + config.gitAccounts.bitbucket_enterprise.apiDomain.replace('%PROVIDER_DOMAIN%', options.domain);
		if (options.access === 'public') {
			bitbucketClient = new BitbucketClient(domain);
		} else {
			// has the form username:password
			var credentials = options.token.split(':');

			bitbucketClient = new BitbucketClient(domain, {
				type: 'basic',
				username: credentials[ 0 ],
				password: credentials[ 1 ]
			});
		}
	},

	"checkUserRecord": function (options, cb) {
		var domain = 'https://' + config.gitAccounts.bitbucket_enterprise.apiDomain.replace('%PROVIDER_DOMAIN%', options.domain);
		var tempClient = new BitbucketClient(domain);

		tempClient.users.getUser(options.owner)
			.then(function (user) {
				return cb(null, user);
			})
			.catch(function (error) {
				return cb(error);
			})
			.finally(function () {
				// delete temp client
				tempClient = null;
			});
	},

	"getRepoBranches": function (options, cb) {
		var repoInfo = [];

		if (options.name) {
			repoInfo = options.name.split("/");
		}
		else {
			repoInfo = [ options.owner, options.repo ];
		}

		// options.owner contains either the project key or the user slug
		bitbucketClient.branches.get(repoInfo[ 0 ], repoInfo[ 1 ])
			.then(function (branches) {
				var branchesArray = [];
				// The GUI expects a 'name'
				// Bitbucket does not return one like GitHub, so we construct it
				for (var i = 0; i < branches.values.length; ++i) {
					branchesArray.push({
						name: branches.values[ i ].displayId,
						commit: {
							sha: branches.values[ i ].latestCommit
						}
					});
				}

				return cb(null, branchesArray);
			})
			.catch(function (error) {
				return cb(error);
			});
	},

	"getRepoContent": function (options, cb) {
		var lines = [];
		get(0, cb);

		function get (start, cb) {
			bitbucketClient.repos.browse(options.project, options.repo, {
					path: options.path,
					args: { at: options.ref, start: start }
				})
				.then(function (response) {
					lines = lines.concat(response.lines);

					if (!response.isLastPage) {
						return get((response.start + response.size), cb);
					}
					else {
						return cb(null, { lines: lines });
					}
				})
				.catch(function (error) {
					return cb(error);
				});
		}
	},

	"getAllRepos": function (options, cb) {
		var allRepos = [];

		// get all repos from all projects
		bitbucketClient.repos.getCombined()
			.then(function (repos) {
				allRepos = repos.values;

				// get all repos from current user
				// a user "project" is his slug, prepended with '~'
				return bitbucketClient.repos.get('~' + options.owner);
			})
			.then(function (userRepos) {
				allRepos = allRepos.concat(userRepos.values);

				// The GUI expects a 'full_name' and a 'repo.owner.login' attributes.
				// BitbucketClient does not return one like GitHub, so we construct them
				// We set the owner.login as the project repo, which is ('~' + username)
				for (var i = 0; i < allRepos.length; ++i) {
					var repo = allRepos[ i ];
					repo.name = repo.slug; //overwrite the name with the slug, slug is required for api calls
					repo.full_name = repo.project.key + "/" + repo.slug;
					repo.owner = {
						login: repo.project.key
					};
				}

				return cb(null, allRepos);
			})
			.catch(function (error) {
				return cb(error);
			});
	},

	"addReposStatus": function (allRepos, activeRepos, cb) {
		if (!Array.isArray(allRepos)) {
			allRepos = [];
		}
		if (!activeRepos || activeRepos.length === 0) {
			return cb(allRepos);
		}

		var found;
		activeRepos.forEach(function (oneRepo) {
			found = false;
			for (var i = 0; i < allRepos.length; i++) {
				if (allRepos[ i ].full_name.toLowerCase() === oneRepo.name.toLowerCase()) {

					if (oneRepo.status) {
						allRepos[ i ].status = oneRepo.status;
					} else {
						allRepos[ i ].status = 'active';
					}

					allRepos[i].type = oneRepo.type;
					found = true;
					break;
				}
			}
			if (!found) {
				//USING THE SAME RECORD FORMAT AS GITHUB API RESPONSES
				var repoInfo = oneRepo.name.split('/');
				allRepos.push({
					full_name: oneRepo.name,
					owner: {
						login: repoInfo[ 0 ]
					},
					name: repoInfo[ 1 ],
					status: 'deleted'
				});
			}
		});

		return cb(allRepos);
	},

	"writeFile": function (options, cb) {
		fs.exists(options.configDirPath, function (exists) {
			if (exists) {
				lib.clearDir({ soajs: options.soajs, repoConfigsFolder: options.configDirPath }, function () {
					write();
				});
			}
			else {
				write();
			}

			function write () {
				mkdirp(options.configDirPath, function (error) {
					checkIfError(error, {}, cb, function () {
						fs.writeFile(options.configFilePath, options.configFile, function (error) {
							return (error) ? cb(error) : cb();
						});
					});
				});
			}
		});
	},

	"clearDir": function (options, cb) {
		rimraf(options.repoConfigsFolder, function (error) {
			if (error) {
				options.soajs.log.warn("Failed to clean repoConfigs directory, proceeding ...");
				options.soajs.log.error(error);
			}

			return cb();
		});
	}
};

module.exports = lib;
