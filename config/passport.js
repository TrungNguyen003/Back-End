const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const bcryptjs = require('bcryptjs');

module.exports = function(passport) {
    // Sử dụng `gmail` thay vì `username`
    passport.use(new LocalStrategy({ usernameField: 'gmail' }, (gmail, password, done) => {
        // Tìm người dùng theo `gmail`
        User.findOne({ gmail: gmail }).then(user => {
            if (!user) {
                return done(null, false, { message: 'Không tìm thấy người dùng' });
            }

            // So sánh mật khẩu
            bcryptjs.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Sai mật khẩu' });
                }
            });
        }).catch(err => console.log(err));
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user);
        });
    });
};
