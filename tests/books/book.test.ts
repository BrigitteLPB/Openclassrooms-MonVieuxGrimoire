import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { CreateMiddleware } from 'apps/books/create';
import { readFile } from 'fs/promises';
import { get } from 'http';
import multer, { Multer } from 'multer';
import request from 'supertest';
import { ApiManager } from 'utils/managers/api';
import { S3FileStorage } from 'utils/managers/file_storage';
import { mongoManager } from 'utils/managers/mongo';
import { v4 } from 'uuid';

let apiManager: ApiManager;

let bucketName = '';
let multerManager: Multer;
let fileStorageManager: S3FileStorage;

describe('Book create', () => {
    beforeEach(async () => {
        // api
        apiManager = new ApiManager();

        // mongo
        await mongoManager.connect();

        // minio
        fileStorageManager = new S3FileStorage({
            host: process.env.MINIO_HOST || '',
            port: Number(process.env.MINIO_PORT) || 0,
            accessKey: process.env.MINIO_ACCESS_KEY || '',
            secretKey: process.env.MINIO_SECRET_KEY || '',
            imageBucketName: bucketName,
        });

        multerManager = multer({
            storage: multer.memoryStorage(),
        });

        bucketName = `test-${v4()}`;

        // add bucket
        await fileStorageManager.initBucketSafe({
            bucketName: bucketName,
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

        // remove bucket
        await fileStorageManager.minioClient.removeBucket(bucketName);
    });

    test('Create a book', async () => {
        expect(
            await fileStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);

        CreateMiddleware.uri = `/${v4()}`;
        CreateMiddleware.needAuth = false;

        // set a basic express router
        apiManager.addMiddlewares([CreateMiddleware]);

        console.debug('-1');

        // request the data
        const response = await request(apiManager.app)
            .post(CreateMiddleware.uri)
            .field(
                'book',
                JSON.stringify({
                    title: '',
                    author: '',
                    year: 2010,
                    userId: 'aaaaaaaaa',
                    genre: '',
                })
            )
            .attach('image', './tests/books/data/image.png')
            .set('Content-Type', 'multipart/form-data')
            .expect(200);

        console.debug('0');

        // test imageURL
        const statusCode = await new Promise(function (resolve) {
            get(response.body.imageUrl, {}, (res) => {
                return resolve(res.statusCode);
            });
        });

        console.debug(statusCode);

        expect(statusCode).toBe(200);

        console.debug('1');

        console.debug(
            await fileStorageManager.minioClient
                .listObjects(bucketName, undefined, true)
                .toArray()
        );

        // search the file on S3
        const s3File = await fileStorageManager.minioClient.getObject(
            bucketName,
            `/${response.body.userId}/${response.body.id}.png`
        );

        console.debug('3');

        // get the local file
        const file = await readFile('./tests/utils/managers/data/image.png');

        expect(s3File.read()).toEqual(file);
    });
});
