const indexRouter = require('./../../routes/index');

require('jest-fetch-mock').enableMocks();


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

describe('index router', () => {
	beforeEach(() => {
		fetch.resetMocks()
	});

	describe('fetchGames method', () => {
		it('should return an object from the Open Sports API', async () => {
			const mockedResponse = { mocked: 'a mocked response' };
			fetch.mockResponse(JSON.stringify(mockedResponse));

			const result = await indexRouter.fetchGames(12345);

			expect(result).toEqual(mockedResponse);
			expect(fetch.mock.calls[0][0]).toEqual(`https://osapi.opensports.ca/app/posts/listFiltered?groupID=${12345}&limit=24`);
		});
	});

	describe('getAttendeeListByAttendeeType method', () => {
		it('should return only the attendees that match the provided attendeeType', () => {
			const result = indexRouter.getAttendeeListByAttendeeType(mockedAttendeeList, 111222333);

			expect(result).toEqual([{
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
			}]);
		});
	});

	describe('the playerModule', () => {
		describe('getAttendeeIDList method', () => {
			const context = {};
			beforeEach(() => {
				context.getTempID = jest.fn()
					.mockReturnValueOnce('mocked-temp-id-1')
					.mockReturnValueOnce('mocked-temp-id-2')
					.mockReturnValueOnce('mocked-temp-id-3')
					.mockReturnValueOnce('mocked-temp-id-4');
			});
			it('should return both the userID and tempID in an object', () => {
				const result = indexRouter.playerModule.getAttendeeIDList.call(context, mockedPlayerList);
				expect(result).toEqual([{
					userID: 123,
					tempID: 'mocked-temp-id-1'
				}, {
					userID: 456,
					tempID: 'mocked-temp-id-2'
				}, {
					userID: undefined,
					tempID: 'mocked-temp-id-3'
				}, {
					userID: 789,
					tempID: 'mocked-temp-id-4'
				}])
			});
		});

		describe('getTempID method', () => {
			it('should create a case-insensitive temporary ID based on the user\s firstname and last name', () => {
				const result = indexRouter.playerModule.getTempID({
					userSummary: {
						firstName: 'wAyNe',
						lastName: 'greTzky'
					}
				});
				expect(result).toEqual('wayne-gretzky');
			});
		});
	});

	describe('the bbUtils', () => {
		describe('sorts library', () => {
			describe('sortByPlayerRanking', () => {
				it('should sort a list of players by ranking, highest to lowest', () => {
					const playerList = [{
						userSummary: {
							lastName: 'Smith',
							ratingOverall: 1
						}
					}, {
						userSummary: {
							lastName: 'Jones',
							ratingOverall: 55
						}
					}, {
						userSummary: {
							lastName: 'Anderson',
							ratingOverall: 99
						}
					}];
					playerList.sort(indexRouter.bbUtils.sorts.byPlayerRanking)
					expect(playerList).toEqual([{
						userSummary: {
							lastName: 'Anderson',
							ratingOverall: 99
						}
					}, {
						userSummary: {
							lastName: 'Jones',
							ratingOverall: 55
						}
					}, {
						userSummary: {
							lastName: 'Smith',
							ratingOverall: 1
						}
					}]);
				});
			});
		})
	});
});
