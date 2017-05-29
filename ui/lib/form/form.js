function buildFormWithModal($scope, $modal, opts, cb) {
	var formConfig = angular.copy(opts.form);
	formConfig.name = opts.name;
	formConfig.label = opts.label;
	formConfig.actions = opts.actions;
	formConfig.timeout = opts.timeout;
	formConfig.msgs = opts.msgs;
	formConfig.size = opts.size;
	formConfig.buttonLabels = opts.buttonLabels;
	formConfig.data = opts.data;
	formConfig.ngDataApi = opts.ngDataApi;
	formConfig.backdrop = true;
	if (Object.hasOwnProperty.call(opts, 'backdrop')) {
		formConfig.backdrop = opts.backdrop;
	}

	var m = ($modal && $modal !== null) ? true : false;

	buildForm($scope, m, formConfig, function () {
		if (opts.postBuild && (typeof(opts.postBuild) === 'function')) {
			opts.postBuild();
		}
	});

	if ($modal && $modal !== null) {
		var formContext = $scope;
		$scope.form.openForm = function () {
			var newModal = $modal.open({
				template: "<ngform></ngform>",
				size: formConfig.size || 'lg',
				backdropClass: "backdrop-soajs",
				backdrop: formConfig.backdrop,
				keyboard: false,
				controller: function ($scope, $modalInstance) {
					$scope.form = formContext.form;
					formContext.modalInstance = $modalInstance;
					formContext.modalScope = $scope;
					fixBackDrop();
					if (cb && typeof(cb) === 'function') {
						cb();
					}
				}
			});

			newModal.result.then(function () {
				//Get triggers when modal is closed
			}, function () {
				if (opts.onDismiss && (typeof(opts.onDismiss) === 'function')) {
					opts.onDismiss();
				}
				//gets triggers when modal is dismissed.
			});
		};
		$scope.form.openForm();

		$scope.form.closeModal = function () {
			$scope.modalInstance.close();
		};

	}
}

