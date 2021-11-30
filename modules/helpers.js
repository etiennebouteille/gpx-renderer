const gpxFilter = function(req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(gpx|GPX)$/)) {
        req.fileValidationError = 'Only gpx files are allowed!';
        return cb(new Error('Only gpx files are allowed!'), false);
    }
    cb(null, true);
};
// exports.gpxFilter = gpxFilter;

export default gpxFilter;