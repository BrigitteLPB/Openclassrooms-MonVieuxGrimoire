import { BookModel } from 'models/book';
import { Types } from 'mongoose';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';
import { s3FileStorageManager } from 'utils/managers/file_storage';

export const RetrieveMiddleware: ExpressMiddleware = {
    method: HTTPMethod.GET,
    uri: '/books/:bookId',
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
                const book = await BookModel.findById(bookId);

                if (!book) {
                    res.statusCode = 404;
                    return res.json({
                        error: `can not find book with id ${bookId}`,
                    });
                }

                res.locals.body = {
                    ...res.locals.body,
                    ...{
                        id: book._id,
                        _id: book._id, // pour les relous du front-end
                        userId: book.userId,
                        title: book.title,
                        author: book.author,
                        imageUrl: await s3FileStorageManager.getFileURL({
                            bucketName: s3FileStorageManager.imageBucketName,
                            filename: book.imageUrl,
                        }),
                        year: book.year,
                        genre: book.genre,
                        ratings: book.ratings,
                        averageRating: book.averageRating,
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
