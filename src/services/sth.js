
const STH_URL = '/sth-api/STH/v1'

const headers = {
  'fiware-service': 'smart',
  'fiware-servicepath': '/',
}

async function buscarHistoricoAtributo(atributo) {
  const url =
    `${STH_URL}/contextEntities/type/Lamp/id/urn:ngsi-ld:Lamp:001/attributes/${atributo}?lastN=20`

  const resposta = await fetch(url, { headers })

  if (!resposta.ok) {
    throw new Error(
      `Erro ao consultar histórico de ${atributo}: ${resposta.status}`
    )
  }

  const dados = await resposta.json()

  const valores =
    dados.contextResponses?.[0]?.contextElement?.attributes?.[0]?.values ?? []

  return valores
    .map((item) => ({
      data: item.recvTime,
      valor: Number(item.attrValue),
    }))
    .filter((item) => item.data && Number.isFinite(item.valor))
    .sort((a, b) => new Date(a.data) - new Date(b.data))
}

export async function buscarHistorico() {
  const [temperatura, umidade, luminosidade] = await Promise.all([
    buscarHistoricoAtributo('temperature'),
    buscarHistoricoAtributo('humidity'),
    buscarHistoricoAtributo('luminosity'),
  ])

  return {
    temperatura,
    umidade,
    luminosidade,
  }
}
