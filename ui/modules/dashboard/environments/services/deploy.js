"use strict";
var deployService = soajsApp.components;
deployService.service('deploySrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

    /**
     * Deploy New Environment controller + Nginx
     * @param currentScope
     */
    function deployEnvironment(currentScope) {
        var formConfig = angular.copy(environmentsConfig.form.deploy);
        var kubeConfig = environmentsConfig.deployer.kubernetes;
        var envCode = currentScope.envCode;

        currentScope.isKubernetes = (currentScope.envDeployer.selected.split('.')[1] === "kubernetes");
        if (currentScope.isKubernetes) {
            formConfig.entries[0].entries[0].value = [
                {l: 'Deployment', v: 'deployment', 'selected': true},
                {l: 'Daemonset', v: 'daemonset'}
            ];

            formConfig.entries[1].entries[0].value = [
                {l: 'Deployment', v: 'deployment', 'selected': true},
                {l: 'Daemonset', v: 'daemonset'}
            ];
        }

        formConfig.entries[0].entries[0].onAction = function (id, data, form) {
            if (data === 'global' || data === 'daemonset') {
                form.entries[0].entries[1].disabled = true;
                form.entries[0].entries[1].required = false;
            }
            else {
                delete form.entries[0].entries[1].disabled;
                form.entries[0].entries[1].required = true;
            }
        };

        formConfig.entries[1].entries[0].onAction = function (id, data, form) {
            if (data === 'global' || data === 'daemonset') {
                form.entries[1].entries[1].disabled = true;
                form.entries[1].entries[1].required = false;
            }
            else {
                delete form.entries[1].entries[1].disabled;
                form.entries[1].entries[1].required = true;
            }
        };

        getControllerBranches(currentScope, function (branchInfo) {
            for (var i = 0; i < formConfig.entries.length; i++) {
                if (formConfig.entries[i].name === 'controllers') {
                    var ctrlEntries = formConfig.entries[i].entries;
                    for (var j = 0; j < ctrlEntries.length; j++) {
                        if (ctrlEntries[j].name === 'branch') {
                            branchInfo.branches.forEach(function (oneBranch) {
                                delete oneBranch.commit.url;
                                ctrlEntries[j].value.push({'v': oneBranch, 'l': oneBranch.name});
                            });
                        }
                    }
                }
            }

            getCatalogRecipes(currentScope, function (recipes) {
                // adding available recipes to form
                recipes.forEach(function (oneRecipe) {
                    if (oneRecipe.type === 'service') {
                        formConfig.entries[1].entries[4].value.push({ l: oneRecipe.name, v: oneRecipe._id });
                    }
                    else if (oneRecipe.type === 'nginx') {
                        formConfig.entries[0].entries[3].value.push({ l: oneRecipe.name, v: oneRecipe._id });
                    }
                });

                var options = {
                    timeout: $timeout,
                    form: formConfig,
                    name: 'deployEnv',
                    label: translation.deployEnvironment[LANG] + ' ' + envCode,
                    actions: [
                        {
                            'type': 'submit',
                            'label': translation.submit[LANG],
                            'btn': 'primary',
                            'action': function (formData) {
                                if ((!formData.controllers || formData.controllers < 1) && (formData.controllerDeploymentMode === 'replicated' || formData.controllerDeploymentMode === 'deployment')) {
                                    $timeout(function () {
                                        alert(translation.youMustChooseLeastControllerDeployEnvironment[LANG]);
                                    }, 100);
                                }
                                else {
                                    var text = "<h2>" + translation.deployingNew[LANG] + envCode + " Environment</h2>";
                                    text += "<p>" + translation.deploying[LANG] + formData.controllers + translation.newControllersEnvironment[LANG] + envCode + ".</p>";
                                    text += "<p>" + translation.deploying[LANG] + formData.nginxCount + translation.newNginxEnvironment[LANG] + envCode + ".</p>";
                                    text += "<p>" + translation.doNotRefreshThisPageThisWillTakeFewMinutes[LANG] + "</p>";
                                    text += "<div id='progress_deploy_" + envCode + "' style='padding:10px;'></div>";
                                    jQuery('#overlay').html("<div class='bg'></div><div class='content'>" + text + "</div>");
                                    jQuery("#overlay .content").css("width", "40%").css("left", "30%");
                                    overlay.show();

                                    formData.owner = branchInfo.owner;
                                    formData.repo = branchInfo.repo;

                                    deployEnvironment(formData);
                                }

                            }
                        },
                        {
                            'type': 'reset',
                            'label': translation.cancel[LANG],
                            'btn': 'danger',
                            'action': function () {
                                currentScope.modalInstance.dismiss('cancel');
                                currentScope.form.formData = {};
                            }
                        }
                    ]
                };
                buildFormWithModal(currentScope, $modal, options);
            });
        });

        function deployEnvironment(formData) {
            var branchObj = JSON.parse(formData.branch);

            var params = {
                proxy: false,
                env: envCode,
                type: 'service',
                name: 'controller',
                recipe: formData.ctrlRecipe,
                gitSource: {
                    owner: formData.owner,
                    repo: formData.repo,
                    branch: branchObj.name,
                    commit: branchObj.commit.sha
                },
                deployConfig: {
                    memoryLimit: formData.ctrlMemoryLimit * 1048576,
                    isKubernetes: (currentScope.isKubernetes ? true : false),
                    replication: {
                        mode: formData.controllerDeploymentMode
                    },
                },
                contentConfig: {}
            };

            if (formData.controllerDeploymentMode === 'replicated' || formData.nginxDeploymentMode === 'deployment') {
                params.deployConfig.replication.replicas = formData.controllers;
            }

            if (params.deployConfig.isKubernetes) {
                if (params.deployConfig.replication.mode === 'replicated') {
                    params.deployConfig.replication.mode = "deployment";
                }
                if (params.deployConfig.replication.mode === 'global') {
                    params.deployConfig.replication.mode = "daemonset";
                    delete params.deployConfig.replication.replicas;
                }
            }

            getSendDataFromServer(currentScope, ngDataApi, {
                "method": "post",
                "routeName": "/dashboard/cloud/services/soajs/deploy",
                "data": params
            }, function (error, response) {
                if (error) {
                    overlay.hide();
                    currentScope.form.displayAlert('danger', error.message);
                }
                else {
                    waitForControllers(function () {
                        deployNginx(formData, params);
                    });
                }
            });
        }

        function waitForControllers(cb) {
            currentScope.listServices(function () {
                if (currentScope.controllers.length > 0) {
                    return cb();
                }
                else {
                    $timeout(function () {
                        waitForControllers(cb);
                    }, 1500);

                }
            });
        }

        function listStaticContent(currentScope, cb) {
            getSendDataFromServer(currentScope, ngDataApi, {
                'method': 'post',
                'routeName': '/dashboard/staticContent/list'
            }, function (error, response) {
                if (error) {
                    currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
                } else {
                    cb(response);
                }
            });
        }

        function getControllerBranches(currentScope, cb) {
            overlayLoading.show();
            getSendDataFromServer(currentScope, ngDataApi, {
                method: 'get',
                routeName: '/dashboard/gitAccounts/getBranches',
                params: {
                    name: 'controller',
                    type: 'service'
                }
            }, function (error, response) {
                overlayLoading.hide();
                if (error) {
                    currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
                }
                else {
                    return cb(response);
                }
            });
        }

        function deployNginx(formData, params) {
            params.type = 'nginx';
            params.name = 'nginx';
            params.recipe = formData.nginxRecipe;
            params.deployConfig.memoryLimit = (formData.nginxMemoryLimit * 1048576);
            params.deployConfig.replication = {
                mode: formData.nginxDeploymentMode
            };

            if (formData.nginxDeploymentMode === 'replicated' || formData.nginxDeploymentMode === 'deployment') {
                params.deployConfig.replication.replicas = formData.nginxCount;
            }

            if (params.deployConfig.isKubernetes) {
                if (params.deployConfig.replication.mode === 'replicated') {
                    params.deployConfig.replication.mode = "deployment";
                }
                if (params.deployConfig.replication.mode === 'global') {
                    params.deployConfig.replication.mode = "daemonset";
                    delete params.deployConfig.replication.replicas;
                }
            }

            getSendDataFromServer(currentScope, ngDataApi, {
                "method": "post",
                "routeName": "/dashboard/cloud/services/soajs/deploy",
                "data": params
            }, function (error, response) {
                if (error) {
                    currentScope.form.displayAlert('danger', error.message);
                    rollbackController();
                    overlay.hide();
                }
                else {
                    currentScope.modalInstance.dismiss("ok");
                    overlay.hide(function () {

                        currentScope.isDeploying = true;
                        $timeout(function () {
                            currentScope.listServices();
                        }, 1500);
                    });
                }
            });
        }

        function rollbackController() {
            var params = {
                env: currentScope.envCode,
                serviceId: currentScope.envCode.toLowerCase() + "-controller"
            };

            getSendDataFromServer(currentScope, ngDataApi, {
                method: 'delete',
                routeName: '/dashboard/cloud/services/delete',
                params: params
            }, function (error, response) {
                if (error) {
                    currentScope.displayAlert('danger', error.message);
                }
            });
        }
    }

    /**
     * Deploy New controller/service/daemon
     * @param currentScope
     */
    function deployNewService(currentScope) {
        if (currentScope.envPlatform.toLowerCase() === 'kubernetes') {
            currentScope.deploymentModes = ['deployment', 'daemonset'];
            currentScope.mode = 'deployment';
        }
        else {
            currentScope.deploymentModes = ['replicated', 'global'];
            currentScope.mode = 'replicated';
        }

        var env = currentScope.envCode;
        var runningHosts = currentScope.hosts;

        currentScope.isKubernetes = (currentScope.envDeployer.selected.split('.')[1] === "kubernetes");
        currentScope.services = [];
        currentScope.service = "";
        currentScope.versions = [];
        currentScope.version = "";
        currentScope.groupConfigs = "";
        currentScope.groupConfig = "";
        currentScope.branches = [];
        currentScope.branch = "";
        currentScope.recipes = [];
        currentScope.recipe = "";
        currentScope.serviceOwner = '';
        currentScope.serviceRepo = '';
        currentScope.envVariables = '';
        currentScope.conflict = false;
        currentScope.loadingBranches = false;
        delete currentScope.conflictCommits;
        currentScope.confirmBranch = '';
        delete currentScope.replicaCount;
        delete currentScope.exposedPort;
        currentScope.memoryLimit = 200;
        currentScope.useLocalSOAJS = true;
        currentScope.message = {};
        currentScope.defaultEnvVariables = "<ul><li>SOAJS_DEPLOY_HA=true</li><li>SOAJS_SRV_AUTOREGISTERHOST=true</li><li>NODE_ENV=production</li><li>SOAJS_ENV=" + currentScope.envCode + "</li><li>SOAJS_PROFILE=" + currentScope.profile + "</li></ul></p>";
        currentScope.imagePrefix = 'soajsorg';

        if (currentScope.isKubernetes) {
            currentScope.readinessProbe = { //NOTE: default values are set here
                initialDelaySeconds: 15,
                timeoutSeconds: 1,
                periodSeconds: 10,
                successThreshold: 1,
                failureThreshold: 3
            };
        }

        function openModalForm() {
            $modal.open({
                templateUrl: "deployNewService.tmpl",
                size: 'lg',
                backdrop: true,
                keyboard: true,
                controller: function ($scope, $modalInstance) {
                    fixBackDrop();

                    $scope.title = 'Deploy New Service';
                    $scope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
                    $scope.currentScope = currentScope;

                    $scope.selectService = function (service) {

                        if (service.name === 'controller') {
                            currentScope.versions = [1];
                        }
                        else {
                            currentScope.versions = Object.keys(service.versions);
                        }

                        if (currentScope.version) {
                            currentScope.version = "";
                        }
                        if (currentScope.versions.length === 1) {
                            currentScope.version = currentScope.versions[0];
                        }

                        currentScope.branches = [];
                        currentScope.branch = '';
                        currentScope.groupConfigs = '';
                        currentScope.conflict = '';
                        currentScope.conflictCommits = {};

                        if (service && service.prerequisites && service.prerequisites.memory) {
                            currentScope.memoryLimit = service.prerequisites.memory;
                        }

                        if (service.type === 'nginx') return;

                        if (service.type === 'daemon' && service.grpConf) {
                            currentScope.groupConfigs = service.grpConf;
                        }

                        currentScope.loadingBranches = true;
                        getSendDataFromServer(currentScope, ngDataApi, {
                            method: 'get',
                            routeName: '/dashboard/gitAccounts/getBranches',
                            params: {
                                'name': service.name,
                                'type': service.type
                            }
                        }, function (error, response) {
                            if (error) {
                                currentScope.message.danger = error.message;
                                $timeout(function () {
                                    currentScope.message.danger = '';
                                }, 5000);
                            } else {
                                currentScope.branches = response.branches;
                                currentScope.serviceOwner = response.owner;
                                currentScope.serviceRepo = response.repo;
                                currentScope.loadingBranches = false;
                            }
                        });
                    };

                    $scope.selectBranch = function (branch) {
                        currentScope.conflict = false;
                        currentScope.conflictCommits = {};
                        if (runningHosts && runningHosts[currentScope.service.name]) {
                            var versions = Object.keys(runningHosts[currentScope.service.name].ips);
                            for (var i = 0; i < versions.length; i++) {
                                var instances = runningHosts[currentScope.service.name].ips[versions[i]];
                                for (var j = 0; j < instances.length; j++) {
                                    if (instances[j].commit !== branch.commit.sha) {
                                        currentScope.conflict = true;
                                        instances[j].version = versions[i];
                                        if (currentScope.conflictCommits[instances[j].commit]) {
                                            currentScope.conflictCommits[instances[j].commit].instances.push(instances[j]);
                                        } else {
                                            currentScope.conflictCommits[instances[j].commit] = {};
                                            currentScope.conflictCommits[instances[j].commit].branch = instances[j].branch;
                                            currentScope.conflictCommits[instances[j].commit].instances = [];
                                            currentScope.conflictCommits[instances[j].commit].instances.push(instances[j]);
                                        }
                                    }
                                }
                            }
                        }
                    };

                    $scope.confirmBranchSelection = function () {
                        //clear previously selected commit if any
                        currentScope.commit = '';
                    };

                    $scope.onSubmit = function () {

                        if (!currentScope.service || (currentScope.service.type !== 'nginx' && (!currentScope.branch || ((currentScope.mode === "replicated" || currentScope.mode === "deployment") && !currentScope.number)))) {
                            currentScope.message.danger = "Please select a service, branch, and number of instances";
                            $timeout(function () {
                                currentScope.message.danger = "";
                            }, 5000);
                        }
                        else if (currentScope.conflictCommits && Object.keys(currentScope.conflictCommits).length > 0 && !currentScope.commit && !currentScope.confirmBranch) {
                            currentScope.message.danger = "Please select a commit to deploy from or confirm deployment from new branch";
                            $timeout(function () {
                                currentScope.message.danger = "";
                            }, 5000);
                        }
                        else {

                            if (currentScope.service && currentScope.service.prerequisites && currentScope.service.prerequisites.memory) {
                                if (currentScope.memoryLimit < currentScope.service.prerequisites.memory) {
                                    currentScope.message.danger = "Please specify a memory limit that is greater than or equal to the service's memory prerequisite (" + currentScope.service.prerequisites.memory + " MB)";
                                    $timeout(function () {
                                        currentScope.message.danger = "";
                                    }, 5000);

                                    return;
                                }
                            }

                            if (currentScope.service.name === 'controller') {
                                newController(currentScope);
                            }
                            else {
                                newService(currentScope);
                            }
                        }
                    };

                    $scope.closeModal = function () {
                        $modalInstance.close();
                    };

                    function newController(currentScope) {
                        var params = {
                            'env': env,
                            'name': 'controller',
                            'type': 'service',
                            'recipe': currentScope.recipe
                        };

                        params.gitSource = {
                            "owner": currentScope.serviceOwner,
                            "repo": currentScope.serviceRepo,
                        };

                        if (currentScope.commit && !currentScope.confirmBranch) {
                            params.gitSource.branch = getBranchFromCommit(currentScope.commit);
                            params.gitSource.commit = currentScope.commit;
                        } else {
                            params.gitSource.branch = currentScope.branch.name;
                            params.gitSource.commit = currentScope.branch.commit.sha;
                        }

                        if (currentScope.service.latest) {
                            params.version = currentScope.service.latest;
                        }

                        //Fill deployConfig information
                        params.deployConfig = {
                            'isKubernetes': currentScope.isKubernetes,
                            "replication": {
                                "mode": currentScope.mode,
                                "replicas": currentScope.number,
                            }
                        };

                        overlayLoading.show();
                        getSendDataFromServer(currentScope, ngDataApi, {
                            "method": "post",
                            "routeName": "/dashboard/cloud/services/soajs/deploy",
                            "data": params
                        }, function (error, response) {
                            overlayLoading.hide();
                            if (error) {
                                currentScope.generateNewMsg(env, 'danger', error.message);
                                $modalInstance.close();
                            }
                            else {
                                $timeout(function () {
                                    currentScope.listServices();
                                }, 1500);

                                $modalInstance.close();
                            }
                        });
                    }

                    function newService(currentScope) {
                        var params = {
                            'env': env,
                            'type': 'service',
                            "version": parseInt(currentScope.version),
                            'recipe': currentScope.recipe
                        };

                        params.gitSource = {
                            "owner": currentScope.serviceOwner,
                            "repo": currentScope.serviceRepo,
                        };

                        if (currentScope.commit && !currentScope.confirmBranch) {
                            params.gitSource.branch = getBranchFromCommit(currentScope.commit);
                            params.gitSource.commit = currentScope.commit;
                        } else {
                            params.gitSource.branch = currentScope.branch.name;
                            params.gitSource.commit = currentScope.branch.commit.sha;
                        }

                        if (currentScope.service.gcId) {
                            params.contentConfig = {
                                "service": {
                                    "gc": true,
                                    "gcName": currentScope.service.name,
                                    "gcVersion": currentScope.service.version
                                }
                            }

                        } else {
                            params.name = currentScope.service.name;
                        }

                        if (currentScope.groupConfig) {
                            params.type = 'daemon';
                            params.contentConfig = {
                                "daemon": {
                                    "grpConfName": currentScope.groupConfig.daemonConfigGroup
                                }
                            }
                        }

                        params.deployConfig = {
                            'isKubernetes': currentScope.isKubernetes,
                            'memoryLimit': (currentScope.memoryLimit * 1048576), //converting to bytes
                            "replication": {
                                "mode": currentScope.mode,
                                "replicas": currentScope.number
                            }
                        };

                        if (params.deployConfig.isKubernetes) {
                            if (params.deployConfig.replication.mode === 'replicated') {
                                params.deployConfig.replication.mode = "deployment";
                            }
                            if (params.deployConfig.replication.mode === 'global') {
                                params.deployConfig.replication.mode = "daemonset";
                                delete params.deployConfig.replication.replicas;
                            }
                        }

                        var config = {
                            "method": "post",
                            "routeName": "/dashboard/cloud/services/soajs/deploy",
                            "data": params
                        };
                        overlayLoading.show();
                        getSendDataFromServer(currentScope, ngDataApi, config, function (error, response) {
                            overlayLoading.hide();
                            if (error) {
                                currentScope.displayAlert('danger', error.message);
                                $modalInstance.close();
                            }
                            else {
                                currentScope.displayAlert('success', 'New service deployed successfully and will be available in a few minutes');
                                $timeout(function () {
                                    currentScope.listServices();
                                }, 1500);

                                $modalInstance.close();
                            }
                        });
                    }

                    function getBranchFromCommit(commit) {
                        return currentScope.conflictCommits[commit].branch;
                    }
                }
            });
        }

        function getServices(cb) {
            getSendDataFromServer(currentScope, ngDataApi, {
                method: 'post',
                routeName: '/dashboard/services/list'
            }, function (error, response) {
                if (error) {
                    currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveListServices[LANG]);
                } else {
                    response.forEach(function (oneService) {
                        oneService.type = 'service';
                        if (oneService.name === 'controller') {
                            oneService.UIGroup = 'Controllers';
                        } else {
                            oneService.UIGroup = 'Services';
                        }
                        if (allowListing(env, oneService)) {
                            currentScope.services.push(oneService);
                        }
                    });
                    return cb();
                }
            });
        }

        function getDaemons(cb) {
            getSendDataFromServer(currentScope, ngDataApi, {
                method: 'post',
                routeName: '/dashboard/daemons/list',
                params: {
                    'getGroupConfigs': true
                }
            }, function (error, response) {
                if (error) {
                    currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveDaemonsHostsInformation[LANG]);
                } else {
                    response.forEach(function (oneDaemon) {
                        if (allowListing(env, oneDaemon)) {
                            oneDaemon.type = 'daemon';
                            oneDaemon.UIGroup = 'Daemons';
                            currentScope.services.push(oneDaemon);
                        }
                    });
                    return cb();
                }
            });
        }

        function getCatalogRecipes(cb) {
            currentScope.loadingRecipes = true;
            getSendDataFromServer(currentScope, ngDataApi, {
                method: 'get',
                routeName: '/dashboard/catalog/recipes/list'
            }, function (error, response) {
                currentScope.loadingRecipes = false;
                if (error) {
                    currentScope.generateNewMsg(env, 'danger', 'Unable to retrieve catalog recipes');
                }
                else {
                    currentScope.recipes = {};
                    response.forEach(function (oneRecipe) {
                        if (!currentScope.recipes[oneRecipe.type]) {
                            currentScope.recipes[oneRecipe.type] = [];
                        }
                        currentScope.recipes[oneRecipe.type].push(oneRecipe);
                    });
                    return cb();
                }
            });
        }

        function allowListing(env, service) {
            var dashboardServices = ['controller', 'dashboard', 'proxy', 'urac', 'oauth']; //locked services that the dashboard environment is allowed to have
            var nonDashboardServices = ['controller', 'urac', 'oauth']; //locked services that non dashboard environments are allowed to have
            if (env.toLowerCase() === 'dashboard' && dashboardServices.indexOf(service.name) !== -1) {
                return filterServiceInfo(service);
            } else if (env.toLowerCase() !== 'dashboard' &&
                // service.name !== 'controller' && //controller is added later manually
                (
                    //not a locked service for dashboard and non dashboard environments
                    (dashboardServices.indexOf(service.name) !== -1 && nonDashboardServices.indexOf(service.name) !== -1) ||
                    //a locked service that is common for dashboard and non dash envs (urac, oauth)
                    (dashboardServices.indexOf(service.name) === -1 && nonDashboardServices.indexOf(service.name) === -1)
                )
            ) {
                return filterServiceInfo(service);
            }
            return false;
        }

        //filter out service information that already exist
        function filterServiceInfo(service) {
            var deployedServices = [];
            var group = service.group;
            if (group && group !== '') {
                group = group.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')
            }
            if (currentScope.hosts.soajs.groups && currentScope.hosts.soajs.groups[group]) {
                deployedServices = currentScope.hosts.soajs.groups[group].list;
            }

            if (!service.group && service.name === 'controller') {
                if (currentScope.hosts.soajs.groups) {
                    var found = false;
                    for (var groupName in currentScope.hosts.soajs.groups) {
                        currentScope.hosts.soajs.groups[groupName].list.forEach(function (oneService) {
                            if (oneService.name === env.toLowerCase() + '-controller') {
                                found = true;
                            }
                        });
                    }
                    if (!found) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
                return true;
            }
            else {
                var serviceVersions = Object.keys(service.versions);
                serviceVersions.forEach(function (version) {
                    for (var i = 0; i < deployedServices.length; i++) {
                        //if a version of that service is found to be deployed, delete it from the service information
                        if (service.name === deployedServices[i].labels['soajs.service.name'] && version == deployedServices[i].labels['soajs.service.version']) {
                            delete service.versions[version];
                        }
                    }
                });

                //if all the versions of the service are found to be deployed, return false
                //else, return true, after having removed the deployed versions
                if (Object.keys(service.versions).length === 0)
                    return false;
                else
                    return true;
            }
        }

        //Start here
        if (currentScope.hosts && currentScope.controllers) {
            getServices(function () {
                getDaemons(function () {
                    if (Object.keys(currentScope.services).length === 0) {
                        currentScope.generateNewMsg(env, 'danger', "There are no new services to deploy");
                    }
                    else {
                        getCatalogRecipes(function () {
                            openModalForm();
                        });
                    }
                });
            });
        }
        else {
            currentScope.services.push({
                name: 'controller',
                UIGroup: 'Controllers',
                type: 'service'
            });
        }
    }

    /**
     * Deploy New Nginx
     * @param currentScope
     */
    function deployNewNginx(currentScope) {
        var formConfig = angular.copy(environmentsConfig.form.deploy);
        formConfig.entries.pop();

        var kubeConfig = environmentsConfig.deployer.kubernetes;
        var envCode = currentScope.envCode;

        currentScope.isKubernetes = (currentScope.envDeployer.selected.split('.')[1] === "kubernetes");
        if (currentScope.isKubernetes) {
            formConfig.entries[0].entries[0].value = [
                {l: 'Deployment', v: 'deployment', 'selected': true},
                {l: 'Daemonset', v: 'daemonset'}
            ];
        }

        formConfig.entries[0].entries[0].onAction = function (id, data, form) {
            if (data === 'global') {
                form.entries[0].entries[1].disabled = true;
                form.entries[0].entries[1].required = false;
            }
            else {
                delete form.entries[0].entries[1].disabled;
                form.entries[0].entries[1].required = true;
            }
        };

        getCatalogRecipes(currentScope, function (recipes) {
            // adding available recipes to form
            recipes.forEach(function (oneRecipe) {
                if (oneRecipe.type === 'nginx') {
                    formConfig.entries[0].entries[3].value.push({ l: oneRecipe.name, v: oneRecipe._id });
                }
            });

            var options = {
                timeout: $timeout,
                form: formConfig,
                name: 'deployEnv',
                label: translation.deployEnvironment[LANG] + ' ' + envCode,
                actions: [
                    {
                        'type': 'submit',
                        'label': translation.submit[LANG],
                        'btn': 'primary',
                        'action': function (formData) {
                            var text = "<h2>Deploying New Nginx in " + envCode + " Environment</h2>";
                            text += "<p>" + translation.deploying[LANG] + formData.nginxCount + translation.newNginxEnvironment[LANG] + envCode + ".</p>";
                            text += "<p>" + translation.doNotRefreshThisPageThisWillTakeFewMinutes[LANG] + "</p>";
                            text += "<div id='progress_deploy_" + envCode + "' style='padding:10px;'></div>";
                            jQuery('#overlay').html("<div class='bg'></div><div class='content'>" + text + "</div>");
                            jQuery("#overlay .content").css("width", "40%").css("left", "30%");
                            overlay.show();

                            var params = {
                                "env": envCode.toLowerCase(),
                                gitSource: {
                                    owner: "",
                                    repo: "",
                                    branch: "",
                                    commit: ""
                                },
                                contentConfig: {},
                                deployConfig: {
                                    isKubernetes: currentScope.isKubernetes
                                }
                            };
                            deployNginx(formData, params);
                        }
                    },
                    {
                        'type': 'reset',
                        'label': translation.cancel[LANG],
                        'btn': 'danger',
                        'action': function () {
                            currentScope.modalInstance.dismiss('cancel');
                            currentScope.form.formData = {};
                        }
                    }
                ]
            };
            buildFormWithModal(currentScope, $modal, options);
        });

        function listStaticContent(currentScope, cb) {
            getSendDataFromServer(currentScope, ngDataApi, {
                'method': 'post',
                'routeName': '/dashboard/staticContent/list'
            }, function (error, response) {
                if (error) {
                    currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
                } else {
                    cb(response);
                }
            });
        }

        function deployNginx(formData, params) {
            params.type = 'nginx';
            params.name = 'nginx';
            params.recipe = formData.nginxRecipe;
            params.deployConfig.memoryLimit = (formData.nginxMemoryLimit * 1048576);
            params.deployConfig.replication = {
                mode: formData.nginxDeploymentMode
            };

            if (formData.nginxDeploymentMode === 'replicated' || formData.nginxDeploymentMode === 'deployment') {
                params.deployConfig.replication.replicas = formData.nginxCount;
            }

            if (params.deployConfig.isKubernetes) {
                if (params.deployConfig.replication.mode === 'replicated') {
                    params.deployConfig.replication.mode = "deployment";
                }
                if (params.deployConfig.replication.mode === 'global') {
                    params.deployConfig.replication.mode = "daemonset";
                    delete params.deployConfig.replication.replicas;
                }
            }

            getSendDataFromServer(currentScope, ngDataApi, {
                "method": "post",
                "routeName": "/dashboard/cloud/services/soajs/deploy",
                "data": params
            }, function (error, response) {
                if (error) {
                    currentScope.form.displayAlert('danger', error.message);
                    overlay.hide();
                }
                else {
                    currentScope.modalInstance.dismiss("ok");
                    overlay.hide(function () {

                        currentScope.isDeploying = true;
                        $timeout(function () {
                            currentScope.listServices();
                        }, 1500);
                    });
                }
            });
        }

    }

    function getCatalogRecipes(currentScope, cb) {
        overlayLoading.show();
        getSendDataFromServer(currentScope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/catalog/recipes/list'
        }, function (error, response) {
            overlayLoading.hide();
            if (error) {
                currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
            }
            else {
                return cb(response);
            }
        });
    }

    return {
        'deployEnvironment': deployEnvironment,
        'deployNewService': deployNewService,
        'deployNewNginx': deployNewNginx
    }
}]);
