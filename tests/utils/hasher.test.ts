import { describe, expect, test } from '@jest/globals';
import { Hasher } from 'utils/hasher';

describe('Hasher', () => {
    test('test hash / unhash', async () => {
        const my_string = 'hello world !';

        const my_hashed_string = await Hasher.getHash(my_string);

        expect(my_hashed_string).not.toEqual(my_string);

        expect(await Hasher.validateHash(my_string, my_hashed_string)).toBe(
            true
        );
        expect(await Hasher.validateHash('', my_hashed_string)).toBe(false);
        expect(await Hasher.validateHash(my_string, '')).toBe(false);
    });
});
