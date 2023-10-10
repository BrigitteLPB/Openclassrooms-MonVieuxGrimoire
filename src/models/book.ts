import { Schema, model } from 'mongoose';

export class BookSchema extends Schema {
    constructor() {
        super({
            userId: { type: String, unique: true, required: true },
            title: { type: String },
            author: { type: String },
            imageUrl: { type: String },
            year: { type: Number },
            genre: { type: String },
            ratings: {
                type: Array<{
                    userId: String;
                    grade: Number;
                }>,
            },
            averageRating: { type: Number },
        });
    }
}

export const BookModel = model('Book', new BookSchema());
