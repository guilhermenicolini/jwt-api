require('dotenv').config()
const express = require('express')
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

let db
MongoClient.connect(process.env.MONGODB).then(cl => db = cl.db())
const app = express()
const port = parseInt(process.env.PORT) || 3000
const secret = process.env.SECRET || 'some-secret'

app.use(require('express').json())

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', '*')
  res.header('Access-Control-Allow-Headers', '*')
  next()
})

const auth = () => {
  return (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
      res.status(401).send()
    } else {
      try {
        const token = req.headers.authorization.replace('Bearer ', '')
        const decode = jwt.verify(token, secret)
        req.sub = decode.sub
        req.email = decode.email
        next()
      } catch(err) {
        res.status(401).send()
      }
    }
  }
}

app.post('/login', async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send()
  }

  const user = await db.collection('users').findOne({ email: req.body.email, password: req.body.password })
  if (!user) {
    return res.status(401).send()
  }
  res.send({
    accessToken: jwt.sign({ sub: user._id, email: user.email }, secret)
  })
})

app.get('/warranties', auth(), async (req, res) => {
  const warranties = await db.collection('warranties').find({ userId: new ObjectId(req.sub) }).toArray()
  res.send(warranties)
})

app.post('/warranties', auth(), async (req, res) => {
  const warranty = await db.collection('warranties').insertOne({ userId: new ObjectId(req.sub), ...req.body })
  res.send({ id: warranty.insertedId })
})

app.get('/warranties/:id', auth(), async (req, res) => {
  const warranty = await db.collection('warranties').findOne({ userId: new ObjectId(req.sub), _id: new ObjectId(req.params.id) })
  if (!warranty) {
    return res.status(404).send()
  }
  res.send(warranty)
})

app.delete('/warranties/:id', auth(), async (req, res) => {
  await db.collection('warranties').deleteOne({ userId: new ObjectId(req.sub), _id: new ObjectId(req.params.id) })
  res.status(204).send()
})

app.listen(port, () => {
  console.log(`Api listening at http://localhost:${port}`)
})