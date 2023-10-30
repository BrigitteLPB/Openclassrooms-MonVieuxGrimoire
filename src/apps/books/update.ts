import { BookModel } from 'models/book';
import { Types } from 'mongoose';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';
import { S3FileStorage } from 'utils/managers/file_storage';

export const UpdateMiddleware: ExpressMiddleware = {
    method: HTTPMethod.PUT,
    uri: '/books/:bookId',
    useImage: true,
    needAuth: true,
    middelware: [
        // create the book
        async (req, res, next) => {
            const bookId = req.params.bookId;

            if (!bookId || !Types.ObjectId.isValid(bookId)) {
                res.status(400);
                return res.json({
                    error: 'need a valid bookId in the path /books/{id}',
                });
            }

            // parse the request body
            if (req.body.book) {
                req.body = JSON.parse(req.body.book);
            }

            // maps the book object
            const book = {
                ...(req.body.title ? { title: req.body.title } : {}),
                ...(req.body.author ? { author: req.body.author } : {}),
                ...(req.body.genre ? { genre: req.body.genre } : {}),
                ...(req.body.year ? { year: req.body.year } : {}),
            };

            if (!book) {
                res.status(400);
                return res.json({
                    error: 'can not get the new data from the request.',
                });
            }

            // update the book
            try {
                const updatedBook = await BookModel.findOneAndUpdate(
                    {
                        _id: bookId,
                        userId: res.locals.auth.userId,
                    },
                    {
                        ...(book.title ? { title: book.title } : {}),
                        ...(book.author ? { author: book.author } : {}),
                        ...(book.year ? { year: book.year } : {}),
                        ...(book.genre ? { genre: book.genre } : {}),
                    }
                );

                if (!updatedBook) {
                    res.status(404);
                    return res.json({
                        error: `can not find book with id ${bookId}`,
                    });
                }

                res.locals.body = {
                    id: updatedBook._id,
                    _id: updatedBook._id, // pour les relous du front-end
                    userId: updatedBook.userId,
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
                    message: `Book ${res.locals.body.id} successfully updated`,
                };

                return next();
            } catch (e) {
                console.error('can not update the image uri');
                console.error(e);

                res.status(500);
                return res.json({
                    error: 'can not update the image URL',
                });
            }
        },
    ],
};
