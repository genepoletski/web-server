import { AddressInfo } from 'net';
import Client from 'socket.io-client';
import faker from 'faker';
import { createPartialDone } from '../test_helpers';
import { server, mockedShoppingListService } from './test_setup';

describe('Server', () => {
  describe('update an item', () => {
    let clientSocket;

    beforeEach(() => {
      // eslint-disable-next-line max-len
      clientSocket = Client(
        `http://localhost:${(server.address() as AddressInfo).port}`,
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
      clientSocket.close();
    });

    it('successfully updates an item', (done) => {
      const dummyItem = {
        id: faker.datatype.uuid(),
        title: faker.lorem.sentence().slice(0, 50),
        completed: faker.datatype.boolean(),
      };
      const dummyItemUpdate = { title: faker.lorem.sentence().slice(0, 50) };
      jest
        .spyOn(mockedShoppingListService, 'validateItemUpdate')
        .mockImplementationOnce(() => ({}));
      jest
        .spyOn(mockedShoppingListService, 'updateItem')
        .mockImplementationOnce(() =>
          Promise.resolve({ ...dummyItem, ...dummyItemUpdate }),
        );

      clientSocket.emit(
        'shoppingListItem:update',
        dummyItem.id,
        dummyItemUpdate,
        (response) => {
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

    it('disconnects if a callback is missing', (done) => {
      const dummyItemId = faker.datatype.uuid();
      const dummyItemInfo = {
        title: faker.lorem.words(3).slice(0, 50),
        completed: faker.datatype.boolean(),
      };

      clientSocket.emit('shoppingListItem:update', dummyItemId, dummyItemInfo);

      clientSocket.on('disconnect', () => {
        done();
      });
    });

    it(`rejects to update an item if its id is missing
      and reports a reason`, (done) => {
      const partialDone = createPartialDone(3, done);

      let dummyItemId = undefined;
      const dummyItemUpdate = { title: faker.lorem.sentence().slice(0, 50) };

      clientSocket.emit(
        'shoppingListItem:update',
        dummyItemId,
        dummyItemUpdate,
        (response) => {
          expect(response.status).toBe('fail');
          expect(response.payload).toMatchObject({
            itemId: expect.any(String),
          });
          partialDone();
        },
      );

      dummyItemId = null;
      clientSocket.emit(
        'shoppingListItem:update',
        dummyItemId,
        dummyItemUpdate,
        (response) => {
          expect(response.status).toBe('fail');
          expect(response.payload).toMatchObject({
            itemId: expect.any(String),
          });
          partialDone();
        },
      );

      dummyItemId = '';
      clientSocket.emit(
        'shoppingListItem:update',
        dummyItemId,
        dummyItemUpdate,
        (response) => {
          expect(response.status).toBe('fail');
          expect(response.payload).toMatchObject({
            itemId: expect.any(String),
          });
          partialDone();
        },
      );
    });

    it(`rejects to update an item with an invalid property
      and reports reasons`, (done) => {
      const dummyItemId = faker.datatype.uuid();
      const dummyInvalidItemUpdate = { title: '' };
      const dummyInvalidTitleMessage = faker.lorem.sentence();
      jest
        .spyOn(mockedShoppingListService, 'validateItemUpdate')
        .mockImplementationOnce(() => ({
          error: {
            errors: {
              title: dummyInvalidTitleMessage,
            },
          },
        }));

      clientSocket.emit(
        'shoppingListItem:update',
        dummyItemId,
        dummyInvalidItemUpdate,
        (response) => {
          expect(response.status).toBe('fail');
          expect(response.payload).toMatchObject({
            title: dummyInvalidTitleMessage,
          });
          done();
        },
      );
    });

    it(`rejects to update an item if not found and reports a reason`, (done) => {
      const dummyItemId = faker.datatype.uuid();
      const dummyItemUpdate = { title: faker.lorem.sentence().slice(0, 50) };
      jest
        .spyOn(mockedShoppingListService, 'validateItemUpdate')
        .mockImplementationOnce(() => Promise.resolve({}));
      jest
        .spyOn(mockedShoppingListService, 'updateItem')
        .mockImplementationOnce(() =>
          Promise.reject(
            new mockedShoppingListService.NotFoundError(faker.lorem.sentence()),
          ),
        );

      clientSocket.emit(
        'shoppingListItem:update',
        dummyItemId,
        dummyItemUpdate,
        (response) => {
          expect(response.status).toBe('fail');
          expect(response.payload).toMatchObject({
            itemId: expect.any(String),
          });
          done();
        },
      );
    });

    it('reports an error if an unexpected error occured', (done) => {
      const dummyItemId = faker.datatype.uuid();
      const dummyItemUpdate = faker.lorem.sentence().slice(0, 50);
      const dummyErrorMessage = faker.lorem.sentence();
      jest
        .spyOn(mockedShoppingListService, 'validateItemUpdate')
        .mockImplementationOnce(() => ({}));
      jest
        .spyOn(mockedShoppingListService, 'updateItem')
        .mockImplementationOnce(() => {
          throw new Error(dummyErrorMessage);
        });

      clientSocket.emit(
        'shoppingListItem:update',
        dummyItemId,
        dummyItemUpdate,
        (response) => {
          expect(response.status).toBe('error');
          expect(response.message).toBe(dummyErrorMessage);
          done();
        },
      );
    });
  });
});
