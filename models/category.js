const mongoose = require('mongoose');

// Category Schema
const CategorySchema = new mongoose.Schema({
    Category_ID: {
        type: Number,
        unique: true,
        required: true
    },
    Name: {
        type: String,
        required: true,
        maxlength: 100
    },
    Description: {
        type: String
    },
    Created_At: {
        type: Date,
        default: Date.now
    },
    Updated_At: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'Created_At', updatedAt: 'Updated_At' }
});

const Category = mongoose.model('Category', CategorySchema);

module.exports = Category;
