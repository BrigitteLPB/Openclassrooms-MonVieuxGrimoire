import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { CreateMiddleware } from 'apps/books/create';
import { get } from 'http';
import { UserModel } from 'models/user';
import { Types } from 'mongoose';
import multer, { Multer } from 'multer';
import request from 'supertest';
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

describe('Book create', () => {
    beforeEach(async () => {
        // api
        apiManager = new ApiManager();

        // mongo
        dbname = `test-${v4()}`;
        await mongoManager.connect(dbname);

        // S3 minio
        bucketName = `test-${v4()}`;
        S3FileStorage.initClient({
            host: process.env.MINIO_HOST || '',
            port: Number(process.env.MINIO_PORT) || 0,
            accessKey: process.env.MINIO_ACCESS_KEY || '',
            secretKey: process.env.MINIO_SECRET_KEY || '',
            imageBucketName: bucketName,
        });
        await S3FileStorage.initBucketSafe({
            bucketName: bucketName,
        });
        fileStorageManager = new S3FileStorage();

        // add multer middleware
        multerManager = multer({
            storage: multer.memoryStorage(),
        });
    });

    afterEach(async () => {
        // clear all files
        const objectList = await fileStorageManager.minioClient
            .listObjects(bucketName, undefined, true)
            .toArray();

        await fileStorageManager.minioClient.removeObjects(
            bucketName,
            objectList
        );

        // remove the database
        await mongoManager.client()?.connection.db.dropDatabase();
        await mongoManager.client()?.disconnect();

        // remove bucket
        await fileStorageManager.minioClient.removeBucket(bucketName);
    });

    test('Create a book', async () => {
        expect(
            await fileStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);

        // add a new user
        const userId = new Types.ObjectId();
        await UserModel.create({
            _id: userId,
            email: 'my email',
            password: 'my password',
        });

        // set a basic express router
        apiManager.addMiddlewares([CreateMiddleware]);

        // request the data
        const response = await request(apiManager.app)
            .post(CreateMiddleware.uri)
            .field(
                'book',
                JSON.stringify({
                    title: '',
                    author: '',
                    year: 2010,
                    userId: userId.toString(),
                    genre: '',
                })
            )
            .attach('image', './tests/data/image.png')
            .set('Content-Type', 'multipart/form-data')
            .set(
                'Authorization',
                `Bearer ${Authorizer.generateToken({
                    userId: userId.toString(),
                })}`
            );

        console.debug(response.body);
        expect(response.statusCode).toBe(200);

        // test imageURL
        const statusCode = await new Promise(function (resolve) {
            get(response.body.imageUrl, {}, (res) => {
                return resolve(res.statusCode);
            });
        });
        expect(statusCode).toBe(200);

        // search the file on S3
        const s3File = await fileStorageManager.minioClient.getObject(
            bucketName,
            `/${response.body.userId}/${response.body.id}.webp`
        );

        expect(s3File).not.toBeNull();
    });
});
