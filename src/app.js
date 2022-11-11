import express from "express";
import cors from "cors";
import joi from "joi";

import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";

//config
const app = express();
app.use(cors());
app.use(express.json()); // qro receber requisições via body no formato json
dotenv.config(); // configura as variáveis de ambiente
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db; //variável do banco atual

// conectando a base de dados
// top-level await - await fora de funções. Funciona com o sistema de modules - (esmodules)
try {
  await mongoClient.connect();
  db = mongoClient.db("batePapo");
} catch (error) {
  console.log(error);
}

//Modelo desejado para o participante e messages - o objeto recebe configurações do campo
const participantSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.allow(["message", "private_message"]),
});

//
let isParticipantExists;
function participantExists(participant) {
  return (isParticipantExists = db
    .collection("participants")
    .find({ name: participant }));
}

// POST Participants
app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const validation = participantSchema.validate({ name });

  if (validation.error) {
    console.log(validation.error.details.message);
    res.status(422).send({ error: validation.error.details.message });
    //422: Unprocessable Entity => Significa que a requisição enviada não está no formato esperado
  }

  /*const isParticipantExists = db.collection("participants").find({name:name})
    if (isParticipantExists) {
        res.status(409).send({error: "Participante já existe."})
        return
        //409: Conflict => Significa que o recurso que você está tentando inserir já foi inserido    
    }*/

  if (participantExists(name)) {
    res.status(409).send({ error: "Participante já existe." });
    return;
    //409: Conflict => Significa que o recurso que você está tentando inserir já foi inserido
  }

  try {
    await db
      .collection("participants")
      .insert({ name: name, lastStatus: Date.now() });
    res.sendStatus(201);
    //201: Created => Sucesso na criação do recurso
  } catch (error) {
    res.status(500).send(error);
    //500: Internal Server Error => Significa que ocorreu algum erro desconhecido no servidor
  }
});

// GET Participants
app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.send(participants);
  } catch (error) {
    res.status(500).send(error);
  }
});

//// POST Messages
app.post("/messages", async (req, res) => {
  const {to, text, type} = req.body;
  const from = req.headers.user;
  /*const posts = getPostsThatThisUserMightLike(user);
	res.send(posts);*/
  /*  const extratoDoCliente = extrato.filter((mov) => mov.cliente === usuario);
  console.log(extratoDoCliente); */

  const validation = messageSchema.validate({to, text, type}, { abortEarly: false });
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message)
    res.status(422).send(errors);
    return;
  }

  if (!participantExists(from)) {
    res.send({ error: "Participante não existe!" });
    return;
  }

  try {
    await db.collection("messages").insert({ from: from, to:to, text:text, type:type, time:dayjs().format('HH:MM:SS')})
    res.sendStatus(201);
  } catch (error) {
    res.status(500).send(error);
  }
});


//GET Messages
app.get("/messages", async (req, res) => {
  try {
  } catch (error) {}
});

app.listen(5000, () => console.log("Server running in port 5000"));

//dotenv - gerencia variáveis de ambiente e protege os dados
