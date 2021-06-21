const mockedAttendeeList = [{
	id: 1,
	status: 200,
	statusOverride: 200,
	data: null,
	userID: 123,
	userSummary: null,
	attendeeSummary: [{
		id: 1,
		status: 200,
		userID: 123,
		isFlexible: false,
		userSummary: {
			userID: 123,
			firstName: 'John',
			lastName: 'Doe'
		},
		ticketClassID: 111222333
	}]
}, {
	id: 2,
	status: 200,
	statusOverride: 200,
	data: null,
	userID: 456,
	userSummary: null,
	attendeeSummary: [{
		id: 2,
		status: 200,
		userID: 456,
		isFlexible: false,
		userSummary: {
			userID: 456,
			firstName: 'Bob',
			lastName: 'Smith'
		},
		ticketClassID: 111222333
	}, {
		id: 2,
		status: 200,
		userID: 456,
		isFlexible: false,
		userSummary: {
			firstName: 'Alice',
			lastName: 'Smith'
		},
		ticketClassID: 111222333
	}]
}, {
	id: 3,
	status: 200,
	statusOverride: 200,
	data: null,
	userID: 789,
	userSummary: null,
	attendeeSummary: [{
		id: 1,
		status: 200,
		userID: 789,
		isFlexible: false,
		userSummary: {
			userID: 789,
			firstName: 'Goalie',
			lastName: 'McGoalieface'
		},
		ticketClassID: 777888999
	}]
}];

const mockedPlayerList = [{
	id: 1,
	status: 200,
	userID: 123,
	isFlexible: false,
	userSummary: {
		userID: 123,
		firstName: 'John',
		lastName: 'Doe'
	},
	ticketClassID: 111222333
}, {
	id: 2,
	status: 200,
	userID: 456,
	isFlexible: false,
	userSummary: {
		userID: 456,
		firstName: 'Bob',
		lastName: 'Smith'
	},
	ticketClassID: 111222333
}, {
	id: 2,
	status: 200,
	userID: 456,
	isFlexible: false,
	userSummary: {
		firstName: 'Alice',
		lastName: 'Smith'
	},
	ticketClassID: 111222333
}, {
	id: 1,
	status: 200,
	userID: 789,
	isFlexible: false,
	userSummary: {
		userID: 789,
		firstName: 'Goalie',
		lastName: 'McGoalieface'
	},
	ticketClassID: 777888999
}];

module.exports = {
	mockedAttendeeList,
	mockedPlayerList
};
