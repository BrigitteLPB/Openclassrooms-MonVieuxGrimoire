import { BookModel } from 'models/book';
import { Types } from 'mongoose';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';
import { s3FileStorageManager } from 'utils/managers/file_storage';

export const DeleteMiddleware: ExpressMiddleware = {
    method: HTTPMethod.DELETE,
    uri: '/books/:bookId',
    useImage: true,
    needAuth: true,
    middelware: [
        // get the book
        async (req, res, next) => {
            const bookId = req.params.bookId;

            if (!bookId || !Types.ObjectId.isValid(bookId)) {
                res.statusCode = 400;
                return res.json({
                    error: 'need a valid bookId in the path /books/{id}',
                });
            }

            try {
                const book = await BookModel.findByIdAndDelete(bookId);

                if (!book) {
                    res.statusCode = 404;
                    return res.json({
                        error: `can not find book with id ${bookId}`,
                    });
                }

                await s3FileStorageManager.removeFile({
                    bucketName: s3FileStorageManager.imageBucketName,
                    filename: book.imageUrl,
                });

                res.locals.body = {
                    ...res.locals.body,
                    ...{
                        message: `Book ${bookId} is deleted`,
                    },
                };

                return next();
            } catch (e) {
                console.error('can not get the book');
                console.error(e);

                res.status(500);
                return res.json({
                    error: 'can not get the book',
                });
            }
        },
    ],
};
