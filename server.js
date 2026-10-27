import express from 'express'
import cors from 'cors'
import mqtt from 'mqtt'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

let currentAwsIp = ''
let clienteMQTT = null

function conectarMQTT(ip) {
  if (clienteMQTT) {
    try {
      clienteMQTT.end(true)
    } catch (e) {}
  }
  
  if (!ip) return

  const MQTT_URL = `mqtt://${ip}:1883`
  console.log(`Tentando conectar ao broker MQTT em ${MQTT_URL}...`)

  clienteMQTT = mqtt.connect(MQTT_URL, {
    clientId: `vinheria_dashboard_${Date.now()}`,
    connectTimeout: 5000,
    reconnectPeriod: 3000,
  })

  clienteMQTT.on('connect', () => {
    console.log(`✅ Conectado com sucesso ao broker MQTT em ${ip}`)
  })

  clienteMQTT.on('error', (erro) => {
    console.error('❌ Erro de conexão MQTT:', erro.message)
  })
}

// Endpoint para configurar o IP da AWS dinamicamente pelo Front-end
app.post('/config-ip', (req, res) => {
  const { ip } = req.body
  if (!ip || typeof ip !== 'string' || !ip.trim()) {
    return res.status(400).json({ erro: 'Informe um IP válido.' })
  }
  
  const novoIp = ip.trim()
  if (novoIp !== currentAwsIp) {
    currentAwsIp = novoIp
    conectarMQTT(currentAwsIp)
    console.log(`IP da AWS reconfigurado: ${currentAwsIp}`)
  }
  
  res.json({ sucesso: true, ip: currentAwsIp })
})

// Proxy dinâmico para o STH-Comet
app.use('/sth-api', async (req, res) => {
  const ipHeader = req.headers['x-aws-ip']
  const ipToUse = ipHeader || currentAwsIp

  if (!ipToUse) {
    return res.status(400).json({ erro: 'IP da AWS não configurado no backend.' })
  }

  if (ipHeader && ipHeader !== currentAwsIp) {
    currentAwsIp = ipHeader
    conectarMQTT(currentAwsIp)
  }

  try {
    const targetUrl = `http://${ipToUse}:8666${req.originalUrl.replace(/^\/sth-api/, '')}`
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'fiware-service': req.headers['fiware-service'] || 'smart',
        'fiware-servicepath': req.headers['fiware-servicepath'] || '/',
        'content-type': 'application/json'
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
    })
    const data = await response.text()
    res.status(response.status).send(data)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao comunicar com STH-Comet', detalhes: err.message })
  }
})

// Dispositivos em memória
let dispositivos = []

app.get('/dispositivos', (req, res) => {
  res.json(dispositivos)
})

app.post('/dispositivos', (req, res) => {
  const { nome, id, tipo, local } = req.body

  if (!nome || !id || !tipo || !local) {
    return res.status(400).json({ erro: 'Informe nome, identificador, tipo e localização.' })
  }

  const idNormalizado = id.trim()
  const duplicado = dispositivos.some((d) => d.id.toLowerCase() === idNormalizado.toLowerCase())

  if (duplicado) {
    return res.status(409).json({ erro: 'Já existe um dispositivo com esse identificador.' })
  }

  const novoDispositivo = { nome: nome.trim(), id: idNormalizado, tipo: tipo.trim(), local: local.trim() }
  dispositivos.push(novoDispositivo)
  res.status(201).json(novoDispositivo)
})

app.put('/dispositivos/:id', (req, res) => {
  const idAtual = req.params.id
  const { nome, tipo, local } = req.body

  if (!nome || !tipo || !local) {
    return res.status(400).json({ erro: 'Informe nome, tipo e localização.' })
  }

  const indice = dispositivos.findIndex((d) => d.id === idAtual)
  if (indice === -1) {
    return res.status(404).json({ erro: 'Dispositivo não encontrado.' })
  }

  dispositivos[indice] = { ...dispositivos[indice], nome: nome.trim(), tipo: tipo.trim(), local: local.trim() }
  res.json(dispositivos[indice])
})

app.delete('/dispositivos/:id', (req, res) => {
  const id = req.params.id
  const existe = dispositivos.some((d) => d.id === id)

  if (!existe) {
    return res.status(404).json({ erro: 'Dispositivo não encontrado.' })
  }

  dispositivos = dispositivos.filter((d) => d.id !== id)
  res.status(204).send()
})

// Rota de envio de alerta via MQTT para o ESP32
app.post('/alerta', (req, res) => {
  const { alerta } = req.body

  const alertasPermitidos = ['temperatura', 'umidade', 'luminosidade', 'normal']

  if (!alertasPermitidos.includes(alerta)) {
    return res.status(400).json({ erro: 'Tipo de alerta inválido.' })
  }

  if (!clienteMQTT || !clienteMQTT.connected) {
    console.error('⚠️ Tentativa de envio de alerta, mas o MQTT não está conectado.')
    return res.status(503).json({
      erro: 'Broker MQTT indisponível ou IP da AWS não configurado no servidor.',
    })
  }

  const TOPICO_ALERTA = '/TEF/lamp001/cmd'
  
  // Publica no tópico de comando que o ESP32 escuta
  clienteMQTT.publish(TOPICO_ALERTA, `lamp001@${alerta}`, { qos: 0 }, (erro) => {
    if (erro) {
      console.error('❌ Erro ao publicar via MQTT:', erro.message)
      return res.status(500).json({ erro: 'Não foi possível enviar o alerta.' })
    }

    console.log(`📢 Alerta enviado via MQTT ao ESP32: lamp001@${alerta}`)
    res.json({ sucesso: true, alerta })
  })
})

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`)
})