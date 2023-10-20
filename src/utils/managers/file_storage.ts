import { NextFunction, Request, Response } from 'express';
import { Client } from 'minio';
import { Readable as ReadableStream } from 'node:stream';

export interface FileStorage {
    /**
     * add a file to the specified bucket
     * @param args
     */
    addFile: (args: {
        bucketName: string;
        serverFilepath: string;
        localFileStream: ReadableStream;
    }) => Promise<void>;

    /**
     * return an object in the storage
     * @param args
     */
    getFile: (args: {
        bucketName: string;
        filename: string;
    }) => Promise<ReadableStream>;

    /**
     * return a presignedURL for 1h to get the desired file
     * @param args
     * @returns
     */
    getFileURL: (args: {
        bucketName: string;
        filename: string;
    }) => Promise<string>;

    /**
     * remove a file in the storage
     * @param args
     */
    removeFile: (args: {
        bucketName: string;
        filename: string;
    }) => Promise<void>;

    /**
     * Send the image field of a multipart request to the S3
     * Need bookId & userId in the res.locals
     * @param req
     * @param res
     * @param next
     */
    processFileMiddleware: (
        req: Request,
        res: Response,
        next: NextFunction
    ) => Promise<void | Response<any, Record<string, any>>>;
}

export class S3FileStorage implements FileStorage {
    readonly minioClient: Client;
    readonly imageBucketName: string;

    public constructor(args: {
        host: string;
        port: number;
        accessKey: string;
        secretKey: string;
        imageBucketName: string;
    }) {
        const { host, port, accessKey, secretKey, imageBucketName } = args;

        this.imageBucketName = imageBucketName;

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

    public async getFile(args: { bucketName: string; filename: string }) {
        const { bucketName, filename } = args;

        return await this.minioClient.getObject(bucketName, filename);
    }

    public async getFileURL(args: { bucketName: string; filename: string }) {
        const { bucketName, filename } = args;

        return await this.minioClient.presignedUrl(
            'GET',
            bucketName,
            filename,
            3600 // 1h
        );
    }

    public async removeFile(args: { bucketName: string; filename: string }) {
        const { bucketName, filename } = args;

        return await this.minioClient.removeObject(bucketName, filename);
    }

    public async processFileMiddleware(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        if (
            req.file?.fieldname == 'image' &&
            (req.file?.mimetype == 'image/png' ||
                req.file?.mimetype == 'image/jpeg')
        ) {
            const { id, userId } = res.locals.body;

            if (!id || !userId) {
                res.status(500);
                return res.json({
                    error: 'can not upload your image',
                });
            }

            const serverUri = `/${userId}/${id}.${req.file?.mimetype.split(
                '/'
            )[1]}`;

            await this.addFile({
                bucketName: this.imageBucketName,
                serverFilepath: serverUri,
                localFileStream: ReadableStream.from(req.file?.buffer),
            });

            res.locals.imageUri = serverUri;
        }

        return next();
    }
}

export const s3FileStorageManager = new S3FileStorage({
    host: process.env.MINIO_HOST || '',
    port: Number(process.env.MINIO_PORT) || 0,
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
    imageBucketName: 'images',
});

s3FileStorageManager.initBucketSafe({
    bucketName: 'images',
});
