
import express from "express"
import cors from "cors"
import joi from "joi"
// biblioteca do mongodb
import {MongoClient} from "mongodb"

//config
const app = express();
app.use(cors());
app.use(express.json()) // qro receber requisições via body no formato json
const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

// aqui gera uma promessa
mongoClient.connect()
.then(() => {
    db = mongoClient.db("batePapo")
})
.catch( (error) => console.log(error));

//validações
const validaçoesParticipants = joi.object({
    name: joi.string()
            .required()
})

app.post("/participants", (req, res) => {
    const {name} = req.body

    const {error,value} = validaçoesParticipants.validate({name})
    if (error) {
        res.status(422).send({error: error.details})
        return
        //return res.status(422).send({error:'O nome é obrigatório'})
    }


    const isParticipantExists = db.collection("participants").find({name:name })

    if (isParticipantExists) {
        res.status(409).send({error: "Participante já existe."})
        return
    }

    // salvar no mongodb
    db.collection("participants").insert({name:name, lastStatus: Date.now() }).then( (response) => {
        // o response é a resposta do banco
        console.log(response)
        // esse res é o res da rota          
        res.status(201) }
    ).catch((error) => {
        res.status(500).send(error)
    })
    

 
})


app.get("/participants", (req, res) =>{
    db.collection("participants").find().toArray().then( (participants) => {        
        res.send(participants)
    }) .catch((err) => {
        console.log(err)
        res.sendStatus(500)
    })

    
})

app.listen(5000, () => console.log("Server running in port 5000"))

//41