const Reservation = require('../models/Reservation');
const Coworkingspace = require('../models/CoworkingSpace');


// ==========================================
// @desc     Get all coworking spaces
// @route    GET /api/v1/coworkingspaces
// @access   Public
// ==========================================
exports.getCoworkingspaces = async (req, res, next) => {
    try {
        const reqQuery = { ...req.query };

        const removeFields = ['select', 'sort', 'page', 'limit'];
        removeFields.forEach(param => delete reqQuery[param]);

        let queryStr = JSON.stringify(reqQuery);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

        let query = Coworkingspace
            .find(JSON.parse(queryStr))
            .populate({
                path: 'reservations',
                select: 'apptDate status user'
            });

        if (req.query.select) {
            const fields = req.query.select.split(',').join(' ');
            query = query.select(fields);
        }

        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const total = await Coworkingspace.countDocuments(JSON.parse(queryStr));

        query = query.skip(startIndex).limit(limit);

        const coworkingspaces = await query;

        const pagination = {};

        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }

        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        return res.status(200).json({
            success: true,
            count: coworkingspaces.length,
            pagination,
            data: coworkingspaces
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


// ==========================================
// @desc     Get single coworking space
// @route    GET /api/v1/coworkingspaces/:id
// @access   Public
// ==========================================
exports.getCoworkingspace = async (req, res, next) => {
    try {
        const coworkingspace = await Coworkingspace
            .findById(req.params.id)
            .populate('reservations');

        if (!coworkingspace) {
            return res.status(404).json({ success: false, message: 'Coworking space not found' });
        }

        return res.status(200).json({ success: true, data: coworkingspace });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


// ==========================================
// @desc     Create coworking space
// @route    POST /api/v1/coworkingspaces
// @access   Private/Admin
// ==========================================
exports.createCoworkingspace = async (req, res, next) => {
    try {
        const coworkingspace = await Coworkingspace.create(req.body);

        return res.status(201).json({ success: true, data: coworkingspace });

    } catch (err) {
        console.error(err);

        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate field value entered. This coworking space already exists.'
            });
        }

        return res.status(400).json({ success: false, message: err.message || 'Invalid data' });
    }
};


// ==========================================
// @desc     Update coworking space
// @route    PUT /api/v1/coworkingspaces/:id
// @access   Private/Admin
// ==========================================
exports.updateCoworkingspace = async (req, res, next) => {
    try {
        const coworkingspace = await Coworkingspace.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!coworkingspace) {
            return res.status(404).json({ success: false, message: 'Coworking space not found' });
        }

        return res.status(200).json({ success: true, data: coworkingspace });

    } catch (err) {
        console.error(err);

        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate field value entered. Update would create duplicate.'
            });
        }

        return res.status(400).json({ success: false, message: err.message || 'Update failed' });
    }
};


// ==========================================
// @desc     Delete coworking space
// @route    DELETE /api/v1/coworkingspaces/:id
// @access   Private/Admin
// ==========================================
exports.deleteCoworkingspace = async (req, res, next) => {
    try {
        const coworkingspace = await Coworkingspace.findById(req.params.id);

        if (!coworkingspace) {
            return res.status(404).json({ success: false, message: 'Coworking space not found' });
        }

        await Reservation.deleteMany({ coworkingspace: req.params.id });
        await coworkingspace.deleteOne();

        return res.status(200).json({ success: true, message: 'Coworking space deleted successfully' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


// ==========================================
// @desc     Update photo (Google Drive URL) and caption
// @route    PUT /api/v1/coworkingspaces/:id/photo
// @access   Private/Admin
// ==========================================
exports.updateCoworkingspacePhoto = async (req, res, next) => {
    try {
        const { picture, caption } = req.body;

        if (picture === undefined && caption === undefined) {
            return res.status(400).json({ success: false, message: 'Please provide a picture URL or caption' });
        }

        const coworkingspace = await Coworkingspace.findById(req.params.id);

        if (!coworkingspace) {
            return res.status(404).json({ success: false, message: 'Coworking space not found' });
        }

        const updateData = {};
        if (picture !== undefined) updateData.picture = picture;
        if (caption !== undefined) updateData.caption = caption;

        const updated = await Coworkingspace.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        return res.status(200).json({ success: true, data: { picture: updated.picture, caption: updated.caption } });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};