//fixname
const mongoose = require('mongoose');

const CoworkingspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        unique: true,
        trim: true,
        maxlength: [100, 'Name cannot be more than 100 characters']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    district: {
        type: String,
        required: [true, 'Please add district']
    },
    province: {
        type: String,
        required: [true, 'Please add province']
    },
    postalcode: {
        type: String,
        required: [true, 'Please add postal code']
    },
    tel: {
        type: String,
        required: [true, 'Please add telephone number']
    },
    region: {
        type: String,
        required: [true, 'Please add region']
    },
    openTime: {
        type: String,
        required: [true, 'Please add opening time']
    },
    closeTime: {
        type: String,
        required: [true, 'Please add closing time']
    },
    picture: {
        type: String,
        default: null
    },
    caption: {
        type: String,
        trim: true,
        maxlength: [200, 'Caption cannot be more than 200 characters'],
        default: ''
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

CoworkingspaceSchema.virtual('reservations', {
    ref: 'Reservation',
    localField: '_id',
    foreignField: 'coworkingSpace',
    justOne: false
});

CoworkingspaceSchema.set('toJSON', { virtuals: true });
CoworkingspaceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.CoworkingSpace || mongoose.model('CoworkingSpace', CoworkingspaceSchema);