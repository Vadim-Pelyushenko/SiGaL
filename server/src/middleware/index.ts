import {Express} from "express"
import bodyParser from "body-parser"

export const Middleware = (app: Express) => {
    app.use(bodyParser.json())
}