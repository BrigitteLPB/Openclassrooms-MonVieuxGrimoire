import { BookModel } from 'models/book';
import { UserModel } from 'models/user';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';
import { S3FileStorage } from 'utils/managers/file_storage';

export const CreateMiddleware: ExpressMiddleware = {
    method: HTTPMethod.POST,
    uri: '/books',
    useImage: true,
    needAuth: true,
    middelware: [
        // create the book
        async (req, res, next) => {
            const book = JSON.parse(req.body.book);

            if (!book) {
                res.status(400);
                return res.json({
                    error: 'bad values the books.',
                });
            }

            // check user exist
            try {
                const isUserExist = await UserModel.exists({
                    _id: book.userId,
                });

                if (!isUserExist) {
                    res.status(400);
                    return res.json({
                        error: `unknown user ${book.userId}`,
                    });
                }
            } catch (e) {
                console.error('can not read the user table');
                console.error(e);

                res.status(500);
                return res.json({
                    error: 'can not read the user table',
                });
            }

            // check image file
            if (!req.file) {
                res.status(400);
                return res.json({
                    error: `can not parse the image`,
                });
            }

            // check other fields
            for (var k of ['genre', 'title', 'author', 'year']) {
                if (!(k in book)) {
                    res.status(400);
                    return res.json({
                        error: `missing field ${k}`,
                    });
                }
            }

            // create the book
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
                    _id: newBook._id, // pour les relous du front-end
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
        S3FileStorage.processFileMiddleware,
        // update the book image URL
        async (_, res, next) => {
            const s3Manager = new S3FileStorage();
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
                        imageUrl: await s3Manager.getFileURL({
                            bucketName: s3Manager.imageBucketName || 'images',
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
