import { BookModel } from 'models/book';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';
import { s3FileStorageManager } from 'utils/managers/file_storage';

export const CreateMiddleware: ExpressMiddleware = {
    method: HTTPMethod.POST,
    uri: '/books',
    useImage: true,
    middelware: [
        // create the book
        async (req, res, next) => {
            const book = JSON.parse(req.body.book);

            if (!book) {
                res.statusCode = 400;
                return res.json({
                    error: 'bad values the books.',
                });
            }

            try {
                const newBook = await BookModel.create({
                    userId: book.userId, // TODO add userId check
                    title: book.title,
                    author: book.author,
                    imageUrl: '',
                    year: book.year,
                    genre: book.genre,
                    ratings: [],
                    averageRating: 0,
                });

                res.locals.body = {
                    id: newBook._id,
                    userId: newBook.userId,
                    title: newBook.title,
                    author: newBook.author,
                    year: newBook.year,
                    genre: newBook.genre,
                    ratings: newBook.ratings,
                    averageRating: newBook.averageRating,
                };

                return next();
            } catch (e) {
                console.error('can not create the book');
                console.error(e);

                res.status(500);
                return res.json({
                    error: 'can not create the book',
                });
            }
        },
        // add the image in the S3
        s3FileStorageManager.processFileMiddleware.bind(s3FileStorageManager),
        // update the book image URL
        async (_, res, next) => {
            try {
                await BookModel.updateOne(
                    {
                        _id: res.locals.body.id,
                    },
                    {
                        imageUrl: res.locals.imageUri,
                    }
                );

                res.locals.body = {
                    ...res.locals.body,
                    ...{
                        imageUrl: await s3FileStorageManager.getFileURL({
                            bucketName: s3FileStorageManager.imageBucketName,
                            filename: res.locals.imageUri,
                        }),
                    },
                };

                return next();
            } catch (e) {
                console.error('can not set the image uri');
                console.error(e);

                return res.json({
                    error: 'can not get the image URL',
                });
            }
        },
    ],
};
