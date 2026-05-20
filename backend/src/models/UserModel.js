import mongoose from "mongoose"

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trime: true,
        maxLenght: 254
    },
    password: {
        type: String,
        required: true,
        unique: true,
        trime: true,
        minLenght: 6,
        maxLenght: 30
    },
    username: {
        type: String,
        required: true,
        default: "",
        trime: true,
        minLenght: 3,
        maxLenght: 20
    },
    isAdmin: {
        type: Boolean,
        default: false,
        required:true
    }
})

export default mongoose.model("User", UserSchema)