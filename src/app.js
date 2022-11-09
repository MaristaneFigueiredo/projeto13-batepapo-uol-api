
import express from "express"
import cors from "cors"
import joi from "joi"

//config
const app = express();
app.use(cors());
app.use(express.json()) // qro receber requisições via body no formato json

//validações
const validaçoesParticipants = joi.object({
    name: joi.string()
            .required()
})

app.post("/participants", (req, res) => {
    const {name} = req.body

    const {error,value} = validaçoesParticipants.validate({name})
    if(error) {
        res.status(422).send({error: error.details})
        return
        //return res.status(422).send({error:'O nome é obrigatório'})
    }

    const isParticipantExists = collection.find({collectionName = name })

    if(isParticipantExists) {
        res.status(409).send({error: "Participante já existe."})
        return
    }

    // salvar no mongodb
    res.status(201)

    /*testes.push(body)
    res.sendStatus(201)*/
})

app.listen(5000, () => console.log("Server running in port 5000"))