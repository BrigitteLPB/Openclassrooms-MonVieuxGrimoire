import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { CreateMiddleware } from 'apps/books/create';
import { DeleteMiddleware } from 'apps/books/delete';
import { readFile } from 'fs/promises';
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

describe('Book Delete', () => {
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

    test('Delete a book with auth user', async () => {
        expect(
            await fileStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);

        CreateMiddleware.uri = `/${v4()}`;
        CreateMiddleware.needAuth = false;

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
        apiManager.addMiddlewares([DeleteMiddleware]);

        // request the data
        const response = await request(apiManager.app)
            .delete(DeleteMiddleware.uri.replace(':bookId', bookId.toString()))
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
        expect(dbResponse).toBeNull();

        // test imageURL
        let file;
        try {
            file = await fileStorageManager.minioClient.getObject(
                bucketName,
                `/${userId}/${bookId}.webp`
            );
        } catch {
            expect(file).toBeUndefined();
        }
    });
});
