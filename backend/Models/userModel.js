const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// const { reset } = require('../controllers/userController.js');

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:[true, 'Enter the name of user'],
        trim:true,
        maxLength:[10,'Name is too long']
    },
    email:{
        type:String,
        required:[true, 'Enter the email'],
        unique: [true, 'account already exists'],
        lowercase: true,
        validator:[validator.isEmail, 'Enter correct email']
    },
    password:{
        type:String,
        required: [true, 'Enter the password'],
        minlength: 8,
        select: false,
    },
    // passwordConfirm:{
    //     type:String,
    //     required:[true, 'Enter confirm password'],
    //     validate:{
    //         validator:function(val){
    //             return this.password === val;
    //         },
    //         message: 'Confirmed password is different from password'
    //     },
    // },
    createdAt:{
        type:Date,
        default: Date.now,
        select: false,
    },
    passwordChangedAt:Date,
    passwordResetToken:String,
    passwordResetExpires: Date,
    active:{
        type:Boolean,
        default: true,
        select: false
    },
    verified: {
        type: Boolean,
        default: false,
    },
    pushups:{
        type: Number,
        default: 0
    },
    curls:{
        type: Number,
        default: 0,
    },
    squats:{
        type: Number,
        default: 0,
    },
    total: {
        type: Number,
        default: function () {
            return this.squats + this.pushups + this.curls;
        }
    }
    
},
{
    toJSON:{virtuals: true},
    toObject: {virtuals:true}                
}
);


 

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next;
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    this.passwordChangedAt = Date.now();
    next();
})
userSchema.pre(/^find/, function(next){
    this.find({active: true});

    next();
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword);
}
userSchema.methods.changedPasswordAfter = function(JWTdate){
    if(this.passwordChangedAt){
        const lastDate = parseInt((this.passwordChangedAt.getTime() / 1000), 10);
        // console.log(lastDate +  " " + JWTdate);
        if(lastDate > JWTdate) return true;
    }
    return false;
}
userSchema.methods.createPasswordResetToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex');


    this.passwordResetToken = 
        crypto.createHash('sha256')
        .update(resetToken)
        .digest('hex');
    // console.log({resetToken},this.passwordResetToken);
    this.passwordResetExpires = Date.now() + 10*60*1000;
    return  resetToken;
}

const User = mongoose.model("User", userSchema);
module.exports =  User;