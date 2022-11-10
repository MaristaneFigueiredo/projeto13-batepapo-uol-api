
import express from "express"
import cors from "cors"
import joi from "joi"
// biblioteca do mongodb
import {MongoClient} from "mongodb"
import dotenv from "dotenv"

//config
const app = express();
app.use(cors());
app.use(express.json()) // qro receber requisições via body no formato json

dotenv.config() // configura as variáveis de ambiente
//const mongoClient = new MongoClient("mongodb://localhost:27017");
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db; //variável do banco atual


// conectando a base de dados
mongoClient
.connect()
.then(() => {
    db = mongoClient.db("batePapo")
})
.catch((error) => console.log(error));


//validações
const validaçoesParticipants = joi.object({
    name: joi.string()
            .required()
})


// POST Participants
app.post("/participants", (req, res) => {
    const {name} = req.body

    const {error,value} = validaçoesParticipants.validate({name})
    if (error) {
        res.status(422).send({error: error.details})
        return
        //422: Unprocessable Entity => Significa que a requisição enviada não está no formato esperado
    }


    const isParticipantExists = db.collection("participants").find({name:name})

    if (isParticipantExists) {
        res.status(409).send({error: "Participante já existe."})
        return
        //409: Conflict => Significa que o recurso que você está tentando inserir já foi inserido    
    }

    // salvar no mongodb
    db.collection("participants").insert({name:name, lastStatus:Date.now()})
    .then( (response) => {
        // o response é a resposta do banco
        console.log(response)
        // esse res é o res da rota          
        res.sendStatus(201)
        //201: Created => Sucesso na criação do recurso
     }
    ).catch((error) => {
        res.status(500).send(error)
        //500: Internal Server Error => Significa que ocorreu algum erro desconhecido no servidor
    })
    

 
})

// GET Participants
app.get("/participants", (req, res) =>{
    db.collection("participants").find().toArray()
    .then( (participants) => {        
        res.send(participants)
    }) .catch((error) => {
        console.log(error)
        res.status(500).send(error)
    })
    
})




app.listen(5000, () => console.log("Server running in port 5000"))

//dotenv - gerencia variáveis de ambiente e protege os dados