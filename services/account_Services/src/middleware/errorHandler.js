export class AppError extends Error{
    constructor(message,statusCode){
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export function errorHandler(err,req,res,next){
    if(err.isOperational){
        res.status(err.statusCode).json({
            status:"error",
            message:err.message
        })
    }
    console.error(`[account-service] Unhandled error on ${req.method} ${req.path}:`, err);
    res.status(500).json({
        status:"error",
        message:"Internal Server Error"
    })
}