const indexRouter = require('./../../routes/index');
const fetchGames = indexRouter.fetchGames;

require('jest-fetch-mock').enableMocks();

describe('index router', () => {
	beforeEach(() => {
		fetch.resetMocks()
	});
	describe('fetchGames method', () => {
		it('should return an object from the Open Sports API', async () => {
			const mockedResponse = { mocked: 'a mocked response' };
			fetch.mockResponse(JSON.stringify(mockedResponse));

			const result = await fetchGames(12345);

			expect(result).toEqual(mockedResponse);
			expect(fetch.mock.calls[0][0]).toEqual(`https://osapi.opensports.ca/app/posts/listFiltered?groupID=${12345}&limit=24`);
		});
	});
});
