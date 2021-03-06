import { AddressInfo } from 'net';
import Client from 'socket.io-client';
import faker from 'faker';
import { createPartialDone } from '../test_helpers';
import { server, mockedShoppingListService } from './test_setup';

describe('Server', () => {
  describe('read an item', () => {
    let clientSocket;

    beforeEach(() => {
      clientSocket = Client(
        `http://localhost:${(server.address() as AddressInfo).port}`,
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
      clientSocket.close();
    });

    it('successfully reads an item', (done) => {
      const dummyItem = {
        id: faker.datatype.uuid(),
        title: faker.lorem.sentence().slice(0, 50),
        completed: faker.datatype.boolean(),
      };
      jest
        .spyOn(mockedShoppingListService, 'findItemById')
        .mockImplementationOnce(() => dummyItem);

      clientSocket.emit('shoppingListItem:read', dummyItem.id, (response) => {
        expect(response.status).toBe('success');
        expect(response.payload).toMatchObject(dummyItem);
        done();
      });
    });

    it('disconnects if a callback is missing', (done) => {
      const dummyItemId = faker.datatype.uuid();

      clientSocket.emit('shoppingListItem:read', dummyItemId);

      clientSocket.on('disconnect', () => {
        done();
      });
    });

    it(`rejects to read an item if its id is missing
      and reports a reason`, (done) => {
      const partialDone = createPartialDone(3, done);
      let dummyItemId = undefined;

      clientSocket.emit('shoppingListItem:read', dummyItemId, (response) => {
        expect(response.status).toBe('fail');
        expect(response.payload).toMatchObject({ itemId: expect.any(String) });
        partialDone();
      });

      dummyItemId = null;
      clientSocket.emit('shoppingListItem:read', dummyItemId, (response) => {
        expect(response.status).toBe('fail');
        expect(response.payload).toMatchObject({ itemId: expect.any(String) });
        partialDone();
      });

      dummyItemId = '';
      clientSocket.emit('shoppingListItem:read', dummyItemId, (response) => {
        expect(response.status).toBe('fail');
        expect(response.payload).toMatchObject({ itemId: expect.any(String) });
        partialDone();
      });
    });

    it(`rejects and reports a reason if an item is not found`, (done) => {
      const dummyItemId = faker.datatype.uuid();
      jest
        .spyOn(mockedShoppingListService, 'findItemById')
        .mockImplementationOnce(() =>
          Promise.reject(
            new mockedShoppingListService.NotFoundError(faker.lorem.sentence()),
          ),
        );

      clientSocket.emit('shoppingListItem:read', dummyItemId, (response) => {
        expect(response.status).toBe('fail');
        expect(response.payload).toMatchObject({
          itemId: expect.any(String),
        });
        done();
      });
    });

    it('reports an error if an unexpected error occured', (done) => {
      const dummyItemId = faker.datatype.uuid();
      jest
        .spyOn(mockedShoppingListService, 'findItemById')
        .mockImplementationOnce(() =>
          Promise.reject(new Error(faker.lorem.sentence())),
        );

      clientSocket.emit('shoppingListItem:read', dummyItemId, (response) => {
        expect(response.status).toBe('error');
        expect(response).toMatchObject({
          message: expect.any(String),
        });
        done();
      });
    });
  });
});
