import {Express} from "express"


export const Router = (app: Express) => {
    app.get("/", (req,res) => {
        res.status(200).send({message: "testing"})
    })
} 