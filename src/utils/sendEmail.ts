import nodemailer from 'nodemailer';

export async function sendEmail(to: string, html: string) {
  // let testAccount = await nodemailer.createTestAccount();
  // console.log("test account", testAccount);

  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: "fb4p5jjplztftlff@ethereal.email",
      pass: 'uNKJtzdRvMk4URSTJs',
    }
  });

  let info = await transporter.sendMail({
    from: '"Fred foo" <foo@example.com>',
    to: to, // list of receivers
    subject: "Change password",
    html
  });

  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

}