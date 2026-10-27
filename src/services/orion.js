export async function buscarSensores() {
  const awsIp = localStorage.getItem('vinheria-aws-ip')
  if (!awsIp) {
    throw new Error('IP da AWS não configurado. Por favor, informe o IP no topo da página.')
  }

  const ORION_URL = `http://${awsIp}:1026`

  const headers = {
    'fiware-service': 'smart',
    'fiware-servicepath': '/',
  }

  const resposta = await fetch(
    `${ORION_URL}/v2/entities/urn:ngsi-ld:Lamp:001`,
    { headers }
  )

  if (!resposta.ok) {
    throw new Error(`Erro ao consultar Orion: ${resposta.status}`)
  }

  const entidade = await resposta.json()

  return {
    temperatura: entidade.temperature?.value ?? null,
    umidade: entidade.humidity?.value ?? null,
    luminosidade: entidade.luminosity?.value ?? null,
    estado: entidade.state?.value ?? 'desconhecido',
  }
}