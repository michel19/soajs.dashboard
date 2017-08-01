"use strict";

/**
 * Custom configuration values
 */
var titlePrefix = "SOAJS";
var mydomain = "test.org";
var mydomainport = location.port;
if (mydomainport && mydomainport !== 80) {
	mydomain += ":" + mydomainport;
}
var protocol = window.location.protocol;
var themeToUse = "default";
var whitelistedDomain = ['localhost', '127.0.0.1', 'test-api.' + mydomain];
var apiConfiguration = {
	domain: protocol + '//test-api.' + mydomain,
	key: '9768f213413953fe65e98bce21c62c572427511245e3859235da9f56daa310f59033337cfd15eeec06ffbe147e8f11f782198cb9a18fe72d22cac36a466687760b937980d740bc41518aea8b275e0a01fb0ac8d986c12a5404466644a600a8a0'
};

var SOAJSRMS = ['soajs.controller','soajs.urac','soajs.oauth','soajs.dashboard','soajs.prx','soajs.gcs'];

var uiModuleDev = 'modules/dev';
var uiModuleStg = 'modules/stg';
var uiModuleProd = 'modules/prod';
var uiModuleQa = 'modules/qa';

var modules = {
	"develop": {
		"dashboard": {
			services: 'modules/dashboard/services/install.js',
			contentBuilder: 'modules/dashboard/contentBuilder/install.js',
			githubApp: 'modules/dashboard/gitAccounts/install.js',
			swaggerEditorApp: 'modules/dashboard/swaggerEditor/install.js',
			catalogs: 'modules/dashboard/catalogs/install.js',
			ci: 'modules/dashboard/ci/install.js',
			cd: 'modules/dashboard/cd/install.js'
		}
	},
	"manage": {
		"dashboard": {
			productization: 'modules/dashboard/productization/install.js',
			multitenancy: 'modules/dashboard/multitenancy/install.js',
			members: 'modules/dashboard/members/install.js',
			settings: 'modules/dashboard/settings/install.js'
		}
	},
	"deploy": {
		"dashboard": {
			environments: 'modules/dashboard/environments/install.js'
		}
	},
	"operate": {
		"dev": {
			urac: uiModuleDev + '/urac/install.js',
			contentManagement: uiModuleDev + '/contentManagement/install.js'
		},
		"qa": {
			urac: uiModuleQa + '/urac/install.js',
			contentManagement: uiModuleQa + '/contentManagement/install.js'
		},
		"stg": {
			urac: uiModuleStg + '/urac/install.js',
			contentManagement: uiModuleStg + '/contentManagement/install.js'
		},
		"prod": {
			urac: uiModuleProd + '/urac/install.js',
			contentManagement: uiModuleProd + '/contentManagement/install.js'
		}
	},
	"common": {
		"dashboard": {
			myAccount: 'modules/dashboard/myAccount/install.js'
		}
	}
};

var whitelistedRepos = [
	'soajs/soajs.examples',
	'soajs/soajs.jsconf',
	'soajs/soajs.artifact',
	'soajs/soajs.quick.demo',
	'soajs/soajs.nodejs.express',
	'soajs/soajs.nodejs.hapi',
	'soajs/soajs.java.jaxrs_jersey'
];
