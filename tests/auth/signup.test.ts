import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { SignupMiddleware } from 'apps/auth/signup';
import { UserModel } from 'models/user';
import { Multer } from 'multer';
import request from 'supertest';
import { Hasher } from 'utils/hasher';
import { ApiManager } from 'utils/managers/api';
import { S3FileStorage } from 'utils/managers/file_storage';
import { mongoManager } from 'utils/managers/mongo';
import { v4 } from 'uuid';

let apiManager: ApiManager;

let bucketName = '';
let dbname = '';
let multerManager: Multer;
let fileStorageManager: S3FileStorage;

describe('User Signup', () => {
    beforeEach(async () => {
        // api
        apiManager = new ApiManager();

        // mongo
        dbname = `test-${v4()}`;
        await mongoManager.connect(dbname);
    });

    afterEach(async () => {
        // remove the database
        await mongoManager.client()?.connection.db.dropDatabase();
        await mongoManager.client()?.disconnect();
    });

    test('Singup first time', async () => {
        // set a basic express router
        apiManager.addMiddlewares([SignupMiddleware]);

        // request the data
        const response = await request(apiManager.app)
            .post(SignupMiddleware.uri)
            .send(
                JSON.stringify({
                    email: 'my email',
                    password: 'my password',
                })
            )
            .set('Content-Type', 'application/json');

        console.debug(response.body);
        expect(response.statusCode).toBe(200);

        // search the new document in DB
        const dbResponse = await UserModel.findOne({ email: 'my email' });
        expect(dbResponse).not.toBeNull();
        expect(dbResponse?.email).toBe('my email');
        expect(
            await Hasher.validateHash('my password', dbResponse?.password)
        ).toBe(true);
    });
});
