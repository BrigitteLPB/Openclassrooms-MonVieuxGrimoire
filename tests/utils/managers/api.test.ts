import { beforeEach, describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';
import request from 'supertest';
import { Authorizer } from 'utils/jwt';
import { ApiManager, HTTPMethod } from 'utils/managers/api';

let api_manager: ApiManager;

describe('Api Manager', () => {
    beforeEach(() => {
        api_manager = new ApiManager({
            corsConfig: {
                origin: ['http://localhost'],
            },
        });
    });

    test('base middleware', async () => {
        api_manager.addMiddlewares([
            {
                method: HTTPMethod.GET,
                uri: '*',
                middelware: (req, res, next) => {
                    res.locals.body = req.body;
                    return next();
                },
            },
        ]);

        const response = await request(api_manager.app)
            .get('/')
            .send({
                myField: 'my value',
            })
            .set('Origin', 'http://localhost');

        expect(response.status).toBe(200);

        expect(response.body).toStrictEqual({
            myField: 'my value',
        });

        expect(response.headers['access-control-allow-origin']).toBe(
            'http://localhost'
        );
    });

    test('undefined ressource', async () => {
        api_manager.addMiddlewares([
            {
                method: HTTPMethod.GET,
                uri: '*',
                middelware: (req, res, next) => {
                    res.locals.body = req.body;
                    return next();
                },
            },
        ]);

        const response = await request(api_manager.app)
            .post('/')
            .set('Origin', 'http://localhost');

        expect(response.status).toBe(404);
        expect(response.headers['access-control-allow-origin']).toBe(
            'http://localhost'
        );
    });

    test('auth ressource', async () => {
        api_manager.addMiddlewares([
            {
                method: HTTPMethod.GET,
                uri: '*',
                needAuth: true,
                middelware: (req, res, next) => {
                    res.locals.body = req.body;
                    return next();
                },
            },
        ]);

        // no auth
        const response = await request(api_manager.app)
            .get('/')
            .set('Origin', 'http://localhost');

        expect(response.status).toBe(401);
        expect(response.headers['access-control-allow-origin']).toBe(
            'http://localhost'
        );

        // auth
        const response_auth = await request(api_manager.app)
            .get('/')
            .set(
                'Authorization',
                `Bearer ${Authorizer.generateToken({ id: 'my id' })}`
            )
            .set('Origin', 'http://localhost');

        expect(response_auth.status).toBe(200);
        expect(response_auth.headers['access-control-allow-origin']).toBe(
            'http://localhost'
        );
    });

    test('multer ressource', async () => {
        api_manager.addMiddlewares([
            {
                method: HTTPMethod.POST,
                uri: '*',
                useImage: true,
                middelware: (req, res, next) => {
                    res.locals.body = {
                        myObject: req.body.myObject,
                        myImage: req.file,
                    };
                    return next();
                },
            },
        ]);

        const response = await request(api_manager.app)
            .post('/')
            .field(
                'myObject',
                JSON.stringify({
                    myField: 'my value',
                })
            )
            .attach('image', './tests/utils/managers/data/image.png')
            .set('Origin', 'http://localhost');

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe(
            'http://localhost'
        );

        expect(JSON.parse(response.body.myObject)).toStrictEqual({
            myField: 'my value',
        });

        // get the local file
        const file = await readFile('./tests/utils/managers/data/image.png');
        expect(response.body.myImage.buffer.data).toStrictEqual(
            file.toJSON().data
        );
    });
});
