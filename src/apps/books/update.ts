import { BookModel } from 'models/book';
import { Types } from 'mongoose';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';
import { s3FileStorageManager } from 'utils/managers/file_storage';

export const UpdateMiddleware: ExpressMiddleware = {
    method: HTTPMethod.PUT,
    uri: '/books/:bookId',
    useImage: true,
    middelware: [
        // create the book
        async (req, res, next) => {
            const bookId = req.params.bookId;

            if (!bookId || !Types.ObjectId.isValid(bookId)) {
                res.statusCode = 400;
                return res.json({
                    error: 'need a valid bookId in the path /books/{id}',
                });
            }

            const book = JSON.parse(req.body.book);
            if (!book) {
                res.statusCode = 400;
                return res.json({
                    error: 'can not get the new data from the request.',
                });
            }

            try {
                const updatedBook = await BookModel.findOneAndUpdate(
                    {
                        _id: bookId,
                    },
                    {
                        ...(book.title
                            ? {
                                  title: book.title,
                              }
                            : {}),
                        ...(book.author
                            ? {
                                  author: book.author,
                              }
                            : {}),
                        ...(book.year
                            ? {
                                  year: book.year,
                              }
                            : {}),
                        ...(book.genre
                            ? {
                                  genre: book.genre,
                              }
                            : {}),
                    }
                );

                if (!updatedBook) {
                    res.statusCode = 404;
                    return res.json({
                        error: `can not find book with id ${bookId}`,
                    });
                }

                res.locals.body = {
                    id: updatedBook._id,
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
                    message: `Book ${res.locals.body.id} successfully updated`,
                };

                return next();
            } catch (e) {
                console.error('can not update the image uri');
                console.error(e);

                return res.json({
                    error: 'can not update the image URL',
                });
            }
        },
    ],
};
