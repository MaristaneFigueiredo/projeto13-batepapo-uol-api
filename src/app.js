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
const conectionDataBase = new MongoClient(process.env.MONGO_URI);
let db; //variável do banco atual

// conectando a base de dados
// top-level await - await fora de funções. Funciona com o sistema de modules - (esmodules)
try {
  await conectionDataBase.connect();
  db = conectionDataBase.db("batePapoUol");
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
  type: joi.any().valid("message", "private_message"), // permite um ou outro
});

// async function isParticipantExists(participant) {
//   return (
//     (await db.collection("participants").find({ name: participant }).toArray())
//       .length > 0
//   );
// }
// POST Participants
app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const validation = participantSchema.validate({ name });

  if (validation.error) {
    res.status(422).send({ error: validation.error.details[0].message });
    //422: Unprocessable Entity => Significa que a requisição enviada não está no formato esperado
  }

  const isParticipantExists =
    (await db.collection("participants").find({ name: name }).toArray())
      .length > 0;

  if (isParticipantExists) {
    res.status(409).send({ error: "Participante já existe." });
    return;
    //409: Conflict => Significa que o recurso que você está tentando inserir já foi inserido
  }

  try {
    await db
      .collection("participants")
      .insertOne({ name: name, lastStatus: Date.now() });
    await db.collection("messages").insert({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
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
  const { to, text, type } = req.body;
  const user = req.headers.user;
  console.log("user", user);

  const validation = messageSchema.validate(
    { to, text, type },
    { abortEarly: false }
  );
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  // const userParticipant = isParticipantExists(user);
  // console.log("userParticipant", userParticipant);
  // if (!userParticipant) {
  //   console.log("userParticipant", userParticipant);
  //   res.status(409).send({ error: "Participante não existe!" });
  //   return;
  //   //409: Conflict => Significa que o recurso que você está tentando inserir já foi inserido
  // }

  const isParticipantExists =
    (await db.collection("participants").find({ name: user }).toArray())
      .length > 0;
  console.log("isParticipantExists1", isParticipantExists);
  if (!isParticipantExists) {
    res.status(409).send({ error: "Participante não existe!" });
    return;
    //409: Conflict => Significa que o recurso que você está tentando inserir já foi inserido
  }

  try {
    await db.collection("messages").insert({
      from: user,
      to: to,
      text: text,
      type: type,
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (error) {
    res.status(500).send(error);
  }
});

//GET Messages
app.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);
  const user = req.headers.user;

  /*if (limit !== 0) {
    const tenLastTweets = tweetsReturn.slice(-10)
  } else {
    try {
      const messages = await db.collection("participants").find({from: user, to:user}).toArray()
      res.send(messages);
    } catch (error) {
      res.status(500).send(error);
    }
  }*/

  try {
    const messages = await db
      .collection("participants")
      .find({ from: user, to: user })
      .toArray()
      .reverse();
    res.send(messages);
  } catch (error) {
    res.status(500).send(error);
  }
});

//POST /status
app.post("/status", async (req, res) => {
  try {
    const user = req.headers.user;

    const isParticipantExists =
      (await db.collection("participants").find({ name: user }).toArray())
        .length > 0;
    console.log("isParticipantExists1", isParticipantExists);
    if (!isParticipantExists) {
      sendStatus(404);
      return;
    }

    await db
      .collection("participants")
      .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });

    return res.sendStatus(200);
  } catch (erro) {
    return res.status(500).send({ message: erro });
  }
});

app.listen(5000, () => console.log("Server running in port 5000"));

//dotenv - gerencia variáveis de ambiente e protege os dados
