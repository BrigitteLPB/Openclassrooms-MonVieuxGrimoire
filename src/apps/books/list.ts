import { BookModel } from 'models/book';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';
import { S3FileStorage } from 'utils/managers/file_storage';

export const ListMiddleware: ExpressMiddleware = {
    method: HTTPMethod.GET,
    uri: '/books',
    middelware: [
        // get the book
        async (req, res, next) => {
            const s3Manager = new S3FileStorage();
            try {
                const allBook = await BookModel.find();

                if (!allBook) {
                    res.status(500);
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
