const nodemailer = require('nodemailer');

async function sendEmail(options){
//  1. create a transporter for email
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth:{
            user: 'kittysmm0@gmail.com',
            pass: 'obgc ijod svti xpia'
        }
    });
    let emailOptions = {
        from: 'your-email@gmail.com',
        to: options.email,
        subject: options.subject,
        text: options.message
    }
    await transporter.sendMail(emailOptions);
}
module.exports = sendEmail;