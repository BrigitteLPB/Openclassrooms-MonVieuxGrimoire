import { NextFunction, Request, Response } from 'express';
import { Client } from 'minio';
import { Readable as ReadableStream } from 'node:stream';
import sharp from 'sharp';

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
}

export class S3FileStorage implements FileStorage {
    private static _client?: Client;
    private static _imageBucketName?: string;

    public static initClient(args: {
        host: string;
        port: number;
        accessKey: string;
        secretKey: string;
        imageBucketName: string;
    }) {
        const { host, port, accessKey, secretKey, imageBucketName } = args;

        this._client = new Client({
            endPoint: host,
            port: port,
            accessKey: accessKey,
            secretKey: secretKey,
            useSSL: false,
        });
        this._imageBucketName = imageBucketName;
    }

    public get minioClient() {
        if (!S3FileStorage._client) {
            throw Error(
                'Minio client isnt initialize ! Use S3FileStorage.initClient before user'
            );
        }
        return S3FileStorage._client;
    }

    public get imageBucketName() {
        return S3FileStorage._imageBucketName || '';
    }

    /**
     * Initialize safely a bucket
     * @param args
     */
    public static async initBucketSafe(args: { bucketName: string }) {
        const { bucketName } = args;

        if (!(await this._client?.bucketExists(bucketName))) {
            await this._client?.makeBucket(bucketName);
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

    /**
     * Send the image field of a multipart request to the S3
     * Need bookId & userId in the res.locals
     * @param req
     * @param res
     * @param next
     */
    public static async processFileMiddleware(
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

            // optmise image with sharp
            const optimiseFile = await sharp(req.file?.buffer)
                .resize(
                    Number(process.env.SHARP_IMAGE_WIDTH) || 200,
                    Number(process.env.SHARP_IMAGE_HEIGHT || 200)
                )
                .webp()
                .toBuffer();

            // uploading new image to S3
            const serverUri = `/${userId}/${id}.webp`;

            const s3Manager = new S3FileStorage();
            await s3Manager.addFile({
                bucketName: s3Manager.imageBucketName,
                serverFilepath: serverUri,
                localFileStream: ReadableStream.from(optimiseFile),
            });

            res.locals.imageUri = serverUri;
        }

        return next();
    }
}
