import { Client } from 'minio';
import type { Readable as ReadableStream } from 'node:stream';

export class FileStorage {
    readonly minioClient: Client;

    public constructor(args: {
        host: string;
        port: number;
        accessKey: string;
        secretKey: string;
    }) {
        const { host, port, accessKey, secretKey } = args;

        this.minioClient = new Client({
            endPoint: host,
            port: port,
            accessKey: accessKey,
            secretKey: secretKey,
            useSSL: false,
        });
    }

    /**
     * Initialize safely a bucket
     * @param args
     */
    public async initBucketSafe(args: { bucketName: string }) {
        const { bucketName } = args;

        if (!(await this.minioClient.bucketExists(bucketName))) {
            await this.minioClient.makeBucket(bucketName);
        }
    }

    /**
     * add a file to the specified bucket
     * @param args
     */
    public async addFile(args: {
        bucketName: string;
        serverFilepath: string;
        localFileStream: ReadableStream;
    }) {
        const { bucketName, serverFilepath, localFileStream } = args;

        await this.minioClient.putObject(
            bucketName,
            serverFilepath,
            localFileStream
        );
    }

    /**
     * return an object in the storage
     * @param args
     */
    public async getFile(args: { bucketName: string; filename: string }) {
        const { bucketName, filename } = args;

        return await this.minioClient.getObject(bucketName, filename);
    }

    /**
     * return a presignedURL for 1h to get the desired file
     * @param args
     * @returns
     */
    public async getFileURL(args: { bucketName: string; filename: string }) {
        const { bucketName, filename } = args;

        return await this.minioClient.presignedUrl(
            'GET',
            bucketName,
            filename,
            3600 // 1h
        );
    }
}
