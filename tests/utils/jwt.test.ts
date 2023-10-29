import { describe, expect, test } from '@jest/globals';
import { JwtPayload } from 'jsonwebtoken';
import { Authorizer } from 'utils/jwt';

describe('JWT', () => {
    test('test create / verify', async () => {
        const myToken = Authorizer.generateToken({
            id: 'my id',
        });

        expect(
            (Authorizer.verifyToken(myToken) as JwtPayload)['id']
        ).toStrictEqual('my id');
    });
});
