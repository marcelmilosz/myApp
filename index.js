const express = require('express');
const app = express();

const path = require('path');
const url = require('url');

const mongoose = require('mongoose');

const Post = require('./models/post.js');

const session = require('express-session');
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

app.use(session({
    secret: "secret bro",
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: 60 * 60 * 24 * 1000
    }
}));

// Req to request czyli informacja o przychodzącej informacji ze ktoś pojawił się na stronie
// Res to response czyli nasza odpowiedz w postaci np. HTML 
// Wazna jest kolejność!


app.get('/', (req, res) => {

    res.render('home', { title: "Home", isLogged: "Not set" });

})



app.get('/signIn', (req, res) => {
    res.render('signIn', { title: "Sign In", query: req.query });
})

// Registering user and checking if already exists in db 
app.post('/signIn', (req, res) => {
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;

    let usernameExist = 0;
    let emailExist = 0;

    console.log(username, email);

    User.find({ username: username })
        .then(response => {
            if (response.length !== 0) {
                console.log("Username exists!")
                usernameExist = 1;
            }

            User.find({ email: email })
                .then(responseEmail => {
                    if (responseEmail.length !== 0) {
                        console.log("Email exists!")
                        emailExist = 1;
                    }
                    respondWithAnswer(usernameExist, emailExist);
                })
        })

    function respondWithAnswer(uExist, eExist) {
        if (uExist == 0 && eExist == 0) {
            console.log("You can register!");
            // register();
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


    // console.log(usernameExists, emailExists)

    // if (emailExists == true && usernameExists == true) {
    //     res.redirect(url.format({
    //         pathname: "/", query: {
    //             "emailExists": 1,
    //             "usernameExists": 1,
    //         }
    //     }));
    // }
    // if (emailExists == false && usernameExists == false) {
    //     // register();
    //     console.log("U can be registered!");
    // }
    // if (emailExists == true && usernameExists == false) {
    //     res.redirect(url.format({
    //         pathname: "/", query: {
    //             "emailExists": 1,
    //             "usernameExists": 0,
    //         }
    //     }));
    // }
    // if (emailExists == false && usernameExists == true) {
    //     res.redirect(url.format({
    //         pathname: "/", query: {
    //             "emailExists": 0,
    //             "usernameExists": 1,
    //         }
    //     }));
    // }






    async function register() {
        try {
            const hashedPassword = await bcrypt.hash(password, 10)

            User.collection.insertOne({ username: username, email: email, password: hashedPassword })
                .then((resx) => {
                    console.log("Worked User Added | Inserted One: ", resx);
                    res.redirect(302, '/');
                })
                .catch((err) => {
                    console.log("Error User not added | Inserted One: ", err);
                    res.redirect(302, '/');
                })

        } catch (err) {
            console.log(err);
            res.redirect(302, '/signIn');
        }
    }



})


app.get('/login', (req, res) => {
    res.render('login', { title: "Log In" })
})

app.post('/auth', function (req, res) {

    res.redirect('/')
});






//** Adding POST **/

// Site with all posts
app.get('/posts', (req, res) => {
    // Są dwie opcje wyrenderowania strony Static (res.sendFile) i Dynamic (res.render) i chodzi o to, jakie dane tam trafiają jak są jakieś promise to lepiej dynamic
    console.log("get - /posts");
    Post.find()
        .then(data => {
            res.render('posts', { title: "Posts", msg: "hi!", recentlyAddedPost: false, dbData: data });
        }).catch(err => {
            console.log("Something went wrong with getting post data!")
        })

})

// Site with add post form
app.get('/addPost', (req, res) => {
    console.log("get - /addPost");
    res.render('addPost', { title: "Add post" });
})

app.post('/verify-post', (req, res) => {
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

