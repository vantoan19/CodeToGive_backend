const multer = require('multer');


const upload = multer({
    limits: {
        fileSize: 1024 * 1024 * 10 //5MB
    },
    fileFilter: function(req, file, callback) {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            callback(null, true);
        } else {
            callback(new Error('Invalid file extension, only jpeg or png image accepted'), false);
        }
    }
});


module.exports = upload;