import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { createReadStream } from 'fs';
import { ImageStorage } from 'utils/managers/image_storage';
import { v4 } from 'uuid';

let imageStorageManager: ImageStorage;
let bucketName = '';

describe('ImageStorage', () => {
    beforeEach(async () => {
        imageStorageManager = new ImageStorage({
            host: process.env.MINIO_HOST || '',
            port: Number(process.env.MINIO_PORT) || 0,
            accessKey: process.env.MINIO_ACCESS_KEY || '',
            secretKey: process.env.MINIO_SECRET_KEY || '',
        });

        bucketName = `test-${v4()}`;

        // add bucket
        await imageStorageManager.initBucketSafe({
            bucketName: bucketName,
        });
    });

    afterEach(async () => {
        // remove bucket
        const objectList = await imageStorageManager.minioClient
            .listObjects(bucketName)
            .toArray();
        await imageStorageManager.minioClient.removeObjects(
            bucketName,
            objectList
        );
        await imageStorageManager.minioClient.removeBucket(bucketName);
    });

    test('Create a bucket', async () => {
        expect(
            await imageStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);
    });

    test('Add file', async () => {
        expect(
            await imageStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);

        await imageStorageManager.addFile({
            bucketName: bucketName,
            serverFilepath: '/data.json',
            localFileStream: createReadStream(
                './tests/utils/managers/data/my_data.json'
            ),
        });

        const file = await imageStorageManager.minioClient.getObject(
            bucketName,
            '/data.json'
        );
        expect(JSON.parse(file.read().toString())).toEqual({
            hello: 'world!',
        });
    });

    test('Get file', async () => {
        expect(
            await imageStorageManager.minioClient.bucketExists(bucketName)
        ).toBe(true);

        await imageStorageManager.addFile({
            bucketName: bucketName,
            serverFilepath: '/data.json',
            localFileStream: createReadStream(
                './tests/utils/managers/data/my_data.json'
            ),
        });

        const file = await imageStorageManager.getFile({
            bucketName: bucketName,
            filename: '/data.json',
        });
        expect(JSON.parse(file.read().toString())).toEqual({
            hello: 'world!',
        });
    });
});
