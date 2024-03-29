const {
    promisify
} = require('util');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const passport = require('passport');
const randomBytesAsync = promisify(crypto.randomBytes);
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const routes = express.Router();

const admin = require('../models/admin');
const user = require('../models/user');
const RegUsers = require('../models/regusers');

/*
 * To signup a admin
 * Only a logged in admin can register another admin
 */
routes.post('/signup', (req, res) => {
    if (req.body.firstname && req.body.lastname && req.body.sex && req.body.dateOfBirth &&
        req.body.phone && req.body.password && req.body.email) {

        const {
            password
        } = req.body;


        req.assert('email', 'Email is not valid').isEmail();
        req.assert('password', 'Password must be at least 6 characters long').len(6);
        req.assert('phone', 'Password must be  10 characters long').len(10);
        req.sanitize('email').normalizeEmail({
            gmail_remove_dots: false
        });

        const errors = req.validationErrors();

        if (errors) {
            return res.status(400).send(errors);
        }

        const hashCost = 10;

        bcrypt.hash(password, hashCost)
            .then(passwordHash => {
                // req.body.dateOfBirth should be MM/DD/YYYY format
                let dateOfBirth = new Date(req.body.dateOfBirth);
                let postData = {
                    'firstname': req.body.firstname,
                    'lastname': req.body.lastname,
                    'sex': req.body.sex,
                    'dateOfBirth': dateOfBirth,
                    'phone': req.body.phone,
                    'password': passwordHash,
                    'email': req.body.email,
                    'addedBy': req.user._id
                };

                // Logged in user has to be an admin to be able to add another admin
                admin.findById(mongoose.Types.ObjectId(req.user._id), (err, doc) => {
                    if (err) {
                        res.status(400).json({
                            error: err
                        });
                    } else {
                        if (doc === null || doc.length <= 0) {
                            res.status(401).json({
                                error: 'unauthorized access'
                            });
                        } else {
                            admin.create(postData, (err, doc) => {
                                if (err) {
                                    console.log('Error while creating admin', err.message);
                                    if (err.message.includes('phone') && err.message.includes('email')) {
                                        res.status(400).json({
                                            error: 'duplicate email and phone'
                                        });
                                    } else if (err.message.includes('phone')) {
                                        res.status(400).json({
                                            error: 'duplicate phone'
                                        });
                                    } else if (err.message.includes('email')) {
                                        res.status(400).json({
                                            error: 'duplicate email'
                                        });
                                    } else {
                                        res.status(400).send({
                                            error: err.message,
                                        });
                                    }

                                } else {
                                    console.log('admin doc created ', doc);
                                    res.status(201).json({
                                        message: 'admin created successfully'
                                    });
                                }
                            });


                        }
                    }
                });

            })
            .catch(() => {
                res.status(400).send({
                    error: 'data required: email, firstname, lastname, sex, date of birth, phone and password',
                });
            });
    } else {
        res.status(400).json({
            error: 'one or more parameters missing'
        });
    }
});

// admin login in
routes.post('/login', (req, res) => {
    if (req.body.email && req.body.password) {
        req.assert('email', 'Email is not valid').isEmail();
        req.assert('password', 'Password cannot be blank').notEmpty();
        req.sanitize('email').normalizeEmail({
            gmail_remove_dots: false
        });

        const errors = req.validationErrors();
        if (errors) {
            return res.status(400).send(error)
        }
        console.log(req.body);
        passport.authenticate('admin', (err, user, info) => {
            if (err) {
                return res.status(500).json({
                    error: err
                });
            }
            if (!user) {
                return res.status(400).json({
                    response: info
                });
            }
            console.log("check passport");
            req.login(user, { session: false }, (err) => {
                console.log(err);
                if (err) {
                    return res.status(500).json({
                        error: err
                    });
                }
                console.log('req.user ', req.user);
                const token = jwt.sign({ id: user.id }, 'kalu@198802', { expiresIn: 36000 });
                return res.status(200).json({ user, 'token': token });
            });
        })(req, res);
    } else {
        res.status(400).json({
            error: 'one or more parameter missing'
        });
    }
});
// admin add user 

