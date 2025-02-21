const express = require('express');
const userController = require('../controllers/userController.js');
// const accountRouter = require('./accountRouter.js');
const cookieParser = require("cookie-parser");

// const cookieParser = require('cookie-parser');


const router = express.Router();

router.use(cookieParser());

router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.post('/updatePassword', userController.protect, userController.updatePassword);
router.get('/leaderBoard',userController.protect, userController.leaderBoardGlobal);
router.get('/leaderBoardSquats',userController.protect, userController.leaderBoardSquats);
router.get('/leaderBoardCurls',userController.protect, userController.leaderBoardCurls);
router.get('/leaderBoardPress',userController.protect, userController.leaderBoardPress); 
router.get('/leaderBoardGlobal',userController.protect, userController.leaderBoardGlobal); 
router.post('/upload',userController.protect, userController.upload);
router.get('/myaccount',userController.protect, userController.getUser);
router.get('/logout', userController.logout);
router.post('/resetPassword', userController.protect, userController.resetManually);

router.get('/test', userController.myAccount);

module.exports = router;