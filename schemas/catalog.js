module.exports = {
    "source": ['body.catalog'],
    "required": true,
    "validation": {
        "type": "object",
        "required": true,
        "properties": {
            "name": { "type": "string", "required": true },
            "type": { "type": "string", "required": true, "enum": [ "service", "daemon", "mongo", "es" ] },
            "description": { "type": "string", "required": true },
            "recipe": {
                "type": "object",
                "required": true,
                "properties": {
                    "deployOptions": {
                        "type": "object",
                        "required": true,
                        "properties": {
                            "image": {
                                "type": "object",
                                "required": true,
                                "properties": {
                                    "prefix": { "type": "string", "required": false },
                                    "name": { "type": "string", "required": true },
                                    "tag": { "type": "string", "required": true },
                                    "pullPolicy": { "type": "string", "required": false }
                                }
                            },
                            "readinessProbe": {
                                "type": "object",
                                "required": false,
                                "properties": {
                                    "httpGet": {
                                        "type": "object",
                                        "required": true,
                                        "properties": {
                                            "path": { "type": "string", "required": true },
                                            "port": { "type": "string", "required": true }
                                        }
                                    },
                                    "initialDelaySeconds": { "type": "number", "required": true },
                                    "timeoutSeconds": { "type": "number", "required": true },
                                    "periodSeconds": { "type": "number", "required": true },
                                    "successThreshold": { "type": "number", "required": true },
                                    "failureThreshold": { "type": "number", "required": true }
                                }
                            },
                            "ports": { //NOTE: only applicable for nginx
                                "type": "object",
                                "required": false,
                                "properties": {
                                    "http": {
                                        "type": "object",
                                        "required": true,
                                        "properties": {
                                            "exposed": { "type": "string", "required": false },
                                            "target": { "type": "string", "required": false }
                                        }
                                    },
                                    "https": {
                                        "type": "object",
                                        "required": true,
                                        "properties": {
                                            "exposed": { "type": "string", "required": false },
                                            "target": { "type": "string", "required": false }
                                        }
                                    }
                                }
                            },
                            "volumes": {
                                "type": "array",
                                "required": false,
                                "properties": {
                                    //TODO: finalize schema for volumes
                                }
                            }
                        }
                    },
                    "buildOptions": {
                        "type": "object",
                        "required": false,
                        "properties": {
                            "env": {
                                "type": "object",
                                "required": false
                            },
                            "cmd": {
                                "type": "object",
                                "required": false,
                                "properties": {
                                    "pre_install": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    },
                                    "install": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    },
                                    "post_install": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    },
                                    "pre_deploy": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    },
                                    "deploy": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    },
                                    "post_deploy": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};