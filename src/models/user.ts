import { Schema, model } from "mongoose"

export class UserSchema extends Schema {
	constructor(){
		super({
			email: {type: String, unique: true, required: true},
			password: {type: String, required: true},
		})
	}
}

export const UserModel = model("User", new UserSchema())
