import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { createReadStream } from 'fs';
import { get } from 'http';
import { FileStorage } from 'utils/managers/file_storage';
import { v4 } from 'uuid';

let fileStorageManager: FileStorage;
let bucketName = '';

describe('FileStorage', () => {
    beforeEach(async () => {
        fileStorageManager = new FileStorage({
            host: process.env.MINIO_HOST || '',
            port: Number(process.env.MINIO_PORT) || 0,
            accessKey: process.env.MINIO_ACCESS_KEY || '',
            secretKey: process.env.MINIO_SECRET_KEY || '',
        });

        bucketName = `test-${v4()}`;

        // add bucket
        await fileStorageManager.initBucketSafe({
            bucketName: bucketName,
        });
    });

    afterEach(async () => {
        // remove bucket
        const objectList = await fileStorageManager.minioClient
            .listObjects(bucketName)
            .toArray();
        await fileStorageManager.minioClient.removeObjects(
            bucketName,
            objectList
        );
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
            localFileStream: createReadStream(
                './tests/utils/managers/data/my_data.json'
            ),
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
            localFileStream: createReadStream(
                './tests/utils/managers/data/my_data.json'
            ),
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
            localFileStream: createReadStream(
                './tests/utils/managers/data/my_data.json'
            ),
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
});
