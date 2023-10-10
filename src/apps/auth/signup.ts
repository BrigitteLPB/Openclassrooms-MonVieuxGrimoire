import { Request, Response } from 'express';
import { UserModel } from 'models/user';
import { Hasher } from 'utils/hasher';
import { ExpressMiddleware, HTTPMethod } from 'utils/managers/api';

export const SignupMiddleware: ExpressMiddleware = {
    method: HTTPMethod.POST,
    uri: '/auth/signup',
    middelware: async (req: Request, res: Response) => {
        const { email, password } = req.body;

        if (!email || !password) {
            res.statusCode = 400;
            res.json({
                error: 'bad values for email or password. Expects not null strings.',
            });
        }

        try {
            await UserModel.create({
                email: email,
                password: await Hasher.getHash(password),
            });

            res.json({
                message: 'user created succesfully.',
            });
        } catch (e: any) {
            console.log('Error:', e);
            res.status(500);
            res.json({
                error: 'can not create the user',
            });
        }
    },
};