routes.post('/add', passport.authenticate('jwt', { session: false }), (req, res) => {
    // console.log(req.body);
    if (req.body.firstname && req.body.lastname && req.body.sex && req.body.dateOfBirth &&
        req.body.phone && req.body.password && req.body.email) {

        const {
            password
        } = req.body;


        req.assert('email', 'Email is not valid').isEmail();
        req.assert('password', 'Password must be at least 6 characters long').len(6);
        req.assert('phone', 'Password must be  10 characters long').len(10);
        req.sanitize('email').normalizeEmail({
            gmail_remove_dots: false
        });

        const errors = req.validationErrors();

        if (errors) {
            return res.status(400).send(errors);
        }

        const hashCost = 10;


        bcrypt.hash(password, hashCost)
            .then(passwordHash => {
                // req.body.dateOfBirth should be MM/DD/YYYY format

                // Logged in user has to be an admin to be able to add another admin
                console.log("req user id " + req.user);
                admin.findById(mongoose.Types.ObjectId(req.user._id), (err, doc) => {

                    if (err) {
                        res.status(400).json({
                            error: err
                        });
                    } else {
                        if (doc === null || doc.length <= 0) {
                            res.status(401).json({
                                error: 'unauthorized access'
                            });
                        } else {
                            let dateOfBirth = new Date(req.body.dateOfBirth);
                            let postData = {
                                'firstname': req.body.firstname,
                                'lastname': req.body.lastname,
                                'sex': req.body.sex,
                                'dateOfBirth': dateOfBirth,
                                'phone': req.body.phone,
                                'password': passwordHash,
                                'email': req.body.email,
                                'addedBy': req.user._id
                            };

                            user.create(postData, (err, doc) => {
                                if (err) {
                                    console.log('Error while creating user', err.message);
                                    if (err.message.includes('phone') && err.message.includes('email')) {
                                        res.status(400).json({
                                            error: 'duplicate email and phone'
                                        });
                                    } else if (err.message.includes('phone')) {
                                        res.status(400).json({
                                            error: 'duplicate phone'
                                        });
                                    } else if (err.message.includes('email')) {
                                        res.status(400).json({
                                            error: 'duplicate email'
                                        });
                                    } else {
                                        res.status(400).send({
                                            error: err.message,
                                        });
                                    }

                                } else {
                                    console.log('pharmacist or doctor created ', doc);
                                    res.status(201).json({
                                        message: 'user created successfully',
                                        user: doc
                                    });
                                }
                            });


                        }
                    }
                });

            })
            .catch(() => {
                res.status(400).send({
                    error: 'data required: email, firstname, lastname, sex, date of birth, phone and password',
                });
            });
    } else {
        res.status(400).json({
            error: 'one or more parameters missing'
        });
    }
});

routes.get('/all', (req, res) => {

    RegUsers.find({})
        .then(function (users) {
            // console.log(users);
            res.status(200).json({
               users
            });

        }, function (err) {
            res.status(501).json({
                "error": err
            });
        });

});
routes.get('/search',(req,res)=>{
    if (req.query.mobile) {
        RegUsers.findOne({ mobile: req.query.mobile }, (err, user) => {
            if (err) {
                res.status(500).json({
                    error: err
                });
            } else if (user == null) {
                res.status(400).json({
                    result: 'user not found'
                });
            }
            else {
                res.status(200).json({
                   user
                });
            }
        })
    } else {
        res.status(400).json({
            message: 'one or more parameters missing'
        });
    }
   
});
routes.put('/delete',(req,res)=>{
    if (req.query.mobile && req.body.services) {
        RegUsers.findOneAndUpdate({ mobile: req.query.mobile }, 
            {
                $pull: {
                    subcriptions: {
                        $in: req.body.services
                    }
                    
                }
            }
            ,(err, user) => {
            if (err) {
                res.status(500).json({
                    error: err
                });
            } else if (user == null) {
                res.status(400).json({
                    result: 'user not found'
                });
            }
            else {
                res.status(200).json({
                   user
                });
            }
        })
    } else {
        res.status(400).json({
            message: 'one or more parameters missing'
        });
    }
   
});

module.exports = routes;