'use strict';
var accessSchema = {
	"oneOf": [
		{"type": "boolean", "required": false},
		{"type": "array", "minItems": 1, "items": {"type": "string", "required": true}, "required": false}
	]
};

var serviceConfig = {
	"required": true,
	"type": "object",
	"properties": {
		"awareness": {
			"type": "object",
			"required": true,
			"properties": {
				"healthCheckInterval": {"type": "integer", "required": true}, // 5 seconds
				"autoRelaodRegistry": {"type": "integer", "required": true} // 5 minutes
			}
		},
		"agent": {
			"type": "object",
			"required": true,
			"properties": {
				"topologyDir": {"type": "string", "required": true} // 5 seconds
			}
		},
		"key": {
			"type": "object",
			"required": true,
			"properties": {
				"algorithm": {"type": "string", "required": true}, // 5 seconds
				"password": {"type": "string", "required": true} // 5 seconds
			}
		},
		"logger": { //ATTENTION: this is not all the properties for logger
			"type": "object",
			"required": true,
			"additionalProperties": true
		},
		"cors": {
			"type": "object",
			"required": true,
			"additionalProperties": true
		},
		"oauth": {
			"type": "object",
			"required": true,
			"properties": {
				"grants": {"type": "array", "items": {"type": "string", "required": true}, "required": true},
				"debug": {"type": "boolean", "required": true}
			}
		},
		"ports": {
			"type": "object",
			"required": true,
			"properties": {
				"controller": {"type": "integer", "required": true},
				"maintenanceInc": {"type": "integer", "required": true},
				"randomInc": {"type": "integer", "required": true}
			}
		},
		"cookie": {
			"type": "object",
			"required": true,
			"properties": {
				"secret": {"type": "string", "required": true}
			}
		},
		"session": {
			"type": "object",
			"required": true,
			"properties": {
				"name": {"type": "string", "required": true},
				"secret": {"type": "string", "required": true},
				"resave": {"type": "boolean", "required": true},
				"saveUninitialized": {"type": "boolean", "required": true},
				"cookie": {
					"type": "object",
					"required": true,
					"properties": {
						"path": {"type": "string", "required": true},
						"httpOnly": {"type": "boolean", "required": true},
						"secure": {"type": "boolean", "required": true},
						"domain": {"type": "string", "required": true},
						"maxAge": {"type": ["integer", "null"], "required": false}
					}
				}
			}
		}
	}
};

