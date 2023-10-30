import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { ListBestRatingRatingMiddleware } from 'apps/books/ratings/list_best_ratings';
import { readFile } from 'fs/promises';
import { BookModel } from 'models/book';
import { UserModel } from 'models/user';
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

describe('Book Rating List', () => {
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

    test('List the best 3', async () => {
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

        // add a new books
        const bookIds = Array.from(Array(5), (_, x) => new Types.ObjectId());
        await BookModel.insertMany(
            await Promise.all(
                bookIds.map(async (id, i) => {
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
                        ratings: [{ userId: userId, rating: i + 1 }],
                        averageRating: i + 1,
                    };
                })
            )
        );

        // set a basic express router
        apiManager.addMiddlewares([ListBestRatingRatingMiddleware]);

        // request the data
        const response = await request(apiManager.app).get(
            ListBestRatingRatingMiddleware.uri
        );

        console.debug(response.body);
        expect(response.statusCode).toBe(200);
        expect(response.body.length).toBe(3);

        response.body.forEach((book: { [k: string]: any }, i: number) => {
            expect(book.averageRating).toBe(5 - i);
        });
    });
});