function buildForm(context, modal, configuration, cb) {
	context.form = {
		alerts: [],
		label: configuration.label,
		id: configuration.name,
		msgs: configuration.msgs,
		action: configuration.action,
		entries: configuration.entries,
		entriesCount: configuration.entries.length,
		timeout: configuration.timeout,
		modal: modal,
		actions: configuration.actions,
		labels: {},
		formData: {}
	};

	context.form.closeNote = function () {
		context.form.submitted = false;
	};
	context.form.closeAlert = function (i) {
		context.form.alerts.splice(i, 1);
	};

	context.form.displayAlert = function (type, msg, isCode, service, orgMesg) {
		context.form.alerts = [];
		if (isCode) {
			var msgT = getCodeMessage(msg, service, orgMesg);
			if (msgT) {
				msg = msgT;
			}
		}
		context.form.alerts.push({'type': type, 'msg': msg});
		context.form.closeAllAlerts();
	};

	context.form.closeAllAlerts = function (instant) {
		if (instant) {
			context.form.alerts = [];
		}
		else {
			context.form.timeout(function () {
				context.form.alerts = [];
			}, 7000);
		}
	};

	function rebuildData(fieldEntry) {
		var keys = Object.keys(configuration.data);
		for (var x = 0; x < keys.length; x++) {
			var inputName = keys[x];
			if (fieldEntry.name === inputName) {
				if (Array.isArray(fieldEntry.value)) {
					fieldEntry.value.forEach(function (oneValue) {
						//oneValue.selected = false;
						if (Array.isArray(configuration.data[inputName])) {
							if (configuration.data[inputName].indexOf(oneValue.v) !== -1) {
								oneValue.selected = true;
							}
						}
						else {
							if (configuration.data[inputName] !== undefined && configuration.data[inputName] !== null) {
								if (!Object.hasOwnProperty.call(configuration.data, inputName) || (oneValue.v.toString() === configuration.data[inputName].toString())) {
									oneValue.selected = true;
								}
							}
						}
					});
				}
				else {
					if (configuration.data[inputName]) {
						fieldEntry.value = configuration.data[inputName];
						context.form.formData[inputName] = configuration.data[inputName];
					}
				}
				break;
			}
		}
	}

	function updateFormData(oneEntry, reload) {
		if (!reload) {
			if (oneEntry.value) {
				if (Array.isArray(oneEntry.value)) {
					context.form.formData[oneEntry.name] = [];
					oneEntry.value.forEach(function (oneValue) {
						if (oneValue.selected === true) {
							context.form.formData[oneEntry.name].push(oneValue.v);
						}
					});
				}
				else {
					context.form.formData[oneEntry.name] = oneEntry.value;
				}
			}
			else if (oneEntry.type === 'number') {
				if (oneEntry.value === 0) {
					context.form.formData[oneEntry.name] = oneEntry.value;
				}
			}

			if (['document', 'audio', 'image', 'video'].indexOf(oneEntry.type) !== -1) {
				if (oneEntry.limit === undefined) {
					oneEntry.limit = 0;
				}
				else if (oneEntry.limit === 0) {
					oneEntry.addMore = true;
				}

				if (oneEntry.value && Array.isArray(oneEntry.value) && oneEntry.value.length > 0) {
					if (oneEntry.limit < oneEntry.value.length) {
						oneEntry.limit = oneEntry.value.length;
					}
				}
			}

			if (oneEntry.type === 'date-picker') {
				if (typeof(oneEntry.min) === 'object') {
					oneEntry.min = oneEntry.min.getTime();
				}

				oneEntry.openDate = function ($event, index) {
					$event.preventDefault();
					$event.stopPropagation();
					context.form.entries[index].opened = true;
				};
			}

			if (oneEntry.type === 'select') {
				var lastObj;
				for (var x = 0; x < oneEntry.value.length; x++) {
					if (oneEntry.value[x].selected) {
						lastObj = oneEntry.value[x];
						oneEntry.value.splice(x, 1);
						break;
					}
				}
				if (lastObj) {
					oneEntry.value.push(lastObj);
				}

				if (oneEntry.onChange && typeof(oneEntry.onChange.action) === 'function') {
					oneEntry.action = oneEntry.onChange;
				}
				else {
					oneEntry.action = {};
				}
			}
		}

		if (oneEntry.type === 'jsoneditor') {
			oneEntry.onLoad = function (_editor) {
				oneEntry.editor = _editor;
				_editor.$blockScrolling = Infinity;

				if(!oneEntry.value){
					oneEntry.value = {};
				}
				oneEntry.ngModel = JSON.stringify(oneEntry.value, null, 2);
				_editor.setValue(JSON.stringify(oneEntry.value, null, 2));

				_editor.scrollToLine(0, true, true);
				_editor.scrollPageUp();
				_editor.clearSelection();
				_editor.setShowPrintMargin(false);

				var heightUpdateFunction = function () {
					var newHeight =
					_editor.getSession().getScreenLength()
					* _editor.renderer.lineHeight
					+ _editor.renderer.scrollBar.getWidth() + 10;

					if (oneEntry.fixedHeight) {
						newHeight = parseInt(oneEntry.height);
					}
					
					_editor.renderer.scrollBar.setHeight(newHeight.toString() + "px");
					_editor.renderer.scrollBar.setInnerHeight(newHeight.toString() + "px");
					configuration.timeout(function () {
						jQuery('#' + oneEntry.name).height(newHeight.toString());
						_editor.resize(true);
					}, 5);
				};

				context.form.timeout(function () {
					oneEntry.editor.heightUpdate = heightUpdateFunction();
					// Set initial size to match initial content
					heightUpdateFunction();

					// Whenever a change happens inside the ACE editor, update
					// the size again
					_editor.getSession().on('change', heightUpdateFunction);
				}, 1000);
			};
		}
	}

	if (configuration.data) {
		for (var i = 0; i < context.form.entries.length; i++) {
			if (context.form.entries[i].type === 'group') {
				context.form.entries[i].entries.forEach(function (oneSubEntry) {
					rebuildData(oneSubEntry);
				});
			}
			else if (context.form.entries[i].type === 'tabset') {
				context.form.entries[i].tabs.forEach(function (oneTab) {
					oneTab.entries.forEach(function (oneSubEntry) {
						rebuildData(oneSubEntry);
					});
				});
			}
			else {
				rebuildData(context.form.entries[i]);
			}
		}
		context.form.refData = configuration.data;
	}

	context.form.refresh = function (reload) {
		for (var i = 0; i < context.form.entries.length; i++) {
			if (context.form.entries[i].type === 'group') {
				context.form.entries[i].icon = (context.form.entries[i].collapsed) ? "plus" : "minus";
				context.form.entries[i].entries.forEach(function (oneSubEntry) {
					updateFormData(oneSubEntry, reload);
				});
			}
			else if (context.form.entries[i].type === 'tabset') {
				context.form.entries[i].tabs.forEach(function (oneTab) {
					oneTab.entries.forEach(function (oneSubEntry) {
						updateFormData(oneSubEntry, reload);
					});
				});
			}
			else {
				updateFormData(context.form.entries[i], reload);
			}
		}
	};

	context.form.refresh(false);

	function assignListener(elementName) {
		context.$watchCollection(elementName, function (newCol, oldCol) {
			if (newCol && oldCol && newCol.length !== oldCol.length) {
				context.form.refresh(true);
			}

			if (oldCol && oldCol.length > 0) {
				for (var i = 0; i < oldCol.length; i++) {
					if (oldCol[i].type === 'group') {
						assignListener(elementName + '[' + i + "].entries");
					}
				}
			}
		});
	}

	assignListener('form.entries');

	context.form.do = function (functionObj) {
		context.form.submitted = false;
		var formDataKeys = Object.keys(context.form.formData);
		var fileTypes = ['document', 'image', 'audio', 'video'];
		var customData = [];
		for (var i = 0; i < context.form.entries.length; i++) {
			if (context.form.entries[i].type === 'jsoneditor') {
				context.form.formData[context.form.entries[i].name] = JSON.parse(context.form.entries[i].ngModel);
			}
		}
		for (var i = 0; i < context.form.entries.length; i++) {
			for (var j = 0; j < formDataKeys.length; j++) {
				var pattern = new RegExp(context.form.entries[i].name + "_[0-9]+");
				if (pattern.test(formDataKeys[j]) && fileTypes.indexOf(context.form.entries[i].type) !== -1) {
					customData.push({
						label: formDataKeys[j],
						data: context.form.formData[formDataKeys[j]]
					});
				}
			}
		}
		if (functionObj.type === 'submit') {
			var data = angular.copy(context.form.formData);
			if (context.form.itemsAreValid(data)) {
				for (var i = 0; i < customData.length; i++) {
					data[customData[i].label] = customData[i].data;
				}
				functionObj.action(data);
			}
			else {
				context.form.submitted = true;
			}
		}
		else {
			functionObj.action();
		}
	};


	context.form.callObj = function (functionObj) {
		if (functionObj) {
			if (functionObj.action) {
				functionObj.action();
			}
		}
	};

	context.form.call = function (action, id, data, form) {
		if (action) {
			if (typeof(action) == 'function') {
				action(id, data, form);
			}
		}
	};

	function doValidateItems(entries, data) {
		for (var i = 0; i < entries.length; i++) {
			var oneEntry = entries[i];
			if (oneEntry.type === 'group') {
				var validation = doValidateItems(oneEntry.entries, data);
				if (validation === false) {
					return false;
				}
			}
			else if (oneEntry.type === 'tabset') {
				for (var x = 0; x < oneEntry.tabs.length; x++) {
					for (var k = 0; k < oneEntry.tabs[x].entries.length; k++) {
						var validation = doValidateItems(oneEntry.tabs[x].entries[k], data);
						if (validation === false) {
							return false;
						}
					}
				}
			}
			else if (oneEntry.type === 'radio' || oneEntry.type === 'select') {
				if (Array.isArray(data[oneEntry.name])) {
					data[oneEntry.name] = data[oneEntry.name][0];
				}
			}

			if (data[oneEntry.name] === 'false') {
				data[oneEntry.name] = false;
			}
			if (data[oneEntry.name] === 'true') {
				data[oneEntry.name] = true;
			}
			if (oneEntry.required) {
				if (data[oneEntry.name] === null || typeof(data[oneEntry.name]) === 'undefined' || data[oneEntry.name] === 'undefined' || data[oneEntry.name] === '') {
					return false;
				}
			}
		}
		return true;
	}

	// testAction
	context.form.itemsAreValid = function (data) {
		var entries = context.form.entries;
		return doValidateItems(entries, data);
	};

	context.form.toggleSelectValues = function (fieldName, value) {
		for (var i = 0; i < context.form.entries.length; i++) {
			if (context.form.entries[i].name === fieldName) {
				for (var j = 0; j < context.form.entries[i].value.length; j++) {
					if (context.form.entries[i].value[j].v === value) {
						if (context.form.entries[i].value[j].selected) {
							delete context.form.entries[i].value[j].selected;
						}
						else {
							context.form.entries[i].value[j].selected = true;
						}
					}
				}
			}
		}
	};

	context.form.toggleSelection = function (fieldName, value) {
		if (!context.form.formData[fieldName]) {
			context.form.formData[fieldName] = [];
		}

		if (context.form.formData[fieldName].indexOf(value) === -1) {
			context.form.formData[fieldName].push(value);
		}
		else {
			var idx = context.form.formData[fieldName].indexOf(value);
			context.form.formData[fieldName].splice(idx, 1);
		}
	};

	context.form.showHide = function (oneEntry) {
		if (oneEntry.collapsed) {
			oneEntry.collapsed = false;
			oneEntry.icon = "minus";
		}
		else {
			oneEntry.collapsed = true;
			oneEntry.icon = "plus";
		}
	};

	context.form.addNewInput = function (input) {
		if (input.limit === 0) {
			input.limit = 1;
		}
		input.limit++;
		input.addMore = true;
	};

	context.form.downloadFile = function (config, mediaType) {
		var options = {
			routeName: config.routeName,
			method: 'get',
			headers: config.headers,
			responseType: 'arraybuffer',
			params: config.params
		};
		getSendDataFromServer(context, configuration.ngDataApi, options, function (error, data) {
			switch (mediaType) {
				case 'image':
					var blob = new Blob([data], {type: config.metadata.mime});
					var URL = window.URL || window.webkitURL;
					config.src = URL.createObjectURL(blob);
					break;
				default:
					openSaveAsDialog(config.filename, data, config.contentType);
					break;
			}
		});
	};

	context.form.removeFile = function (entry, i) {
		getSendDataFromServer(context, configuration.ngDataApi, {
			"method": "get",
			"routeName": entry.removeFileUrl + entry.value[i]._id
		}, function (error) {
			if (error) {
				context.form.displayAlert('danger', error.message);
			}
			else {
				context.form.displayAlert('success', 'File Removed Successfully.');
				//remove the html input
				var loc = context.form.formData[entry.name].indexOf(entry.value[i].v);
				context.form.formData[entry.name].splice(loc, 1);
				entry.value.splice(i, 1);
			}
		});
	};

	context.form.uploadFileToUrl = function (Upload, config, cb) {
		var options = {
			url: apiConfiguration.domain + config.uploadUrl,
			params: config.data || null,
			file: config.file,
			headers: {
				key: apiConfiguration.key
			}
		};
		if (config.headers) {
			for (var i in config.headers) {
				options.headers[i] = config.headers[i];
			}
		}

		Upload.upload(options).progress(function (evt) {
			var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
			config.progress.value = progressPercentage;
		}).success(function (response, status, headers, config) {
			if (!response.result) {
				return cb(new Error(response.errors.details[0].message));
			}
			else {
				return cb(null, response);
			}
		}).error(function (data, status, header, config) {
			return cb(new Error("Error Occured while uploading file: " + config.file));
		});
	};

	if (cb && (typeof(cb) == 'function')) {
		context.form.timeout(function () {
			cb();
		}, 1000);
	}
}

soajsApp.directive('ngform', function () {
	return {
		restrict: 'E',
		templateUrl: 'lib/form/form.tmpl'
	};
});

soajsApp.directive('fileModel', ['$parse', function ($parse) {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			var model = $parse(attrs.fileModel);
			var modelSetter = model.assign;

			element.bind('change', function () {
				scope.$apply(function () {
					modelSetter(scope, element[0].files[0]);
				});
			});
		}
	};
}]);

soajsApp.directive('fileModelMulti', ['$parse', function ($parse) {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			var model = $parse(attrs.fileModelMulti);
			var modelSetter = model.assign;

			element.bind('change', function () {
				scope.$apply(function () {
					modelSetter(scope, element[0].files);
				});
			});
		}
	};
}]);
