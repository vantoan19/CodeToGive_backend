const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const userSchema = new mongoose.Schema({
    account: {
        type: String,
        required: true,
        unique: true,
        minlength: 6,
        trim: true
    },
    accountType: {
        type: String,
        default: "student"
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Invalid email');
            }
        }
    },
    classes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    }],
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    dateOfBirth: Date,
    phoneNumber: {
        type: String,
        validate(value) {
            if (!validator.isMobilePhone(value, 'any')) {
                throw new Error("Invalid phone number");
            }
        }
    },
    address: String,
    avatar: Buffer,
    coverPhoto: Buffer,
    profileDescription: {
        type: String,
        trim: true,
        default: "Hello world! :D"
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        trim: true,
        validate(value) {
            if(!validator.isStrongPassword(value)) {
                throw new Error("Weak password");
            }
        }
    },
    stars: {
        type: Number,
        default: 0
    },
    goldenCrown: {
        type: Number,
        default: 0
    },
    silverCrown: {
        type: Number,
        default: 0
    },
    bronzeCrown: {
        type: Number,
        default: 0
    },
    takenQuizzes: [{
        quiz: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'quizzes.quizType'
        },
        quizType: {
            type: String,
            required: true,
            enum: ['PicQuizz', 'Quiz', 'Scribbly']
        },
        takeAt: Date,
        score: {
            type: Number,
            default: 0
        }
    }],
    badges: [String],
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
});


userSchema.methods.toJSON = function() {
    const user = this;
    const userObject = user.toObject();

    if (userObject.avatar)
        userObject.avatarURL = process.env.DOMAIN + "api/users/" + user.account + "/avatar";
    if (userObject.coverPhoto)
        userObject.coverPhotoURL = process.env.DOMAIN + "api/users/" + user.account + "/coverPhoto";
    delete userObject.password;
    delete userObject.tokens;
    delete userObject.avatar;
    delete userObject.coverPhoto;

    return userObject;
}


userSchema.methods.generateAuthToken = async function() {
    const user = this
    const token = jwt.sign({
        _id: user._id.toString()
    }, process.env.JWT_SECRET);

    user.tokens = user.tokens.concat({ token });
    await user.save();

    return token;
}

userSchema.statics.findByCredentials = async function(account, password) {
    const user = await User.findOne( { account } );

    if (!user) throw new Error("User doesn't exist!");

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) throw new Error("Wrong password!");

    return user;
}

//Hash the password before saving
userSchema.pre('save', async function (next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }

    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;