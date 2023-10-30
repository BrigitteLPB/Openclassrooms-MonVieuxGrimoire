import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { LoginMiddleware } from 'apps/auth/login';
import { UserModel } from 'models/user';
import { Types } from 'mongoose';
import { Multer } from 'multer';
import request from 'supertest';
import { Hasher } from 'utils/hasher';
import { Authorizer } from 'utils/jwt';
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

    test('Login', async () => {
        // create new user
        const userId = new Types.ObjectId();
        await UserModel.create({
            _id: userId,
            email: 'my email',
            password: await Hasher.getHash('my password'),
        });

        // set a basic express router
        apiManager.addMiddlewares([LoginMiddleware]);

        // request the data
        const response = await request(apiManager.app)
            .post(LoginMiddleware.uri)
            .send(
                JSON.stringify({
                    email: 'my email',
                    password: 'my password',
                })
            )
            .set('Content-Type', 'application/json');

        console.debug(response.body);
        expect(response.statusCode).toBe(200);

        expect(response.body.userId).not.toBeNull();
        expect(response.body.token).not.toBeNull();

        // validate token
        expect(Authorizer.verifyToken(response.body.token)).toBeTruthy();

        // search the new document in DB
        const dbResponse = await UserModel.findById(response.body.userId);
        expect(dbResponse).not.toBeNull();
        expect(dbResponse?.email).toBe('my email');
        expect(
            await Hasher.validateHash('my password', dbResponse?.password)
        ).toBe(true);
    });

    test('Login with bad credential', async () => {
        // create new user
        const userId = new Types.ObjectId();
        await UserModel.create({
            _id: userId,
            email: 'my email',
            password: await Hasher.getHash('my password'),
        });

        // set a basic express router
        apiManager.addMiddlewares([LoginMiddleware]);

        // request the data
        const response = await request(apiManager.app)
            .post(LoginMiddleware.uri)
            .send(
                JSON.stringify({
                    email: 'my bad email',
                    password: 'my bad password',
                })
            )
            .set('Content-Type', 'application/json');

        console.debug(response.body);
        expect(response.statusCode).toBe(401);

        expect(response.body.userId).toBeUndefined();
        expect(response.body.token).toBeUndefined();
    });
});
