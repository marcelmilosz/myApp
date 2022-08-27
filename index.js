const express = require('express');
const app = express();

const path = require('path');

const mongoose = require('mongoose');

const Post = require('./models/post.js');

const session = require('express-session');
const User = require('./models/user.js');

mongoose.connect('mongodb://localhost:27017/app', { useNewUrlParser: true })
    .then(() => {
        console.log("Connected to Mongo")
    })
    .catch((e) => {
        console.log("Problem with connecting to Mongo!")
    })

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true })) // for form data
app.use(express.static(__dirname + '/public')); // For public - css 

// Req to request czyli informacja o przychodzącej informacji ze ktoś pojawił się na stronie
// Res to response czyli nasza odpowiedz w postaci np. HTML 
// Wazna jest kolejność!

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.get('/', (req, res) => {

    if (req.session.loggedin) {
        // Output username
        res.render('home', { title: "Home", isLogged: true });
    } else {
        // Not logged in
        res.render('home', { title: "Home", isLogged: false });
    }
})



app.get('/signIn', (req, res) => {
    res.render('signIn', { title: "Sign In" });
})

app.post('/verify-signIn', function (req, res) {

    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;

    if (username && password) {
        User.collection.insertOne({ username: username, email: email, password: password })
            .then((resx) => {
                console.log("Worked User Added | Inserted One: ", resx);
                res.redirect(302, '/');
            })
            .catch((err) => {
                console.log("Error User not added | Inserted One: ", err);
                res.redirect(302, '/');
            })
    }
});

app.get('/login', (req, res) => {
    res.render('login', { title: "Log In" })
})

app.post('/auth', function (req, res) {

    let email = req.body.email;
    let password = req.body.password;

    req.session.loggedin = true;
    req.session.email = email;

    res.redirect('/')
});






//** Adding POST **/

// Site with all posts
app.get('/posts', (req, res) => {
    // Są dwie opcje wyrenderowania strony Static (res.sendFile) i Dynamic (res.render) i chodzi o to, jakie dane tam trafiają jak są jakieś promise to lepiej dynamic
    console.log("get - /posts");
    res.render('posts', { title: "Posts", msg: "hi!", recentlyAddedPost: false });
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

