const User = require('../Models/userModel.js');
const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser');
const {promisify} = require('util');
const crypto = require('crypto');
const sendEmail = require('../utils/email.js');


require('dotenv').config();
 

const signToken = function(id){
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
};
exports.myAccount = async function(req, res, next){
    console.log("Received cookies:", req.cookies); 

    res.status(200).json({
        status: "success",
    })
};
exports.logout = async function(req, res, next){
    res.cookie("user-jwt", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        expires: new Date(0),
    });
    res.status(200).json({ message: "Logged out successfully" });
};
exports.getUser = function(req, res, next){
    try{
        const user = req.user;
        if(user == null) throw new Error("User not found");
        
        res.status(200).json({
            status: 'success',
            data:{
                user
            }
        })
    }catch(err){
        res.status(500).json({
            status: 'error',
            message: err.message || 'Something went wrong!',
        })
    }
};
exports.signup = async function(req, res, next){ 
    try {
        const newUser = await User.create({
        username: req.body.name,
        email: req.body.email,
        password: req.body.password,
        });
        const token = signToken(newUser._id);
        const cookieOptions = {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            partitioned: true,
        };
        
        res.cookie('user-jwt', token, cookieOptions);
        
        res.status(200).json({
            status: 'success',
            // token,
            data:{
                newUser,
            }
        })
    }catch (error) {
        if (error.code === 11000) {
          return res.status(400).json({
            status: "fail",
            message: "Email already exists. Please use a different email.",
          });
        }
        res.status(500).json({
          status: "error",
          message: error.message || "Something went wrong!",
        });
      }
}
exports.login = async function(req, res, next){
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.correctPassword(password, user.password))) {
            throw new Error("Enter valid email and password");
        }

        const id = user.id;
        const token = jwt.sign({ id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN,
        });

        const cookieOptions = {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            partitioned: true,
        };
        
        res.cookie('user-jwt', token, cookieOptions);
        // console.log(token);
        
        
        

        res.status(200).json({
            status: 'login successful',
            data: {
                user,
                // token
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Something went wrong!',
        });
    }
};
exports.protect = async (req, res, next) => {
    console.log("protect enter");
    // console.log(req.cookies); 
    try{
        let token; 
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies['user-jwt']) {
            token = req.cookies['user-jwt'];
        }
        // console.log(req);
        // console.log(req.cookies); 
        
        if (!token) {
            
            throw new Error("You are not logged in! Please login to access this route.");
        }
        console.log("here");  
        
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        
        const currentUser = await User.findById(decoded.id).select("+password");
        if (!currentUser) {
            throw new Error("User no longer exists!");
        }
        
        if (await currentUser.changedPasswordAfter(decoded.iat)) {
            throw new Error("User recently changed password! Please login again.");
        }
            
            req.user = currentUser;
            console.log("protect exit");
        next();
    }catch(err){
        res.status(401).json({
            status: 'fail',
            message: err.message || 'Something went wrong!',
        })
    }
};
exports.forgot = async(req, res, next) =>{
    const user =await User.findOne({email: req.body.email});
    if(user == null)return res.status(400).json({status: 'please enter valid email address'})
        // console.log(req.user.email);
    const resetToken = user.createPasswordResetToken();
    await user.save({validateBeforeSave : false});
    console.log(resetToken);
    // console.log(user);
    const resetURL = `http://127.0.0.1:8000/api/user/myAccount/resetPassword/${resetToken}`;
    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIF you didn't forget your password, please ignore this email`;

    try{
        await sendEmail({
            email: user.email,
            subject: "Password Reset",
            message,
        })
        res.status(400).json({
            status: 'success'
        })
    }
    catch(err){
        user.passwordResetToken=undefined;
        user.passwordResetExpires = undefined;
        console.log(err);
        res.status(400).json({
            status:"Can't send the email to your email"
        })
    }

    
};
exports.reset = async(req, res, next) =>{

    const hashedToken = crypto.createHash('sha256')
            .update(req.params.token)
            .digest('hex');
    const user = await User.findOne({passwordResetToken: hashedToken});
    if(user == null)return res.status(404).json({status: 'Link expired'});

    if (req.body.password !== req.body.passwordConfirm) {
        return res.status(400).json({ status: 'Passwords do not match' });
    }
    
    if (user) {
        user.password = req.body.password;
        user.passwordConfirm = req.body.passwordConfirm;
        user.passwordResetToken = undefined;
        user.passwordResetExpires= undefined;
        await user.save();
        const token = signToken(user._id);
        const options = {
            expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) * 24 * 60 * 60 * 1000)), // Ensure it's a valid number
            httpOnly: true,
        }
        
        res.cookie('user-jwt', token, options); 
    }


    res.status(200).json({ 
        status: 'success' 
    })
};
exports.resetManually = async (req, res, next) => {
    console.log("here");
    try {
        const user = req.user;
        if (!user) {
            throw new Error("User no longer exists!");
        }
       
        console.log(user);
        console.log(user.password); 
        const isMatch = await user.correctPassword(req.body.currentPassword, user.password);
        if (!isMatch) throw new Error("Enter a correct existing password");
        console.log(user.password);
        user.password = req.body.newPassword;  
        await user.save(); 
        console.log(user.password);

        res.status(200).json({
            status: 'success',
            message: 'Password reset successfully!', 
        });
    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: err.message || 'Something went wrong!',
        });
    }
};
exports.updatePassword = async(req, res, next) =>{

    if(req.newPassword != req.passwordConfirm) return res.status(400).json({status: 'passwords do not match'});

    const user = req.user;
    
    user.password = req.body.newPassword;
    await user.save();
    const token = signToken(user._id);
    const options = {
        expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) * 24 * 60 * 60 * 1000)), // Ensure it's a valid number
        httpOnly: true,
    }
    res.cookie('user-jwt', token, options);
    res.status(200).json({
        status: 'success',
    })
}
exports.leaderBoardGlobal = async (req, res, next) => {
    console.log("here");
    
    const users = await User.find().sort({ total: -1 });

    
    const top3 = users.slice(0, 4);

    
    let userPosition = -1;
    users.forEach((el, i) => {
        if (el._id.toString() === req.user._id.toString()) {
            userPosition = i + 1;
        }
    });

    res.status(200).json({
        status: 'Success',
        data: {
            board: top3,
            myPosition: userPosition,
        }
    });
};
exports.leaderBoardSquats = async (req, res, next) => {
    const users = await User.find().sort({ squats: -1 });

    const top3 = users.slice(0, 4);

    let userPosition = -1;
    users.forEach((el, i) => {
        if (el._id.toString() === req.user._id.toString()) {
            userPosition = i + 1;
        }
    });

    res.status(200).json({
        status: 'Success',
        data: {
            board: top3,
            myPosition: userPosition,
        }
    });
};
exports.leaderBoardCurls = async (req, res, next) => {
    const users = await User.find().sort({ curls: -1 });

    const top3 = users.slice(0, 4);

    let userPosition = -1;
    users.forEach((el, i) => {
        if (el._id.toString() === req.user._id.toString()) {
            userPosition = i + 1;
        }
    });

    res.status(200).json({
        status: 'Success',
        data: {
            board: top3,
            myPosition: userPosition,
        }
    });
};
exports.leaderBoardPress = async (req, res, next) => {
    const users = await User.find().sort({ pushups: -1 });

    const top3 = users.slice(0, 4);

    let userPosition = -1;
    users.forEach((el, i) => {
        if (el._id.toString() === req.user._id.toString()) {
            userPosition = i + 1;
        }
    });

    res.status(200).json({
        status: 'Success',
        data: {
            board: top3,
            myPosition: userPosition,
        }
    });
};
exports.upload = async (req, res, next) => {
    try {
        const user = req.user;

        user.squats += req.body.squats || 0;
        user.pushups += req.body.press || 0;
        user.curls += req.body.curls || 0;
        user.total += (req.body.squats || 0) + (req.body.press || 0) + (req.body.curls || 0);
 
        await user.save();

        res.status(200).json({
            status: 'Success',
            data: { user },
        });
    } catch (err) {
        res.status(500).json({
            status: 'Fail',
            message: 'Could not update user stats',
            error: err.message,
        }); 
    }
};