module.exports = {
	"serviceName": "dashboard",
	"servicePort": 4003,
	"hashIterations": 1024,
	"seedLength": 32,
	"extKeyRequired": true,
	"expDateTTL": 86400000,
	"hasher": {
		"hashIterations": 1024,
		"seedLength": 32
	},

	"errors": {
		"400": "Unable to add the environment record",
		"401": "Unable to update the environment record",
		"402": "Unable to get the environment records",
		"403": "Environment already exists",
		"404": "Unable to remove environment record",
		"405": "Invalid environment id provided",

		"409": "Invalid product id provided",
		"410": "Unable to add the product record",
		"411": "Unable to update the product record",
		"412": "Unable to get the product record",
		"413": "Product already exists",
		"414": "Unable to remove product record",
		"415": "Unable to add the product package",
		"416": "Unable to update the product package",
		"417": "Unable to get the product packages",
		"418": "Product package already exists",
		"419": "Unable to remove product package",

		"420": "Unable to add the tenant record",
		"421": "Unable to update the tenant record",
		"422": "Unable to get the tenant records",
		"423": "Tenant already exists",
		"424": "Unable to remove tenant record",

		"425": "Unable to add the tenant OAuth",
		"426": "Unable to update the tenant OAuth",
		"427": "Unable to get the tenant OAuth",
		"428": "Unable to remove tenant OAuth",

		"429": "Unable to add the tenant application",
		"430": "Unable to update the tenant application",
		"431": "Unable to get the tenant application",
		"432": "Unable to remove tenant application",
		"433": "Tenant application already exist",
		"434": "Invalid product code or package code provided",

		"435": "Unable to get the tenant application keys",
		"436": "Unable to add a new key to the tenant application",
		"437": "Unable to remove key from the tenant application",
		"438": "Invalid tenant Id provided",
		"439": "Invalid tenant oauth user Id provided",

		"440": "Unable to add the tenant application ext Key",
		"441": "Unable to update the tenant application ext Key",
		"442": "Unable to get the tenant application ext Keys",
		"443": "Unable to remove tenant application ext Key",
		"444": "Unable to get the tenant application configuration",
		"445": "Unable to update the tenant application configuration",
		"446": "Invalid environment provided",

		"447": "Unable to get tenant oAuth Users",
		"448": "tenant oAuth User already exists",
		"449": "Unable to add tenant oAuth User",
		"450": "Unable to remove tenant oAuth User",
		"451": "Unable to updated tenant oAuth User",

		"460": "Unable to find product",
		"461": "Unable to find package",

		"500": "This record is locked. You cannot delete it",
		"501": "This record is locked. You cannot modify or delete it",
		"502": "Invalid cluster name provided",
		"503": "Error adding new environment database",
		"504": "Environment cluster already exists",
		"505": "Error adding environment cluster",
		"506": "Error updating environment cluster",
		"507": "Invalid db Information provided for session database",
		"508": "cluster not found",
		"509": "environment database already exist",
		"510": "environment session database already exist",
		"511": "environment session database does not exist",
		"512": "environment database does not exist",
		"513": "Error updating environment database",
		"514": "Error removing environment database",

		"600": "Database error"

	},

	"schema": {
		"commonFields": {
			"description": {
				"source": ['body.description'],
				"required": false,
				"validation": {
					"type": "string"
				}
			},
			"id": {
				"source": ['query.id'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"name": {
				"source": ['body.name'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"_TTL": {
				"source": ['body._TTL'],
				"required": true,
				"validation": {
					"type": "string",
					"enum": ['6', '12', '24', '48', '72', '96', '120', '144', '168']
				}
			},
			'appId': {
				"source": ['query.appId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			'key': {
				"source": ['query.key'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			'acl': {
				'source': ['body.acl'],
				'required': false,
				'validation': {
					"type": "object",
					"additionalProperties": {
						"type": "object",
						"required": false,
						"properties": {
							"access": accessSchema,
							"apisPermission": {"type": "string", "enum": ["restricted"], "required": false},
							"apis": {
								"type": "object",
								"required": false,
								"patternProperties": {
									"^[_a-z\/][_a-zA-Z0-9\/:]*$": { //pattern to match an api route
										"type": "object",
										"required": true,
										"properties": {
											"access": accessSchema
										},
										"additionalProperties": false
									}
								}
							},
							"apisRegExp": {
								"type": "array",
								"required": false,
								"minItems": 1,
								"items": {
									"type": "object",
									"properties": {
										"regExp": {"type": "pattern", required: true, "pattern": /\.+/},
										"access": accessSchema
									},
									"additionalProperties": false
								}
							}
						},
						"additionalProperties": false
					}
				}
			},
			"cluster": {
				"required": true,
				"source": ['body.cluster'],
				"validation": {
					"type": "object",
					"properties": {
						"URLParam": {"type": "object", "properties": {}},
						"servers": {"type": "array", "items": {"type": "object", "required": true}},
						"extraParam": {"type": "object", "properties": {}}
					}
				}
			}
		},
		"/environment/list": {
			_apiInfo: {
				"l": "List Environments",
				"group": "Environment",
				"groupMain": true
			}
		},
		"/environment/add": {
			_apiInfo: {
				"l": "Add Environment",
				"group": "Environment"
			},
			"commonFields": ['description'],
			"code": {
				"source": ['body.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 4
				}
			},
			"services": {
				"source": ['body.services'],
				"required": true,
				"validation": {
					"type": "object",
					"properties": {
						"controller": {
							"required": true,
							"type": "object",
							"properties": {
								"maxPoolSize": {"type": "integer", "required": true},
								"authorization": {"type": "boolean", "required": true},
								"requestTimeout": {"type": "ineteger", "required": true},
								"requestTimeoutRenewal": {"type": "ineteger", "required": true}
							}
						},
						"config": serviceConfig
					}
				}
			}
		},
		"/environment/delete": {
			_apiInfo: {
				"l": "Delete Environment",
				"group": "Environment"
			},
			"commonFields": ['id']
		},
		"/environment/update": {
			_apiInfo: {
				"l": "Update Environment",
				"group": "Environment"
			},
			"commonFields": ['id', 'description'],
			"services": {
				"source": ['body.services'],
				"required": true,
				"validation": {
					"type": "object",
					"properties": {
						"controller": {
							"required": true,
							"type": "object",
							"properties": {
								"maxPoolSize": {"type": "integer", "required": true},
								"authorization": {"type": "boolean", "required": true},
								"requestTimeout": {"type": "ineteger", "required": true},
								"requestTimeoutRenewal": {"type": "ineteger", "required": true}
							}
						},
						"config": serviceConfig
					}
				}
			}
		},

		"/environment/dbs/list": {
			_apiInfo: {
				"l": "List Environment Databases",
				"group": "Environment"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/dbs/add": {
			_apiInfo: {
				"l": "Add Environment Database",
				"group": "Environment"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['body.name'], "required": true, "validation": {"type": "string", "required": true}},
			"cluster": {"source": ['body.cluster'], "required": true, "validation": {"type": "string", "required": true}},
			"tenantSpecific": {"source": ['body.tenantSpecific'], "required": false, "validation": {"type": "boolean", "required": true}},
			"sessionInfo": {
				"source": ['body.sessionInfo'],
				"required": false,
				"validation": {
					"type": "object",
					"required": true,
					"properties": {
						"store": {"type": "object", "required": true},
						"dbName": {"type": "string", "required": true},
						"expireAfter": {"type": "integer", "required": true},
						"collection": {"type": "string", "required": true},
						"stringify": {"type": "boolean", "required": true}
					}
				}
			}
		},
		"/environment/dbs/update": {
			_apiInfo: {
				"l": "Update Environment Database",
				"group": "Environment"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['body.name'], "required": true, "validation": {"type": "string", "required": true}},
			"cluster": {"source": ['body.cluster'], "required": true, "validation": {"type": "string", "required": true}},
			"tenantSpecific": {"source": ['body.tenantSpecific'], "required": false, "validation": {"type": "boolean", "required": true}},
			"sessionInfo": {
				"source": ['body.sessionInfo'],
				"required": false,
				"validation": {
					"type": "object",
					"required": true,
					"properties": {
						"store": {"type": "object", "required": true},
						"dbName": {"type": "string", "required": true},
						"expireAfter": {"type": "integer", "required": true},
						"collection": {"type": "string", "required": true},
						"stringify": {"type": "boolean", "required": true}
					}
				}
			}
		},
		"/environment/dbs/delete": {
			_apiInfo: {
				"l": "Delete Environment Database",
				"group": "Environment"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['query.name'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/dbs/updatePrefix": {
			_apiInfo: {
				"l": "Update Environment Databases Prefix",
				"group": "Environment"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"prefix": {"source": ['body.prefix'], "required": false, "validation": {"type": "string", "required": false}}
		},

		"/environment/clusters/list": {
			_apiInfo: {
				"l": "List Environment Database Clusters",
				"group": "Environment"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/clusters/add": {
			_apiInfo: {
				"l": "Add Environment Database Cluster",
				"group": "Environment"
			},
			"commonFields": ['cluster'],
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['query.name'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/clusters/update": {
			_apiInfo: {
				"l": "Update Environment Database Cluster",
				"group": "Environment"
			},
			"commonFields": ['cluster'],
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['query.name'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/clusters/delete": {
			_apiInfo: {
				"l": "Delete Environment Database Cluster",
				"group": "Environment"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['query.name'], "required": true, "validation": {"type": "string", "required": true}}
		},

		"/product/list": {
			_apiInfo: {
				"l": "List Products",
				"group": "Product",
				"groupMain": true
			}
		},
		"/product/get": {
			_apiInfo: {
				"l": "Get Product",
				"group": "Product"
			},
			"commonFields": ['id']
		},
		"/product/add": {
			_apiInfo: {
				"l": "Add Product",
				"group": "Product"
			},
			"commonFields": ['description', 'name'],
			"code": {
				"source": ['body.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			}
		},
		"/product/delete": {
			_apiInfo: {
				"l": "Delete Product",
				"group": "Product"
			},
			"commonFields": ['id']
		},
		"/product/update": {
			_apiInfo: {
				"l": "Update Product",
				"group": "Product"
			},
			"commonFields": ['id', 'name', 'description']
		},

		"/product/packages/delete": {
			_apiInfo: {
				"l": "Delete Product Package",
				"group": "Product"
			},
			"commonFields": ['id'],
			"code": {
				"source": ['query.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			}
		},
		"/product/packages/list": {
			_apiInfo: {
				"l": "List Product Packages",
				"group": "Product"
			},
			"commonFields": ['id']
		},
		"/product/packages/get": {
			_apiInfo: {
				"l": "Get Product Package",
				"group": "Product"
			},
			"packageCode": {
				"source": ["query.packageCode"],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"productCode": {
				"source": ["query.productCode"],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			}
		},
		"/product/packages/add": {
			_apiInfo: {
				"l": "Add Product Package",
				"group": "Product"
			},
			"commonFields": ['id', 'name', 'description', '_TTL', 'acl'],
			"code": {
				"source": ["body.code"],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			}
		},
		"/product/packages/update": {
			_apiInfo: {
				"l": "Update Product Package",
				"group": "Product"
			},
			"commonFields": ['id', 'name', 'description', '_TTL', 'acl'],
			"code": {
				"source": ["query.code"],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			}
		},

		"/tenant/list": {
			_apiInfo: {
				"l": "List Tenants",
				"group": "Tenant",
				"groupMain": true
			}
		},
		"/tenant/get": {
			_apiInfo: {
				"l": "Get Tenant",
				"group": "Tenant"
			},
			"commonFields": ['id']
		},
		"/tenant/add": {
			_apiInfo: {
				"l": "Add Tenant",
				"group": "Tenant"
			},
			"commonFields": ['name', 'description'],
			"code": {
				"source": ['body.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 4
				}
			}
		},
		"/tenant/delete": {
			_apiInfo: {
				"l": "Delete Tenant",
				"group": "Tenant"
			},
			"commonFields": ['id']
		},
		"/tenant/update": {
			_apiInfo: {
				"l": "Update Tenant",
				"group": "Tenant"
			},
			"commonFields": ['id', 'name', 'description']
		},
		"/tenant/oauth/list": {
			_apiInfo: {
				"l": "Get Tenant oAuth Configuration",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id']
		},
		"/tenant/oauth/delete": {
			_apiInfo: {
				"l": "Delete Tenant oAuth Configuration",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id']
		},

		"/tenant/oauth/add": {
			_apiInfo: {
				"l": "Add Tenant oAuth Configuration",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id'],
			"secret": {
				"source": ['body.secret'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"redirectURI": {
				"source": ['body.redirectURI'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "uri"
				}
			}
		},
		"/tenant/oauth/update": {
			_apiInfo: {
				"l": "Update Tenant oAuth Configuration",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id'],
			"secret": {
				"source": ['body.secret'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"redirectURI": {
				"source": ['body.redirectURI'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "uri"
				}
			}
		},

		"/tenant/oauth/users/list": {
			_apiInfo: {
				"l": "List Tenant oAuth Users",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id']
		},
		"/tenant/oauth/users/delete": {
			_apiInfo: {
				"l": "Delete Tenant oAuth User",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id'],
			"uId": {
				"source": ['query.uId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/tenant/oauth/users/add": {
			_apiInfo: {
				"l": "Add Tenant oAuth User",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id'],
			"userId": {
				"source": ['body.userId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"password": {
				"source": ['body.password'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/tenant/oauth/users/update": {
			_apiInfo: {
				"l": "Update Tenant oAuth User",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id'],
			"uId": {
				"source": ['query.uId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"userId": {
				"source": ['body.userId'],
				"required": false,
				"validation": {
					"type": "string"
				}
			},
			"password": {
				"source": ['body.password'],
				"required": false,
				"validation": {
					"type": "string"
				}
			}
		},
		"/tenant/application/list": {
			_apiInfo: {
				"l": "List Tenant Applications",
				"group": "Tenant Application"
			},
			"commonFields": ['id']
		},
		"/tenant/application/delete": {
			_apiInfo: {
				"l": "Delete Tenant Application",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId']
		},

		"/tenant/application/add": {
			_apiInfo: {
				"l": "Add Tenant Application",
				"group": "Tenant Application"
			},
			"commonFields": ['id', '_TTL', 'description', 'acl'],
			"productCode": {
				"source": ['body.productCode'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			},
			"packageCode": {
				"source": ['body.packageCode'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			}
		},
		"/tenant/application/update": {
			_apiInfo: {
				"l": "Update Tenant Application",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', '_TTL', 'description', 'acl'],
			"clearAcl":{
				"source": ['body.clearAcl'],
				"required": false,
				"validation": {
					"type": "boolean"
				}
			},
			"productCode": {
				"source": ['body.productCode'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			},
			"packageCode": {
				"source": ['body.packageCode'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			}
		},
		"/tenant/application/acl/get":{
			_apiInfo: {
				"l": "Get Tenant Application By External Key",
				"group": "Tenant Application"
			},
			"extKey":{
				"source": ['body.extKey'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/tenant/application/key/add": {
			_apiInfo: {
				"l": "Add Tenant Application Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId']
		},
		"/tenant/application/key/list": {
			_apiInfo: {
				"l": "List Tenant Application Keys",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId']
		},
		"/tenant/application/key/delete": {
			_apiInfo: {
				"l": "Delete Tenant Application Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key']
		},

		"/tenant/application/key/ext/list": {
			_apiInfo: {
				"l": "List Tenant Application External Keys",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key']
		},

		"/tenant/application/key/ext/add": {
			_apiInfo: {
				"l": "Add Tenant Application External Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key'],
			'expDate': {
				"source": ['body.expDate'],
				"required": false,
				"validation": {
					"type": "string",
					"format": "date-time"
				}
			},
			'device': {
				"source": ['body.device'],
				"required": false,
				"validation": {
					"type": "object"
				}
			},
			'geo': {
				"source": ['body.geo'],
				"required": false,
				"validation": {
					"type": "object"
				}
			}
		},
		"/tenant/application/key/ext/update": {
			_apiInfo: {
				"l": "Update Tenant Application External Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key'],
			'extKey': {
				"source": ['body.extKey'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			'expDate': {
				"source": ['body.expDate'],
				"required": false,
				"validation": {
					"type": "string",
					"format": "date-time"
				}
			},
			'device': {
				"source": ['body.device'],
				"required": false,
				"validation": {
					"type": "object"
				}
			},
			'geo': {
				"source": ['body.geo'],
				"required": false,
				"validation": {
					"type": "object"
				}
			}
		},
		"/tenant/application/key/ext/delete": {
			_apiInfo: {
				"l": "Delete Tenant Application External Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key'],
			'extKey': {
				"source": ['body.extKey'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},

		"/tenant/application/key/config/list": {
			_apiInfo: {
				"l": "List Tenant Application Key Configuration",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key']
		},
		"/tenant/application/key/config/update": {
			_apiInfo: {
				"l": "Update Tenant Application Key Configuration",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key'],
			'envCode': {
				'source': ['body.envCode'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			'config': {
				"source": ['body.config'],
				"required": true,
				"validation": {
					"type": "object"
				}
			}
		},

		"/services/list": {
			_apiInfo: {
				"l": "List Services",
				"group": "Services"
			},
			'serviceNames': {
				'source': ['body.serviceNames'],
				'required': false,
				"validation": {
					"type": "array",
					'items': {'type': 'string'}
				}
			}
		},

		"/hosts/list": {
			_apiInfo: {
				"l": "List Hosts",
				"group": "Hosts"
			},
			'env': {
				'source': ['query.env'],
				'required': true,
				"validation": {
					"type": "string",
					"required": true
				}
			}
		}
	}
};