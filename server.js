
import express from 'express'
import cors from 'cors'
import mqtt from 'mqtt'

const app = express()
const PORT = 3001

const MQTT_URL = 'mqtt://3.94.168.155:1883'
const TOPICO_ALERTA = '/TEF/lamp001/alert'

app.use(cors())
app.use(express.json())

const clienteMQTT = mqtt.connect(MQTT_URL, {
  clientId: `vinheria_dashboard_${Date.now()}`,
  connectTimeout: 5000,
  reconnectPeriod: 3000,
})

clienteMQTT.on('connect', () => {
  console.log('Conectado ao broker MQTT')
})

clienteMQTT.on('error', (erro) => {
  console.error('Erro MQTT:', erro.message)
})

// Armazenamento temporário dos dispositivos
let dispositivos = []

// Lista os dispositivos cadastrados
app.get('/dispositivos', (req, res) => {
  res.json(dispositivos)
})

// Cadastra um dispositivo
app.post('/dispositivos', (req, res) => {
  const { nome, id, tipo, local } = req.body

  if (
    typeof nome !== 'string' ||
    typeof id !== 'string' ||
    typeof tipo !== 'string' ||
    typeof local !== 'string' ||
    !nome.trim() ||
    !id.trim() ||
    !tipo.trim() ||
    !local.trim()
  ) {
    return res.status(400).json({
      erro: 'Informe nome, identificador, tipo e localização.',
    })
  }

  const idNormalizado = id.trim()

  const duplicado = dispositivos.some(
    (dispositivo) =>
      dispositivo.id.toLowerCase() === idNormalizado.toLowerCase(),
  )

  if (duplicado) {
    return res.status(409).json({
      erro: 'Já existe um dispositivo com esse identificador.',
    })
  }

  const novoDispositivo = {
    nome: nome.trim(),
    id: idNormalizado,
    tipo: tipo.trim(),
    local: local.trim(),
  }

  dispositivos.push(novoDispositivo)

  res.status(201).json(novoDispositivo)
})

// Edita um dispositivo usando seu identificador
app.put('/dispositivos/:id', (req, res) => {
  const idAtual = req.params.id
  const { nome, tipo, local } = req.body

  if (
    typeof nome !== 'string' ||
    typeof tipo !== 'string' ||
    typeof local !== 'string' ||
    !nome.trim() ||
    !tipo.trim() ||
    !local.trim()
  ) {
    return res.status(400).json({
      erro: 'Informe nome, tipo e localização.',
    })
  }

  const indice = dispositivos.findIndex(
    (dispositivo) => dispositivo.id === idAtual,
  )

  if (indice === -1) {
    return res.status(404).json({
      erro: 'Dispositivo não encontrado.',
    })
  }

  dispositivos[indice] = {
    ...dispositivos[indice],
    nome: nome.trim(),
    tipo: tipo.trim(),
    local: local.trim(),
  }

  res.json(dispositivos[indice])
})

// Exclui um dispositivo
app.delete('/dispositivos/:id', (req, res) => {
  const id = req.params.id

  const existe = dispositivos.some(
    (dispositivo) => dispositivo.id === id,
  )

  if (!existe) {
    return res.status(404).json({
      erro: 'Dispositivo não encontrado.',
    })
  }

  dispositivos = dispositivos.filter(
    (dispositivo) => dispositivo.id !== id,
  )

  res.status(204).send()
})

// Envia alertas ao ESP32 via MQTT
app.post('/alerta', (req, res) => {
  const { alerta } = req.body

  const alertasPermitidos = [
    'temperatura',
    'umidade',
    'luminosidade',
    'normal',
  ]

  if (!alertasPermitidos.includes(alerta)) {
    return res.status(400).json({
      erro: 'Tipo de alerta inválido.',
    })
  }

  if (!clienteMQTT.connected) {
    return res.status(503).json({
      erro: 'Broker MQTT indisponível.',
    })
  }

  clienteMQTT.publish(TOPICO_ALERTA, alerta, { qos: 0 }, (erro) => {
    if (erro) {
      return res.status(500).json({
        erro: 'Não foi possível enviar o alerta.',
      })
    }

    console.log(`Alerta enviado: ${alerta}`)
    res.json({ sucesso: true, alerta })
  })
})

app.listen(PORT, () => {
  console.log(`Backend disponível na porta ${PORT}`)
})
