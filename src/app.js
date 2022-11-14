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

//Conexao ao banco
// top-level await - await fora de funções. Funciona com o sistema de modules - (esmodules)
const conexao = new MongoClient(process.env.MONGO_URI);
await conexao
  .connect()
  .then(console.log("Conexão MongoDB OK"))
  .catch((erro) => console.error(erro));
const db = conexao.db("batePapoUol");

const participantsCollection = db.collection("participants");
const batePapoCollection = db.collection("batepapo");

//Modelo desejado para o participante e messages - o objeto recebe configurações do campo
const participantSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.any().valid("message", "private_message"), // permite um ou outro
});

//options método validate
const opts = {
  abortEarly: false,
};

app.post("/participants", async (req, res) => {
  try {
    const { name } = req.body;

    const validation = participantSchema.validate({ name }, opts);
    if (validation)
      return res
        .status(422)
        .send({ message: error.details.map((m) => m.message) });
    //422: Unprocessable Entity => Significa que a requisição enviada não está no formato esperado

    //verificar se já existe o usuário
    const isParticipantExists = await participantsCollection.findOne({ name });
    if (isParticipantExists)
      return res.status(409).send({ error: "Participante já existe." });
    //409: Conflict => Significa que o recurso que você está tentando inserir já foi inserido

    await participantsCollection.insertOne({ name, lastStatus: Date.now() });
    await batePapoCollection.insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });

    return res.sendStatus(201);
    //201: Created => Sucesso na criação do recurso
  } catch (erro) {
    return res.status(500).send({ message: erro });
    //500: Internal Server Error => Significa que ocorreu algum erro desconhecido no servidor
  }
});

// GET Participants
app.get("/participants", async (req, res) => {
  try {
    const participants = await participantsCollection.find({}).toArray();
    res.send(participants);
  } catch (error) {
    res.status(500).send(error);
  }
});

//// POST Messages
app.post("/messages", async (req, res) => {
  try {
    const validation = messageSchema.validate(req.body, opts);
    if (validation)
      return res
        .status(422)
        .send({ message: error.details.map((m) => m.message) });

    const { to, text, type } = req.body;
    const from = req.headers.user;

    const userParticipant = await ehUsuarioParticipante(from);
    if (!userParticipant)
      return res
        .status(422)
        .send({ message: `Participante ${from} não existente` });

    await batePapoCollection.insertOne({
      from,
      to,
      text,
      type,
      time: dayjs().format("HH:mm:ss"),
    });

    return res.sendStatus(201);
  } catch (erro) {
    return res.status(500).send({ message: erro });
  }
});

//GET Messages
app.get("/messages", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 0);
    const from = req.headers.user;

    const agregacoes =
      limit === 0
        ? [
            {
              $match: {
                $or: [{ to: from }, { from: from }, { type: "status" }],
              },
            },
            {
              $sort: { _id: -1 },
            },
          ]
        : [
            {
              $match: {
                $or: [{ to: from }, { from: from }, { type: "status" }],
              },
            },
            {
              $sort: { _id: -1 },
            },
            {
              $limit: Math.abs(limit),
            },
          ];
    const messages = (
      await batePapoCollection.aggregate(agregacoes).toArray()
    ).reverse();

    return res.status(200).send(messages);
  } catch (erro) {
    console.error(erro);
    return res.status(500).send({ message: erro });
  }
});

//POST /status
app.post("/status", async (req, res) => {
  try {
    const { user } = req.headers;
    const userParticipant = await ehUsuarioParticipante(user);
    if (!userParticipant) return res.sendStatus(404);

    await participantsCollection.updateOne(
      { name: user },
      { $set: { lastStatus: Date.now() } }
    );

    return res.sendStatus(200);
  } catch (erro) {
    return res.status(500).send({ message: erro });
  }
});

//Remove users inativos
async function removeParticipants() {
  try {
    await participantsCollection
      .aggregate([
        {
          $addFields: {
            tempo: { $subtract: [Date.now(), "$lastStatus"] },
          },
        },
      ])
      .forEach(async (participant) => {
        if (participant.tempo > 10000) {
          await participantsCollection.deleteOne({ _id: participant._id });
          await batePapoCollection.insertOne({
            from: participant.name,
            to: "Todos",
            text: "sai da sala...",
            type: "status",
            time: dayjs().format("HH:mm:ss"),
          });
        }
      });
  } catch (erro) {
    console.error(erro);
  }
}

setInterval(removeParticipants, 15000);

async function ehUsuarioParticipante(usuario) {
  return (
    (await participantsCollection.find({ name: usuario }).toArray()).length > 0
  );
}

app.listen(5000, () => console.log("Server running in port 5000"));

//dotenv - gerencia variáveis de ambiente e protege os dados
