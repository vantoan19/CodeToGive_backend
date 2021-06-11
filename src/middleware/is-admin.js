const isAdmin = (req, res, next) => {
    try {
        if (req.user.accountType !== 'admin')
            throw new Error('Only admin has the right to do this');
        next();
    } catch (error) {
        res.status(400).send(error);
    }
}

module.exports = isAdmin;