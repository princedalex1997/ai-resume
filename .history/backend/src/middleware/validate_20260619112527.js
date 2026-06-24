const ApiError = require("../utils/ApiError")


const validate =  (schema, source="body")=>(req,res, next) =>{

    const result = schema.safeParse(req[source])

    if(!result.success){
        return next(
            ApiError.badRequest("Validation Error", result.error.issue)
        )
    }
    req[source]= result.data;
    next()
}

module.exports = validate