require('dotenv').config();
// const fs = require('fs')
// const cert = fs.readFileSync('cert.pem')
// const key  = fs.readFileSync('key.pem')
const express = require('express')
const mongoose = require('mongoose')
// const https = require('https')
const ejs = require('ejs')
const exphbs = require('express-handlebars')
const bodyParser = require('body-parser')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const session = require('express-session');
const findOrCreate = require('mongoose-findorcreate')
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const FacebookStrategy = require('passport-facebook').Strategy
const stripe = require('stripe')(process.env.SECRET_KEY);
const YOUR_DOMAIN = "https://localhost:3000"

const app = express();
// const server = https.createServer({key:key, cert:cert}, app)
app.set('view engine','ejs')
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static('public'))

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  }))
  app.use(passport.initialize());
  app.use(passport.session());

  mongoose.connect('mongodb://localhost:27017/nemesisDB')

 

  const userSchema = new mongoose.Schema({
      email:String,
      password:String,
      googleId:String,
      facebookId:String
  })


  userSchema.plugin(passportLocalMongoose);
  userSchema.plugin(findOrCreate)

  const User = new mongoose.model('User',userSchema)

  passport.use(User.createStrategy());
  passport.serializeUser(function(user, done) {
    done(null, user);
  });
   
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });
  passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/nemesis",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/nemesis"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/',(req,res)=>{
   res.render('home.ejs')
})

app.get('/nemesis',(req,res)=>{
  if(req.isAuthenticated){
      res.render('nemesis')
  }else{
      res.redirect('/')
  }
})


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/nemesis', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/nemesis');
  });

  app.get('/auth/facebook',
  passport.authenticate('facebook'));

  app.get('/auth/facebook/nemesis',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/nemesis');
  });




app.get('/login',(req,res)=>{
    res.render('login')
})

app.get('/register',(req,res)=>{
    res.render('register')
})

app.get('/logout',(req,res)=>{
    req.logOut();
    res.redirect('/')
})




app.post('/register',(req,res)=>{
    User.register({username:req.body.username},req.body.password,(err,foundUsers)=>{
        if(err){
           console.log(err)
            res.redirect('/register')
        }else{
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/nemesis')
            })
        }
    })
})

app.post("/login", passport.authenticate("local"), function(req, res){
    res.redirect("/nemesis");
});


const userPhoneSchema = new mongoose.Schema({
    phone:String
})

const Phone = new mongoose.model('Phone',userPhoneSchema)

app.post('/',(req,res)=>{
    const newPhone = new Phone({
        phone:req.body.phone
    })
    newPhone.save();
    res.redirect('/')
})

app.post('/payment',async (req,res)=>{
  const amount = 1000;
  stripe.customers.create({
    email:req.body.stripeEmail,
    source:req.body.stripeToken
  })
  .then(customer=>{
    stripe.charges.create({
      customer: customer.id,
      description: 'Small Bedroom',
      amount: amount,
      currency: 'inr',
    })
    .then(charge=>{
      res.render('success')
    })
  })
 })





const port  = process.env.PORT || 3000

app.listen(port, ()=>{
    console.log(`server is running on port ${port}`);
})

