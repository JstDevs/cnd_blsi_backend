const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// RequireAuth middleware
function requireAuth(req, res, next) {

    const authHeader = req.headers.authorization;

    const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;

    if (!token) {
        return res.status(401).json({ 
            error: 'Access denied. No token provided.' 
        });
    }

    try {
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ 
                error: 'Invalid token.' 
            });
        }

        req.user = {
            id: decoded.id,
            userName: decoded.userName,
            userAccessIDs: decoded.userAccessIDs || [],
            employeeID: decoded.employeeID,
            departmentID: decoded.departmentID,
            departmentCode: decoded.departmentCode,
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ 
            error: 'Invalid token.' 
        });
    }
}

module.exports = requireAuth;
