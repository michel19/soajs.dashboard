"use strict";

var groupsConfig = {
	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{'label': 'Code', 'field': 'code'},
			{'label': 'Name', 'field': 'name'},			
			{'label': 'Description', 'field': 'description'}
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},

	form: {
		'name': '',
		'label': '',
		'actions': {},
		'entries': [
			{
				'name': 'code',
				'label': 'Code',
				'type': 'text',
				'placeholder': 'Enter the Code of the Group',
				'value': '',
				'tooltip': 'Group codes are alphanumeric and support _ character only',
				'required': true
			},
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'placeholder': 'Enter  Name...',
				'value': '',
				'tooltip': 'Enter the Name of the group',
				'required': true
			},
			{
				'name': 'description',
				'label': 'Description',
				'type': 'text',
				'placeholder': 'Enter Last Name...',
				'value': '',
				'tooltip': 'Enter the Description of the Group',
				'required': true
			}
		]
	},
	users: {
		'name': '',
		'label': '',
		'msgs':{},
		'actions': {},
		'entries': [
			{
				'name': 'users',
				'label': 'Users',
				'type': 'checkbox',
				'placeholder': 'Add users',
				'value': '',
				'tooltip': 'Check to add user to group',
				'required': true
			}
		]
	}
};