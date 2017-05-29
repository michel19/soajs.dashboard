"use strict";

var errors = {
	"400": "Unable to add the environment record",
	"401": "Unable to update the environment record",
	"402": "Unable to get the environment records",
	"403": "Environment already exists",
	"404": "Unable to remove environment record",
	"405": "Invalid environment id provided",
	"406": "Unable to update tenant key security information",
	"407": "Invalid or no Platform Driver configuration provided!",

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

	"452": "Invalid Tenant Code",
	"453": "Invalid Tenant External Key",
	"454": "Tenant does not exist",
	"455": "Tenant Key already exists",
	"456": "Error adding Tenant Key",

	"460": "Unable to find product",
	"461": "Unable to find package",

	"462": "You are not allowed to remove the tenant you are currently logged in with",
	"463": "You are not allowed to remove the application you are currently logged in with",
	"464": "You are not allowed to remove the key you are currently logged in with",
	"465": "You are not allowed to remove the external key you are currently logged in with",
	"466": "You are not allowed to remove the product you are currently logged in with",
	"467": "You are not allowed to remove the package you are currently logged in with",

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

	"600": "Database error",
	"601": "No Logged in User found.",
	"602": "Invalid maintenance operation requested.",
	"603": "Error executing maintenance operation.",
	"604": "Service not found.",
	"605": "Service Host not found.",
	"606": "Error adding an administrator user for tenant",
	"607": "Error adding an administrator group for tenant",
	"608": "Permissions denied to access this section",
	"609": "Dashboard service is not accessible at the time being Come back later.",
	"610": "Invalid or profile not found.",
	"611": "Invalid Service Image Name provided",
	"612": "Invalid Operation! you can either deploy a service by providing its image or if it is a GC service but not both.",
	"613": "Invalid Operation! either deploy a service by providing its image or its GC information.",
	"614": "Service exists!",
	"615": "Error adding service host!",
	"616": "Error Uploading File.",
	"617": "Error Registering Service.",
	"618": "The Deployer of this environment is configured to be manual. Deploy and Start the services then refresh this section.",
	"619": "The Deployer of this environment is configured to be manual. Unable to perform requested maintenance operation.",
	"620": "Make sure upload directory exists :",
	"621": "The requested service is not deployed in any environment",

	"700": "This Content Schema already Exist",
	"701": "Invalid Id provided",
	"702": "Content Schema doesn't exists",
	"703": "Invalid or no Content Service with this name and version",
	"704": "Another Service with the same name or port exists. Change the name of this schema or its service port.",
	"705": "Tenant already has a key to use the dashboard",
	"706": "Please create a session database for this environment",

	"710": "A Daemon with the same name and/or port already exists",
	"714": "A Group Configuration with the same name already exists",
	"715": "Unable to update group configuration",
	"716": "Unable to delete group configuration",
	"717": "Unable to add group configuration",
	"718": "Unable to retrieve list of daemons",
	"719": "Unable to retrieve list of group configurations",

	"720": "Unable to update job's service configuration",
	"721": "Unable to retrieve job's service configuration",
	"722": "Unable to update job's tenant external keys",
	"723": "Unable to list job's tenant external keys",
	"724": "Job not found",
	"725": "Group Configuration not found",
	"726": "Daemon not found",

	"727": "Unable to add certificate(s)",
	"728": "Unable to get certificate(s)",
	"729": "Unable to remove certificate",
	"730": "One or more certificates do not exist",

	"732": "Unable to list drivers",
	"733": "Unable to add driver",
	"734": "Unable to update driver",
	"735": "Unable to change selected driver",
	"736": "Unable to delete driver",
	"737": "You are not allowed to delete a driver that is currently selected",
	"738": "Unable to change deployer type",

	"739": "Missing required param(s). Make sure you specify certificate filename, type, and environment code. If type is docker, specify driver name and if type is nginx, specify certificate label",
	"740": "This application does not have access to specified environment. Either update its package's ACL or choose a different environment",
	"741": "No platform certificates found for this environment. Please upload them in the Platforms section",
	"742": "Unable to list static content sources",
	"743": "Missing environment deployer settings. Please specify deployment type, selected driver, and driver settings in the Platforms section",
	"744": "Certificate type must be one of [ca, cert, key]",

	"750": "Invalid Request.",
	"751": "Unable to login",
	"752": "User account already exists",
	"753": "Unable to logout",
	"754": "Active repositories exist for this user. Please deactivate them to be able to logout",
	"755": "Authentication failed",
	"756": "Unable to list accounts",
	"757": "Unable to get git user account",
	"758": "Unable to get repositories. Please try again.",
	"759": "Unable to get branches",
	"760": "Missing source information",
	"761": "Failed to activate repository, make sure config.js file is available in your repository and it has the right schema.",
	"762": "A module with the same name and/or port already exists",
	"763": "Unable to reach the GitHub API. Please try again.",

	"764": "Static Content already exists",
	"765": "Failed to deactivate repository",
	"766": "Repository has running hosts. Please stop them to be able to deactivate repository",
	"767": "Invalid Git information provided",
	"768": "Failed to sync repository",
	"769": "Missing config.js data",
	"770": "Missing config.js source data",
	"771": "Invalid or no type provided in config.js",

	"772": "Unable to list zombie containers",
	"773": "Unable to delete container",
	"774": "Unable to get container logs",

	"775": "Missing account provider param",
	"776": "GitHub API returned an error: API rate limit exceeded for this IP. It is advised to use an authenticated account to proceed or try again later",
	"777": "You are not allowed to delete this container. At least one instance of nginx must be available",
	"778": "The git account provider is missing or not supported",
	"779": "Unable to complete Reload Registry operation for controllers",
	"780": "Unable to redeploy service",
	"781": "You are not the owner of this application. You cannot perform this operation.",

	"783": "Missing folders paths multi repository",
	"784": "Error in multi repository folders array",
	"785": "Folders array is empty",
	"786": "Validation Error",
	"787": "Missing field name in config.js",
	"788": "Invalid or no type provided in config.js",
	"789": "Unable to get content from git provider",
	"790": "Error while pushing code to remote repository",

	"795": "Invalid Operation, service/daemon record not found in Database.",

	"800": "Unable to get manager nodes, make sure you have at least one manager node in the cluster",
 	"801": "Unable to add node, make sure the new node is configured properly",
 	"802": "Unable to save new node record. However, the new node was added to the cluster",
 	"803": "Unable to get node record",
 	"804": "Unable to remove node, make sure the node is healthy and reachable within the cluster",
 	"805": "Unable to remove node record. However, the node is currently being removed from the cluster",
 	"806": "Unable to update node, make sure the node is reachable and properly configured",
 	"807": "Unable to update the node record. However, the node state was updated within the cluster",
 	"808": "Unable to retrieve service containers list",
 	"809": "The new and current scale counts are identical",
 	"810": "Unable to scale service, make sure the deployer is configured properly",
 	"811": "Unable to inspect service containers",
 	"812": "Unable to update container records. However, the service was scaled successfully",
 	"813": "Unable to delete service, make sure the deployer is configured properly",
 	"814": "Unable to remove container records. However, the service was deleted successfully",
 	"815": "Unable to remove host records. However, the service was deleted successfully",
 	"816": "Unable to get analytics configuration for this environment",
 	"817": "Unable to list nodes",
 	"818": "This operation is only permitted in the dashboard environment",
 	"819": "Unable to update environments' deployer. However, the node was added successfully",
 	"820": "Unable to update environments' deployer. However, the node was removed successfully",
 	"821": "You are not allowed you remove a manager node. You need to demote it to worker first",
 	"822": "Unable to update environments' deployer. However, the node was updated successfully",
 	"823": "Update operations are not permitted for clusters that that composed of a single node",
	"824": "The port %PORTNUMBER% chosen for Nginx is outside the range of valid exposed ports (%MINNGINXPORT% , %MAXNGINXPORT%)",
	"825": "Invalid or no environment deployer settings detected. Make sure you are running in container mode",

	"850": "The simulator returned an error",
	"851": "Invalid YAML code provided",
	"852": "Error Cleaning up generated Service Code",
	"853": "Error Generating Folders for Service",
	"854": "Error Generating Files for Service",
	"855": "Error Returning Generated service Code",

	"901": "Error Logging out from environments",
	"902": "Error Logging in to environments",
	"903": "You do not have access to this environment %envCode%",
	"904": "Check your internet connection",

	"905": "Static content not found",

	"906": "Running hosts exist for this environment, remove them before deleting this environment",
	"907": "Running hosts exist for this environment, remove them before updating its namespace configuration",
	"908": "Updating deployer configuration is only supported for kubernetes deployments",
	"909": "Namepsace operations are only supported in kubernetes container deployment mode",

	"910": "Specified memory limit is less than minimum memory prerequisite for this service",
	"911": "Missing value for environment variable %ENV_NAME% of type %ENV_TYPE% set in catalog recipe",

	"950": "Catalog recipe not found",
	"951": "You are not allowed to edit or delete a locked recipe",
	"952": "Unable to update catalog recipe",
	"953": "Unable to delete catalog recipe",
	"954": "Unable to get catalog ID for specified service/deployment",

	"955": "No CI configuration found",
	"956": "Authentication failed. The deploy token provided is not valid.",
	
	"960": "Elasticsearch analytics cluster not found",
	"961": "Invalid Elasticsearch analytics cluster"

    "969": "The chosen Continuous Integration Service does not exist",
    "970": "The chosen driver does not support the selected function",
    "971": "Unable to submit your request to the service.",

    "972": "Please provide a valid Github token.",
    "973": "The provided Github token does not have sufficient oauth permissions.",

    "974": "Please provide a valid Travis access token.",
    "975": "Please provide the name of the repositories owner.",

    "976": "Could not find any repository for the requested owner.",
    "977": "Could not find the requested repository.",

	"978": "Please provide a valid environment variable ID.",
	"979": "Could not find the desired environment variable. Ensure the repo ID and the environment variable ID are correct.",
    "980": "Error while updating hook. Ensure the hook ID and the access token are correct.",

	"981": "Unable to get repository settings",
	"982": "Unable to update repository settings"
};


module.exports = errors;
