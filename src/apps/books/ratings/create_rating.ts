import { BookModel } from 'models/book';
import { UserModel } from 'models/user';
import { Types } from 'mongoose';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';

export const CreateRatingMiddleware: ExpressMiddleware = {
    method: HTTPMethod.POST,
    uri: '/books/:bookId/rating',
    needAuth: true,
    middelware: [
        // create the book
        async (req, res, next) => {
            const bookId = req.params.bookId;

            // check bookId param
            if (!bookId || !Types.ObjectId.isValid(bookId)) {
                res.status(400);
                return res.json({
                    error: 'need a valid bookId in the path /books/{id}/rating',
                });
            }

            const { userId, rating } = req.body;

            // check userId field
            if (!userId || !Types.ObjectId.isValid(userId)) {
                res.status(400);
                return res.json({
                    error: 'need a valid userId in the body',
                });
            }

            // check rating field
            if (!rating || rating < 0 || rating > 5) {
                res.status(400);
                return res.json({
                    error: 'rating must be in from 0 to 5.',
                });
            }

            // check user exist
            try {
                const isUserExist = await UserModel.exists({
                    _id: userId,
                });

                if (!isUserExist) {
                    res.status(500);
                    return res.json({
                        error: `can not get user ${userId}`,
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

            // add or update the current userId
            // then update the averageRating field
            try {
                const updatedBook = await BookModel.findByIdAndUpdate(
                    {
                        _id: bookId,
                        'ratings.userId': userId,
                    },
                    [
                        {
                            $addFields: {
                                ratings: {
                                    $let: {
                                        vars: {
                                            x: {
                                                $size: {
                                                    $filter: {
                                                        input: '$ratings',
                                                        as: 'r',
                                                        cond: {
                                                            $eq: [
                                                                '$$r.userId',
                                                                userId,
                                                            ],
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        in: {
                                            $cond: [
                                                { $ne: ['$$x', 0] },
                                                {
                                                    $map: {
                                                        input: '$ratings',
                                                        in: {
                                                            $mergeObjects: [
                                                                '$$this',
                                                                {
                                                                    $cond: [
                                                                        {
                                                                            $eq: [
                                                                                '$$this.userId',
                                                                                userId,
                                                                            ],
                                                                        },
                                                                        {
                                                                            rating: rating,
                                                                        },
                                                                        {},
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                    },
                                                },
                                                {
                                                    $concatArrays: [
                                                        '$ratings',
                                                        [
                                                            {
                                                                userId: userId,
                                                                rating: rating,
                                                            },
                                                        ],
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                        {
                            $set: {
                                averageRating: {
                                    $avg: '$ratings.rating',
                                },
                            },
                        },
                    ],
                    {
                        multi: true,
                    }
                );

                // can find the book to update
                if (!updatedBook) {
                    res.status(404);
                    return res.json({
                        error: `can not find book with id ${bookId}`,
                    });
                }

                // send success message
                res.locals.body = {
                    message: 'rating successfully added',
                };

                return next();
            } catch (e) {
                console.error('can not update the book');
                console.error(e);

                res.status(500);
                return res.json({
                    error: 'can not update the book',
                });
            }
        },
    ],
};
