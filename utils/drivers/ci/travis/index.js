/* jshint esversion: 6 */

"use strict";
const async = require("async");
const request = require("request");
const config = require("./config.js");

let utils = {
    //return an error object if a function generates an error
    "checkError": function (error, options, cb, callback) {
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
};

var lib = {
    /**
     * Generate a travis token from a Github token
     * @param opts
     * @param cb
     */
    generateToken (opts, cb) {
        let params = {};

        params.uri = "https://" + opts.settings.domain + config.headers.api.url.githubAuth;
        params.headers = {
            "User-Agent": config.headers.userAgent,
            "Accept": config.headers.accept,
            "Content-Type": config.headers.contentType,
            "Host": opts.settings.domain
        };
        params.json = true;
        params.body = {
            "github_token": opts.settings.gitToken
        };

        opts.log.debug(params);
        //send the request to obtain the Travis token
        request.post(params, function (error, response, body) {
            //Check for errors in the request function
            utils.checkError(error, {code: 971}, cb, () => {
                //github token parameter is null or not passed
                utils.checkError(body && body.error && body.error === "Must pass 'github_token' parameter", {code: 972}, cb, () => {
                    //github token is invalid
                    utils.checkError(body === "not a Travis user", {code: 972}, cb, () => {
                        utils.checkError(!body && !error && response, {code: 973}, cb, () => {
                            //the body contains the travis token: access_token
                            return cb(null, body.access_token);
                        });
                    });
                });
            });
        });
    },

    /**
     * Lists all repos or a specific repo for a repo owner
     * @param opts
     * @param cb
     */
    listRepos (opts, cb) {
        let params = {};
        let repos = [];
        
        //check if an access token is provided
        utils.checkError(!opts.settings.ciToken, {code: 974}, cb, () => {
            //check if the repositories owner name is provided
            utils.checkError(!opts.settings && !opts.settings.owner, {code: 975}, cb, () => {
                let finalUrl = config.headers.api.url.listRepos + "/" + opts.settings.owner;

                opts.log.debug(opts.settings);
                if (opts.settings.repo) {
                    finalUrl += "/" + opts.settings.repo;
                }

                if(opts.settings.ciToken){
                    finalUrl += "?access_token=" + opts.settings.ciToken;
                }

                params.uri = "https://" + opts.settings.domain + finalUrl;

                params.headers = {
                    "User-Agent": config.headers.userAgent,
                    "Accept": config.headers.accept,
                    "Content-Type": config.headers.contentType,
                    "Host": opts.settings.domain
                };
                params.json = true;

                opts.log.debug(params);
                //send the request to obtain the repos
                request.get(params, function (error, response, body) {

                    //Check for errors in the request function
                    utils.checkError(error, {code: 971}, cb, () => {
                        //Check if the requested owner has repos
                        utils.checkError(!Array.isArray(body.repos), {code: 976}, cb, () => {
                            //check if the requested repo is found
                            utils.checkError(body.file && body.file === 'not found', {code: 977}, cb, () => {

                                //todo: need to map the response
                                body = body.repos;
                                if(body && body.length > 0) {
                                    async.each(body, updateRepoVars, function (error, response) {
                                        utils.checkError(error, {code: 978}, cb, () => {
                                            return cb(null, repos);
                                        })
                                    });
                                }
                                else {
                                    return cb(null, repos);
								}

                            });
                        });
                    });
                });
            });
        });

        function updateRepoVars(oneRepo, cb){
            let myRepo = {
                id: oneRepo.id,
                name: oneRepo.slug,
                active: oneRepo.active,
                description: oneRepo.description
            };

            let build = {};
            if(oneRepo.last_build_id){
                build.id = oneRepo.last_build_id;
            }

            if(oneRepo.last_build_number){
                build.number = oneRepo.last_build_number;
            }

            if(oneRepo.last_build_state){
                build.state = oneRepo.last_build_state;
            }

            if(oneRepo.last_build_duration){
                build.duration = oneRepo.last_build_duration;
            }

            if(oneRepo.last_build_started_at){
                build.started = oneRepo.last_build_started_at;
            }

            if(oneRepo.last_build_finished_at){
                build.finished = oneRepo.last_build_finished_at;
            }

            if(Object.keys(build).length > 0){
                myRepo.build = build;
            }

            repos.push(myRepo);
            return cb(null, true);
        }
    },

    /**
     * modifies the environment variables of a repo based on the supplied env variables
     * @param opts
     * @param id
     * @param cb
     */
    ensureRepoVars(opts, id, cb) {
        //If there are no variables, skip the check
        if(!opts.variables || (opts.variables && Object.keys(opts.variables).length === 0))
            return cb();
        else {
            //list the environment variables of each repo
            let options = {
                "settings": {
                    "domain": opts.settings.domain,
                    "ciToken": opts.settings.ciToken
                },
				"params": {
					"repoId": id
				}
            };

            //List the env variables
            lib.listEnvVars(options, (err, repoVars) => {
                //delete all the environment variables
				async.eachSeries(repoVars, function(oneVar, callback){
					options.settings.varID = oneVar.id;
					lib.deleteEnvVar(options, callback);
				}, (err) => {
                    let inputVariables = opts.variables;

                    if(options.settings.varID)
                    	delete options.settings.varID;

					//add the supplied environment variables
					async.eachSeries(Object.keys(inputVariables), function(inputVar, callback) {
						//set up the env variable record
						options.settings.envVar = {
							"name": inputVar,
							"value": inputVariables[inputVar],
							"public": true
						};
						//set the public status of each env var
						if(inputVar === "SOAJS_CD_AUTH_KEY" || inputVar === "SOAJS_CD_DEPLOY_TOKEN")
							options.settings.envVar.public = false;
						lib.addEnvVar(options, callback);
					}, cb);
				});
            });
        }
    },

    /**
     * Generate a travis token from a Github token
     * @param opts
     * @param cb
     */
    listEnvVars (opts, cb) {
        let params = {};

        params.uri = "https://" + opts.settings.domain + config.headers.api.url.listEnvVars + opts.params.repoId + "&access_token=" + opts.settings.ciToken;
        params.headers = {
            "User-Agent": config.headers.userAgent,
            "Accept": config.headers.accept,
            "Content-Type": config.headers.contentType,
            "Host": opts.settings.domain
        };
        params.json = true;
        opts.log.debug(params);
        //send the request to obtain the environment variables
        request.get(params, function (error, response, body) {
            //Check for errors in the request function
            utils.checkError(error, {code: 971}, cb, () => {
                utils.checkError(body.error, { code: 977 }, cb, () => {
                    utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
                        //Standardize the reponse
                        let envVars = [];
                        if(body.env_vars && body.env_vars.length > 0) {
                            body.env_vars.forEach(function (envVar) {
                                let oneVar = {
                                    "id": envVar.id,
                                    "name": envVar.name,
                                    "value": envVar.value, //returned only if public is set to true
                                    "public": envVar.public,
                                    "repoId": envVar.repository_id
                                };
                                envVars.push(oneVar);
                            });
                        }
                        return cb (null, envVars);
                    });
                });
            });
        });
    },

    /**
     * Adds an environment variable to a repository
     * @param opts
     * @param cb
     */
    addEnvVar (opts, cb) {
        let params = {};

        params.uri = "https://" + opts.settings.domain + config.headers.api.url.addEnvVar + opts.settings.repoId + "&access_token=" + opts.settings.ciToken;
        params.headers = {
            "User-Agent": config.headers.userAgent,
            "Accept": config.headers.accept,
            "Content-Type": config.headers.contentType,
            "Host": opts.settings.domain
        };
        params.json = true;

        params.body = {
            "env_var": opts.settings.envVar
        };
        opts.log.debug(params);
        //send the request to obtain the Travis token
        request.post(params, function (error, response, body) {
            //Check for errors in the request function
            utils.checkError(error, {code: 971}, cb, () => {
                utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
                    return cb(null, true);
                });
            });
        });
    },

    /**
     * Updates an environment variable in a repository
     * @param opts
     * @param cb
     */
    updateEnvVar (opts, cb) {
        utils.checkError(!opts.settings.varID, {code: 978}, cb, () => {
            let params = {};

            //replace the environment variable ID in the URI
            params.uri = "https://" + opts.settings.domain + config.headers.api.url.updateEnvVar + opts.settings.repoId + "&access_token=" + opts.settings.ciToken;
            params.uri = params.uri.replace("#ENV_ID#", opts.settings.varID);

            params.headers = {
                "User-Agent": config.headers.userAgent,
                "Accept": config.headers.accept,
                "Content-Type": config.headers.contentType,
                "Host": opts.settings.domain
            };
            params.json = true;

            params.body = {
                "env_var": opts.settings.envVar
            };
            opts.log.debug(params);
            //send the request to obtain the Travis token
            request.patch(params, function (error, response, body) {
                //Check for errors in the request function
                utils.checkError(error, {code: 971}, cb, () => {
                    utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
                        utils.checkError(body.error === "Could not find a requested setting", {code: 979}, cb, () => {
                            return cb(null, true);
                        });
                    });
                });
            });
        });
    },

    /**
     * Deletes an environment variable in a repository
     * @param opts
     * @param cb
     */
    deleteEnvVar (opts, cb) {
        utils.checkError(!opts.settings.varID, {code: 978}, cb, () => {
            let params = {};

            //replace the environment variable ID in the URI
            params.uri = "https://" + opts.settings.domain + config.headers.api.url.deleteEnvVar + opts.settings.repoId + "&access_token=" + opts.settings.ciToken;
            params.uri = params.uri.replace("#ENV_ID#", opts.settings.varID);

            params.headers = {
                "User-Agent": config.headers.userAgent,
                "Accept": config.headers.accept,
                "Content-Type": config.headers.contentType,
                "Host": opts.settings.domain
            };
            params.json = true;

            params.body = {
                "env_var": opts.settings.envVar
            };
            opts.log.debug(params);
            //send the request to obtain the Travis token
            request.delete(params, function (error, response, body) {
                //Check for errors in the request function
                utils.checkError(error, {code: 971}, cb, () => {
                    utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
                        utils.checkError(body.error === "Could not find a requested setting", {code: 979}, cb, () => {
                            return cb(null, true);
                        });
                    });
                });
            });
        });
    },

    /**
     * Lists all the hooks
     * @param opts
     * @param cb
     */
    listHooks (opts, cb) {
        let params = {};

        params.uri = "https://" + opts.settings.domain + config.headers.api.url.listHooks + "?access_token=" + opts.settings.ciToken;
        params.headers = {
            "User-Agent": config.headers.userAgent,
            "Accept": config.headers.accept,
            "Content-Type": config.headers.contentType,
            "Host": opts.settings.domain
        };
        params.json = true;

        params.body = {
            "env_var": opts.settings.envVar
        };

        opts.log.debug(params);
        //send the request to obtain the Travis token
        request.get(params, function (error, response, body) {

            //Check for errors in the request function
            utils.checkError(error, {code: 971}, cb, () => {
                utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
                    let resHooks = [];
                    //Standardize response
                    body.hooks.forEach(function(oneHook){
                        let hook = {
                            "id": oneHook.id,
                            "name": oneHook.name,
                            "owner": oneHook.owner_name,
                            "description": oneHook.description,
                            "active": oneHook.active,
                            "private": oneHook.private,
                            "admin": oneHook.admin
                        };
                        resHooks.push(hook);
                    });
                    return cb(null, resHooks);
                });
            });
        });
    },

    /**
     * activate/deactivate hook
     * @param opts
     * @param cb
     */
    setHook (opts, cb) {
        let params = {};

        params.uri = "https://" + opts.settings.domain + config.headers.api.url.setHook + "?access_token=" + opts.settings.ciToken;
        params.headers = {
            "User-Agent": config.headers.userAgent,
            "Accept": config.headers.accept,
            "Content-Type": config.headers.contentType,
            "Host": opts.settings.domain
        };
        params.json = true;

        params.body = {
            "hook": opts.hook
        };
        opts.log.debug(params);

        //send the request to obtain the Travis token
        request.put(params, function (error, response, body) {
            //Check for errors in the request function
            utils.checkError(error, {code: 971}, cb, () => {
                utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
                    utils.checkError(body === "Sorry, we experienced an error.", {code: 980}, cb, () => {
                        return cb(null, true)
                    });
                });
            });
        });
    },

	/**
	 * Function that lists general settings of a travis repo
	 * @param  {Object}   opts
	 * @param  {Function} cb
	 *
	 */
	listSettings (opts, cb) {
		let params = {};

		//check if an access token is provided
		utils.checkError(!opts.settings.ciToken, {code: 974}, cb, () => {
			//check if the repositories owner name is provided
			utils.checkError(!opts.settings && !opts.settings.owner, {code: 975}, cb, () => {
				let finalUrl = config.headers.api.url.listSettings.replace('#REPO_ID#', opts.params.repoId);

				if(opts.settings.ciToken){
					finalUrl += "?access_token=" + opts.settings.ciToken;
				}

				params.uri = "https://" + opts.settings.domain + finalUrl;

				params.headers = {
					"User-Agent": config.headers.userAgent,
					"Accept": config.headers.accept,
					"Content-Type": config.headers.contentType,
					"Host": opts.settings.domain
				};
				params.json = true;


				opts.log.debug(params);
				//send the request to obtain the repos
				request.get(params, function (error, response, body) {
					utils.checkError(error, {code: 981}, cb, () => {
						utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
							/*
							Sample output:
							{
								"settings": {
									"builds_only_with_travis_yml": true,
									"build_pushes": true,
									"build_pull_requests": true,
									"maximum_number_of_builds": 0
								}
							}
							 */
							return cb(null, body.settings);
						});
					});
				});
			});
		});
	}
};

module.exports = lib;
