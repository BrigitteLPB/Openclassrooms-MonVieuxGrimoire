import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { UpdateMiddleware } from 'apps/books/update';
import { readFile } from 'fs/promises';
import { get } from 'http';
import { BookModel } from 'models/book';
import { UserModel } from 'models/user';
import { Types } from 'mongoose';
import multer, { Multer } from 'multer';
import { Readable as ReadableStream } from 'node:stream';
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

describe('Book Update', () => {
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

    test('Update a book with image', async () => {
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

        // add a new book
        const bookId = new Types.ObjectId();
        await BookModel.create({
            _id: bookId,
            userId: userId,
            title: 'my title',
            author: 'author',
            imageUrl: `/${userId}/${bookId}.webp`,
            year: 2000,
            genre: 'my genre',
            ratings: [],
            averageRating: 0,
        });

        // add the image in the S3 file
        fileStorageManager.addFile({
            bucketName: bucketName,
            serverFilepath: `/${userId}/${bookId}.webp`,
            localFileStream: ReadableStream.from(
                await readFile('./tests/data/image.webp')
            ),
        });

        // set a basic express router
        apiManager.addMiddlewares([UpdateMiddleware]);

        // request the data
        const response = await request(apiManager.app)
            .put(UpdateMiddleware.uri.replace(':bookId', bookId.toString()))
            .field(
                'book',
                JSON.stringify({
                    title: 'my new title',
                    author: 'my new author',
                    genre: 'my new genre',
                    year: 2010,
                })
            )
            .attach('image', './tests/data/image_2.png')
            .set('Content-Type', 'multipart/form-data')
            .set(
                'Authorization',
                `Bearer ${Authorizer.generateToken({
                    userId: userId.toString(),
                })}`
            );

        console.debug(response.body);
        expect(response.statusCode).toBe(200);

        // search the new document in DB
        const dbResponse = await BookModel.findById(bookId);
        expect(dbResponse).not.toBeNull();
        expect(dbResponse?.title).toBe('my new title');
        expect(dbResponse?.author).toBe('my new author');
        expect(dbResponse?.genre).toBe('my new genre');
        expect(dbResponse?.year).toBe(2010);

        // test imageURL
        const fileUrl = await fileStorageManager.getFileURL({
            bucketName: bucketName,
            filename: dbResponse?.imageUrl,
        });
        const statusCode = await new Promise(function (resolve) {
            get(fileUrl, {}, (res) => {
                return resolve(res.statusCode);
            });
        });
        expect(statusCode).toBe(200);

        // search the file on S3
        const s3File = await fileStorageManager.minioClient.getObject(
            bucketName,
            dbResponse?.imageUrl
        );

        expect(s3File.read()).not.toBe(
            await readFile('./tests/data/image.webp')
        );
    });

    test('Update a book without image', async () => {
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

        // add a new book
        const bookId = new Types.ObjectId();
        await BookModel.create({
            _id: bookId,
            userId: userId,
            title: 'my title',
            author: 'author',
            imageUrl: `/${userId}/${bookId}.webp`,
            year: 2000,
            genre: 'my genre',
            ratings: [],
            averageRating: 0,
        });

        // add the image in the S3 file
        fileStorageManager.addFile({
            bucketName: bucketName,
            serverFilepath: `/${userId}/${bookId}.webp`,
            localFileStream: ReadableStream.from(
                await readFile('./tests/data/image.webp')
            ),
        });

        // set a basic express router
        apiManager.addMiddlewares([UpdateMiddleware]);

        // request the data
        const response = await request(apiManager.app)
            .put(UpdateMiddleware.uri.replace(':bookId', bookId.toString()))
            .send(
                JSON.stringify({
                    title: 'my new title',
                    author: 'my new author',
                    genre: 'my new genre',
                    year: 2010,
                })
            )
            .set('Content-Type', 'application/json')
            .set(
                'Authorization',
                `Bearer ${Authorizer.generateToken({
                    userId: userId.toString(),
                })}`
            );

        console.debug('body: ', response.body);
        expect(response.statusCode).toBe(200);

        // search the new document in DB
        const dbResponse = await BookModel.findById(bookId);
        expect(dbResponse).not.toBeNull();
        expect(dbResponse?.title).toBe('my new title');
        expect(dbResponse?.author).toBe('my new author');
        expect(dbResponse?.genre).toBe('my new genre');
        expect(dbResponse?.year).toBe(2010);
    });
});
