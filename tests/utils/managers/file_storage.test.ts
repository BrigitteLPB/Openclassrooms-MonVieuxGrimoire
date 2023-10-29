import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import express from 'express';
import { createReadStream } from 'fs';
import { get } from 'http';
import multer from 'multer';
import request from 'supertest';
import { S3FileStorage } from 'utils/managers/file_storage';
import { v4 } from 'uuid';

let fileStorageManager: S3FileStorage;
let bucketName = '';

describe('FileStorage', () => {
    beforeEach(async () => {
        bucketName = `test-${v4()}`;

        S3FileStorage.initClient({
            host: process.env.MINIO_HOST || '',
            port: Number(process.env.MINIO_PORT) || 0,
            accessKey: process.env.MINIO_ACCESS_KEY || '',
            secretKey: process.env.MINIO_SECRET_KEY || '',
            imageBucketName: bucketName,
        });

        // add bucket
        await S3FileStorage.initBucketSafe({
            bucketName: bucketName,
        });

        fileStorageManager = new S3FileStorage();
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

    test('Create a bucket', async () => {
        expect(
            await fileStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);
    });

    test('Add file', async () => {
        expect(
            await fileStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);

        await fileStorageManager.addFile({
            bucketName: bucketName,
            serverFilepath: '/data.json',
            localFileStream: createReadStream('./tests/data/my_data.json'),
        });

        const file = await fileStorageManager.minioClient.getObject(
            bucketName,
            '/data.json'
        );
        expect(JSON.parse(file.read().toString())).toEqual({
            hello: 'world!',
        });
    });

    test('Get file', async () => {
        expect(
            await fileStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);

        await fileStorageManager.addFile({
            bucketName: bucketName,
            serverFilepath: '/data.json',
            localFileStream: createReadStream('./tests/data/my_data.json'),
        });

        const file = await fileStorageManager.getFile({
            bucketName: bucketName,
            filename: '/data.json',
        });
        expect(JSON.parse(file.read().toString())).toEqual({
            hello: 'world!',
        });
    });

    test('Get File URL', async () => {
        expect(
            await fileStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);

        await fileStorageManager.addFile({
            bucketName: bucketName,
            serverFilepath: '/data.json',
            localFileStream: createReadStream('./tests/data/my_data.json'),
        });

        const fileURL = await fileStorageManager.getFileURL({
            bucketName: bucketName,
            filename: '/data.json',
        });

        const statusCode = await new Promise(function (resolve) {
            get(fileURL, {}, (res) => {
                return resolve(res.statusCode);
            });
        });

        expect(statusCode).toBe(200);
    });

    test('Multer StorageEngine', async () => {
        expect(
            await fileStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);

        const apiRoute = `/${v4()}`;
        const bookId = v4();
        const userId = v4();
        const expressServer = express();
        const multerUploads = multer({
            storage: multer.memoryStorage(),
        });

        // set a basic express router
        expressServer.post(
            apiRoute,
            multerUploads.single('image'),
            (_, res, next) => {
                res.locals.body = {
                    id: bookId,
                    userId: userId,
                };
                next();
            },
            S3FileStorage.processFileMiddleware,
            async (_, res) => {
                res.json({
                    imageUrl: res.locals.imageUri,
                });
            }
        );

        // request the data
        const response = await request(expressServer)
            .post(apiRoute)
            .field(
                'book',
                JSON.stringify({
                    title: '',
                    author: '',
                    year: 2010,
                    userId: '',
                    genre: '',
                })
            )
            .attach('image', './tests/data/image.png')
            .set('Content-Type', 'multipart/form-data');

        // search the file on S3
        const s3File = await fileStorageManager.minioClient.getObject(
            bucketName,
            response.body.imageUrl
        );
    });
});
