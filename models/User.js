const  mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema({
    data:String,
    whetherData:Object,
});


const userSchema = new mongoose.Schema({
    email:{
        type:String,
        require:true,
        unique:true
    },
    location:{
        latitude:Number,
        longitude:Number,
        city:String,
    },
    weatherReport: [weatherSchema],
});

module.exports = mongoose.model('User',userSchema);