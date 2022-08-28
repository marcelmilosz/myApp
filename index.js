const express = require('express');
const app = express();

const path = require('path');
const url = require('url');

const mongoose = require('mongoose');

const Post = require('./models/post.js');

const session = require('express-session');
const cookieParser = require("cookie-parser");
const MongoStore = require('connect-mongo')(session);

const User = require('./models/user.js');

const bcrypt = require('bcrypt');


mongoose.connect('mongodb://localhost:27017/app', { useNewUrlParser: true })
    .then(() => {
        console.log("Connected to Mongo")
    })
    .catch((e) => {
        console.log("Problem with connecting to Mongo!")
    })

// Tworzenie sessions (tworzy collection w mongo <3)
// Ten gość to pokazywał: https://www.youtube.com/watch?v=J1qXK66k1y4&ab_channel=ZachGollwitzer
const connection = mongoose.connection;
const sessionStore = new MongoStore({
    mongooseConnection: connection,
    collection: 'sessions'
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true })) // for form data
app.use(express.static(__dirname + '/public')); // For public - css 
app.use(cookieParser("This is some secret bruh"));

// This is your session variable!
var sesh;

app.use(session({
    secret: "thisshouldbesomefuckinghardtoguess",
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: 60 * 60 * 24 * 1000 * 30 // cookie for 30 days 
    }
}));

// This function is used everytime u switch page
app.use(function (req, res, next) {
    sesh = req.session;
    res.locals.userId = req.session.userId;
    // console.log(req.session.userId);
    // console.log(req.session);
    // console.log(sesh);
    next();
});

// Req to request czyli informacja o przychodzącej informacji ze ktoś pojawił się na stronie
// Res to response czyli nasza odpowiedz w postaci np. HTML 
// Wazna jest kolejność!


app.get('/', (req, res) => {

    if (sesh.userId) {
        res.render('home', { title: "Home" });
    }
    else {
        res.render('home', { title: "Home" });
    }

})



// ## SIGN IN ## 
app.get('/signIn', (req, res) => {
    if (sesh.userId) {
        res.redirect(url.format({ pathname: "/" }));
    }
    else {
        res.render('signIn', { title: "Sign In", query: req.query });
    }
})

// Registering user and checking if already exists in db 
app.post('/signIn', (req, res) => {
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;

    let usernameExist = 0;
    let emailExist = 0;

    User.find({ username: username })
        .then(response => {
            if (response.length !== 0) {
                usernameExist = 1;
            }

            User.find({ email: email })
                .then(responseEmail => {
                    if (responseEmail.length !== 0) {
                        emailExist = 1;
                    }
                    respondWithAnswer(usernameExist, emailExist);
                })
        })

    function respondWithAnswer(uExist, eExist) {
        if (uExist == 0 && eExist == 0) {
            register();
        } else {
            console.log("Red: ", eExist, uExist);
            res.redirect(url.format({
                pathname: "/signIn", query: {
                    "email": eExist,
                    "username": uExist,
                }
            }));
        }
    }

    async function register() {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            var today = new Date();
            var dd = String(today.getDate()).padStart(2, '0');
            var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            var yyyy = today.getFullYear();

            today = mm + '/' + dd + '/' + yyyy;

            User.collection.insertOne({ username: username, email: email, password: hashedPassword, userType: 'user', signInDate: today })
                .then((resx) => {
                    console.log("Worked User Added | Inserted One: ", resx);
                    res.redirect(url.format({
                        pathname: "/login", query: {
                            "userCreated": true
                        }
                    }));
                })
                .catch((err) => {
                    console.log("Error User not added | Inserted One: ", err);
                    res.redirect(url.format({
                        pathname: "/signIn", query: {
                            "email": eExist,
                            "username": uExist,
                            "error": 1
                        }
                    }));
                })

        } catch (err) {
            res.redirect(url.format({
                pathname: "/signIn", query: {
                    "error": 1
                }
            }));
        }
    }



})

// ## LOG IN LOG OUT ## 
app.get('/login', (req, res) => {

    if (sesh.userId) {
        res.redirect(url.format({ pathname: "/" }));
    }
    else {
        res.render('login', { title: "Log in", query: req.query });
    }
})

app.post('/login', function (req, res) {
    let username = req.body.username;
    let password = req.body.password;

    // Error: 1 - Something went wrong with db
    // Error: 2 - User not found
    // Error: 3 - User found but Password is wrong

    User.findOne({ $or: [{ username: username }, { email: username }] })
        .then(response => {

            let userUsername = response.username; // we need that bcs user can input email so we want to make sure we have his username!

            // console.log(req.session);

            if (response !== null) {
                // User found

                // console.log("Inputed password: ", password);
                // console.log("Db password: ", response.password);

                bcrypt.compare(password, response.password, function (err, responsebCrypt) {
                    if (err) {
                        // handle error
                        res.redirect(url.format({
                            pathname: "/login", query: {
                                "error": 3
                            }
                        }));
                    }
                    if (responsebCrypt) {
                        // Password Matched! User can log in (add session)
                        sesh = req.session;
                        sesh.userId = userUsername;

                        res.redirect(url.format({
                            pathname: "/",
                        }));

                    } else {
                        // Password does not match!
                        res.redirect(url.format({
                            pathname: "/login", query: {
                                "error": 3
                            }
                        }));
                    }
                });
            }
            else {
                res.redirect(url.format({
                    pathname: "/login", query: {
                        "error": 2
                    }
                }));
            }

        })
})

app.get('/logout', (req, res) => {

    if (sesh.userId) {
        req.session.destroy();
        res.redirect(url.format({ pathname: "/" }));
    }
    else {
        res.redirect(url.format({ pathname: "/" }));
    }
})






//** Adding POST **/

// Site with all posts
app.get('/posts', (req, res) => {
    // Są dwie opcje wyrenderowania strony Static (res.sendFile) i Dynamic (res.render) i chodzi o to, jakie dane tam trafiają jak są jakieś promise to lepiej dynamic
    Post.find()
        .then(data => {
            if (session.userId) {
                res.render('posts', { title: "Posts", msg: "hi!", recentlyAddedPost: false, dbData: data });
            } else {
                res.render('posts', { title: "Posts", msg: "hi!", recentlyAddedPost: false, dbData: data });
            }

        }).catch(err => {
            console.log("Something went wrong with getting post data!")
        })

})

// Site with add post form
app.get('/addPost', (req, res) => {
    if (sesh.userId) {
        res.render('addPost', { title: "Add post", recentlyAddedPost: false });
    } else {
        res.render('addPost', { title: "Add post", recentlyAddedPost: false });
    }
})

app.post('/addPost', (req, res) => {
    // Here we should check if form data is correct
    const postValues = req.body;

    console.log("post /verify-post");
    console.log(postValues);
    console.log(req);
    Post.collection.insertOne({ title: postValues.title, comment: postValues.comment })
        .then((resx) => {
            console.log("Worked | Inserted One: ", resx);
            res.redirect(302, '/posts');
        })
        .catch((err) => {
            console.log("Error | Inserted One: ", err);
            res.redirect(302, '/');
        })

})


app.listen(3000, () => {
    console.log("Listening on port 3000!")
})

