import { BookModel } from 'models/book';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';
import { S3FileStorage } from 'utils/managers/file_storage';

export const ListBestRatingRatingMiddleware: ExpressMiddleware = {
    method: HTTPMethod.GET,
    uri: '/books/bestrating',
    middelware: [
        // get the book list
        async (req, res, next) => {
            const s3Manager = new S3FileStorage();
            try {
                const allBook = await BookModel.find()
                    .sort({
                        averageRating: -1,
                    })
                    .limit(3);

                if (!allBook) {
                    res.status(404);
                    return res.json({
                        error: 'can not list all the books',
                    });
                }

                // mapping MongoDB / Front-end
                res.locals.body = await Promise.all(
                    allBook.map(async (book) => ({
                        id: book._id,
                        userId: book.userId,
                        title: book.title,
                        author: book.author,
                        imageUrl: await s3Manager.getFileURL({
                            bucketName: s3Manager.imageBucketName,
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
                console.error('can not list the books');
                console.error(e);

                res.status(500);
                return res.json({
                    error: 'can not list the books',
                });
            }
        },
    ],
};
