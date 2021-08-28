import { AddressInfo } from 'net';
import Client from 'socket.io-client';
import faker from 'faker';
import { Server, Service } from './server';

const mockedLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

class MockedShoppingListService {
  public createItem() {
    jest.fn();
  }

  public findAll() {
    jest.fn();
  }

  public isValidationError() {
    jest.fn();
  }

  public updateItem() {
    jest.fn();
  }
}

describe('Server', () => {
  let server;

  beforeEach(() => {
    const mockedShoppingListService = new MockedShoppingListService();
    server = new Server({
      port: 3001,
      shoppingListService:
        mockedShoppingListService as unknown as jest.Mocked<Service>,
      logger: mockedLogger,
    });
  });

  describe('start a server', () => {
    it('starts on a certain port', async () => {
      await server.start();

      expect((server.address() as AddressInfo).port).toBe(3001);

      await server.stop();
    });

    it('invokes a callback', async () => {
      const mockCb = jest.fn();

      await server.start(mockCb);

      expect(mockCb).toHaveBeenCalledTimes(1);

      await server.stop();
    });
  });

  describe('stop a server', () => {
    it('invokes a callback', async () => {
      const mockCb = jest.fn();

      await server.start();
      await server.stop(mockCb);

      expect(mockCb).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Shopping list management', () => {
  const mockedShoppingListService = new MockedShoppingListService();
  let server, clientSocket;

  beforeEach((done) => {
    server = new Server({
      port: 3001,
      shoppingListService:
        mockedShoppingListService as unknown as jest.Mocked<Service>,
      logger: mockedLogger,
    });
    server.start(() => {
      clientSocket = Client(`http://localhost:${server.address().port}`);
      done();
    });
  });

  afterEach((done) => {
    jest.clearAllMocks();
    clientSocket.close();
    server.stop(() => {
      done();
    });
  });

  describe('Create an item', () => {
    it('successfully creates a valid item', (done) => {
      const dummyItemInfo = {
        title: faker.lorem.words(3).slice(0, 50),
        completed: faker.datatype.boolean(),
      };

      const dummyItem = {
        id: faker.datatype.uuid(),
        title: dummyItemInfo.title,
        completed: dummyItemInfo.completed,
      };

      jest
        .spyOn(mockedShoppingListService, 'createItem')
        .mockImplementationOnce(() => Promise.resolve(dummyItem));

      clientSocket.emit(
        'shoppingListItem:create',
        dummyItemInfo,
        (response) => {
          /**
           * ToDo! Add more integration testing to the case
           * example: test that a public method of the service
           * called with certain parameters
           */
          expect(false).toBe(true);
          expect(response.status).toBe('success');
          expect(response.payload).toMatchObject(dummyItem);
          done();
        },
      );
    });

    it.skip('disconnects if a callback is missing', (done) => {
      const dummyItemInfo = {
        title: faker.lorem.words(3).slice(0, 50),
        completed: faker.datatype.boolean(),
      };

      clientSocket.emit('shoppingListItem:create', dummyItemInfo);
      clientSocket.on('disconnect', () => {
        // ToDo! Add reason test here
        expect(false).toBe(true);
        done();
      });
    });

    it(`rejects to create an item with an invalid property
      and reports reasons`, (done) => {
      const dummyItem = {
        title: '',
        completed: faker.datatype.boolean(),
      };

      const dummyErrorMessage = faker.lorem.sentence();
      const dummyItemInvalidPropertyName = faker.datatype.string();

      const dummyValidationError = {
        error: {
          details: [
            {
              message: dummyErrorMessage,
              context: {
                key: dummyItemInvalidPropertyName,
              },
            },
          ],
        },
      };

      jest
        .spyOn(mockedShoppingListService, 'createItem')
        .mockImplementationOnce(() => Promise.reject(dummyValidationError));

      jest
        .spyOn(mockedShoppingListService, 'isValidationError')
        .mockImplementationOnce(() => true);

      clientSocket.emit('shoppingListItem:create', dummyItem, (response) => {
        expect(response.status).toBe('fail');
        expect(response.payload).toEqual(
          expect.objectContaining({
            [dummyItemInvalidPropertyName]: dummyErrorMessage,
          }),
        );
        done();
      });
    });

    it('reports an error if an unexpected error occured', (done) => {
      const dummtItemInfo = {
        title: faker.lorem.word(3).slice(0, 50),
        completed: faker.datatype.boolean(),
      };

      const dummyErrorMessage = faker.lorem.word(3).slice(0, 50);

      jest
        .spyOn(mockedShoppingListService, 'createItem')
        .mockImplementationOnce(() => {
          throw new Error(dummyErrorMessage);
        });

      jest
        .spyOn(mockedShoppingListService, 'isValidationError')
        .mockImplementationOnce(() => false);

      clientSocket.emit(
        'shoppingListItem:create',
        dummtItemInfo,
        (response) => {
          expect(response.status).toBe('error');
          expect(response.message).toEqual(expect.any(String));
          done();
        },
      );
    });
  });

  describe('List items', () => {
    it('successfully returns a list of items', (done) => {
      const dummyItem1 = {
        id: faker.datatype.uuid(),
        title: faker.lorem.words(3).slice(0, 50),
        completed: faker.datatype.boolean(),
      };
      const dummyItem2 = {
        id: faker.datatype.uuid(),
        title: faker.lorem.words(1).slice(0, 50),
        completed: faker.datatype.boolean(),
      };
      const dummyItem3 = {
        id: faker.datatype.uuid(),
        title: faker.lorem.words(2).slice(0, 50),
        completed: faker.datatype.boolean(),
      };

      jest
        .spyOn(mockedShoppingListService, 'findAll')
        .mockImplementation(() =>
          Promise.resolve([dummyItem1, dummyItem2, dummyItem3]),
        );

      clientSocket.emit('shoppingListItem:list', (response) => {
        expect(response.status).toBe('success');
        const dummyItemList = response.payload;
        expect(dummyItemList).toHaveLength(3);
        expect(dummyItemList).toEqual(
          expect.arrayContaining([dummyItem3, dummyItem1, dummyItem2]),
        );
        done();
      });
    });

    it.skip('disconnects if a callback is missing', (done) => {
      clientSocket.emit('shoppingListItem:list');
      clientSocket.on('disconnect', () => {
        // ToDo! Add reason test here
        expect(false).toBe(true);
        done();
      });
    });

    it('reports an error if an unexpected error occured', (done) => {
      const dummyErrorMessage = faker.lorem.sentence();

      jest
        .spyOn(mockedShoppingListService, 'findAll')
        .mockImplementationOnce(() => {
          throw new Error(dummyErrorMessage);
        });

      clientSocket.emit('shoppingListItem:list', (response) => {
        expect(response.status).toBe('error');
        expect(response.message).toBe(dummyErrorMessage);
        done();
      });
    });
  });

  describe('Update an item', () => {
    it('successfully updates an item', (done) => {
      const dummyItem = {
        id: faker.datatype.uuid(),
        title: faker.lorem.sentence().slice(0, 50),
        completed: faker.datatype.boolean(),
      };
      const dummyItemUpdate = { title: faker.lorem.sentence().slice(0, 50) };
      jest
        .spyOn(mockedShoppingListService, 'updateItem')
        .mockImplementationOnce(() => {
          Promise.resolve({ ...dummyItem, ...dummyItemUpdate });
        });

      clientSocket.emit(
        'shoppingListItem:update',
        dummyItemUpdate,
        (response) => {
          /**
           * ToDo! Add more integration testing to the case
           * example: test that a public method of the service
           * called with certain parameters
           */
          expect(false).toBe(true);
          expect(response.status).toBe('success');
          expect(response.payload).toMatchObject({
            id: dummyItem.id,
            title: dummyItemUpdate.title,
            completed: dummyItem.completed,
          });
          done();
        },
      );
    });

    it.skip('disconnects if a callback is missing', (done) => {
      const dummyItemInfo = {
        title: faker.lorem.words(3).slice(0, 50),
        completed: faker.datatype.boolean(),
      };

      clientSocket.emit('shoppingListItem:update', dummyItemInfo);
      clientSocket.on('disconnect', () => {
        // ToDo! Add reason test here
        expect(false).toBe(true);
        done();
      });
    });

    it.skip(`rejects to update an item if its id is missing
      and reports a reason`, () => {
      expect(false).toBe(true);
    });

    it.skip(`rejects to update an item with an invalid property
      and reports reasons`, () => {
      expect(false).toBe(true);
    });

    it.skip('reports an error if an unexpected error occured', (done) => {
      const dummyErrorMessage = faker.lorem.sentence();

      jest
        .spyOn(mockedShoppingListService, 'updateItem')
        .mockImplementationOnce(() => {
          throw new Error(dummyErrorMessage);
        });

      clientSocket.emit('shoppingListItem:update', (response) => {
        expect(response.status).toBe('error');
        expect(response.message).toBe(dummyErrorMessage);
        done();
      });
    });
  });

  describe('Delete an item', () => {
    it.skip('successfully deletes an item', () => {
      /**
       * ToDo! Add integration testing to the case
       * example: test that a public method of the service
       * called with certain parameters
       */
      expect(false).toBe(true);
    });

    it.skip('disconnects if a callback is missing and reports a reason', () => {
      // ToDo! Add reason test here
      expect(false).toBe(true);
    });

    it.skip(`rejects to delete an item if its id is missing
      and reports a reason`, () => {
      expect(false).toBe(true);
    });

    it.skip('reports an error if an unexpected error occured', () => {
      expect(false).toBe(true);
    });
  });
});
