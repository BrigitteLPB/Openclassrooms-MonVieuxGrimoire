import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { ListMiddleware } from 'apps/books/list';
import { readFile } from 'fs/promises';
import { BookModel } from 'models/book';
import { Types } from 'mongoose';
import multer, { Multer } from 'multer';
import { Readable as ReadableStream } from 'node:stream';
import request from 'supertest';
import { ApiManager } from 'utils/managers/api';
import { S3FileStorage } from 'utils/managers/file_storage';
import { mongoManager } from 'utils/managers/mongo';
import { v4 } from 'uuid';

let apiManager: ApiManager;

let bucketName = '';
let dbname = '';
let multerManager: Multer;
let fileStorageManager: S3FileStorage;

describe('Book List', () => {
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

    test('List books', async () => {
        expect(
            await fileStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);

        // new user
        const userId = new Types.ObjectId();

        // add a new book
        const bookIds = Array.from(Array(5), (_, x) => new Types.ObjectId());
        await BookModel.insertMany(
            await Promise.all(
                bookIds.map(async (id) => {
                    // add the image in the S3 file
                    await fileStorageManager.addFile({
                        bucketName: bucketName,
                        serverFilepath: `/${userId}/${id}.webp`,
                        localFileStream: ReadableStream.from(
                            await readFile('./tests/data/image.webp')
                        ),
                    });

                    return {
                        _id: id,
                        userId: userId,
                        title: 'my title',
                        author: 'author',
                        imageUrl: `/${userId}/${id}.webp`,
                        year: 2000,
                        genre: 'my genre',
                        ratings: [],
                        averageRating: 0,
                    };
                })
            )
        );

        // set a basic express router
        apiManager.addMiddlewares([ListMiddleware]);

        // request the data
        const response = await request(apiManager.app).get(ListMiddleware.uri);

        console.debug(bookIds);
        console.debug(response.body);
        expect(response.statusCode).toBe(200);

        expect(response.body.length).toBe(5);

        response.body.forEach(async (book: { [k: string]: any }, i: number) => {
            expect(bookIds.find((e) => e == book.id)).not.toBeNull();

            // search the new document in DB
            const dbResponse = await BookModel.findById(book.id);
            expect(response.body).not.toBeNull();
        });
    });
});
