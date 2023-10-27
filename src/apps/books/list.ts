import { BookModel } from 'models/book';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';
import { s3FileStorageManager } from 'utils/managers/file_storage';

export const ListMiddleware: ExpressMiddleware = {
    method: HTTPMethod.GET,
    uri: '/books',
    middelware: [
        // get the book
        async (req, res, next) => {
            try {
                const allBook = await BookModel.find();

                if (!allBook) {
                    res.statusCode = 500;
                    return res.json({
                        error: `can not list all the book`,
                    });
                }

                res.locals.body = await Promise.all(
                    allBook.map(async (book) => ({
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
                    }))
                );

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
