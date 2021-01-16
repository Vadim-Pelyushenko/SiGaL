import express from "express"
import {Middleware} from "./middleware"
import {Router} from "./router"
const app = express()
Middleware(app)

Router(app)



app.listen(5000, () => console.log("listening to 5000"))
