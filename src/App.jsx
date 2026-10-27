import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buscarSensores } from './services/orion'
import { buscarHistorico } from './services/sth'
import './App.css'

const URL_BACKEND = 'http://localhost:3001/alerta'
const URL_DISPOSITIVOS = 'http://localhost:3001/dispositivos'

const NOME_EMPRESA_PADRAO = 'Vinheria'
const RAIO_ANEL = 74
const CIRCUNFERENCIA_ANEL = 2 * Math.PI * RAIO_ANEL

const limitesPadrao = {
  temperatura: { minimo: 10, maximo: 25 },
  umidade: { minimo: 40, maximo: 70 },
  luminosidade: { minimo: 0, maximo: 60 },
}

const dispositivoInicial = {
  nome: '',
  id: '',
  tipo: 'ESP32',
  local: '',
}

const configuracoesSensores = [
  {
    chave: 'temperatura',
    titulo: 'Temperatura',
    rotulo: 'Temp.',
    unidade: '°C',
    cor: '#ff6b4a',
    icone: 'termometro',
  },
  {
    chave: 'umidade',
    titulo: 'Umidade',
    rotulo: 'Umid.',
    unidade: '%',
    cor: '#2f6bff',
    icone: 'gota',
  },
  {
    chave: 'luminosidade',
    titulo: 'Luminosidade',
    rotulo: 'Luz',
    unidade: '',
    cor: '#e0a416',
    icone: 'sol',
  },
]

const CHAVE_TODOS = 'todos'

const opcoesGrafico = [
  ...configuracoesSensores.map(({ chave, rotulo, titulo }) => ({
    chave,
    rotulo,
    titulo,
  })),
  { chave: CHAVE_TODOS, rotulo: 'Todos', titulo: 'Todos os sensores' },
]

const icones = {
  busca: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  usuario: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" />
    </>
  ),
  editar: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  lixeira: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alerta: (
    <>
      <path d="M12 3 2 20h20Z" />
      <path d="M12 10v4M12 17.5v.01" />
    </>
  ),
  traco: <path d="M6 12h12" />,
  termometro: <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" />,
  gota: <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11Z" />,
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  cima: <path d="m6 15 6-6 6 6" />,
  baixo: <path d="m6 9 6 6 6-6" />,
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>
  ),
  risco: (
    <>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  relatorio: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </>
  ),
}

function Icone({ nome, tamanho = 20 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icones[nome]}
    </svg>
  )
}

function LogoMarca() {
  return (
    <svg className="brand-logo" viewBox="0 0 58 58" aria-hidden="true">
      <circle cx="29" cy="29" r="29" fill="#2f6bff" />
      <path
        d="M29 13.5 36 20.5 29 27.5 22 20.5ZM22 27.5 29 34.5 22 41.5 15 34.5ZM36 27.5 43 34.5 36 41.5 29 34.5Z"
        fill="#fff"
      />
    </svg>
  )
}

function carregarLimites() {
  try {
    const salvos = localStorage.getItem('vinheria-limites')
    return salvos
      ? { ...limitesPadrao, ...JSON.parse(salvos) }
      : { ...limitesPadrao }
  } catch {
    return { ...limitesPadrao }
  }
}

function carregarNomeEmpresa() {
  try {
    const salvo = localStorage.getItem('vinheria-empresa')
    return salvo && salvo.trim() ? salvo.trim() : NOME_EMPRESA_PADRAO
  } catch {
    return NOME_EMPRESA_PADRAO
  }
}

function obterIniciais(nome) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

function formatarNumero(valor) {
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function formatarDuracao(ms) {
  if (!ms || ms <= 0) return '0 min'
  const segundos = Math.floor(ms / 1000)
  const minutos = Math.floor(segundos / 60)
  const horas = Math.floor(minutos / 60)
  if (horas > 0) return `${horas}h ${minutos % 60}min`
  if (minutos > 0) return `${minutos} min`
  return `${segundos} seg`
}

function prepararGrafico(dados) {
  return dados.map((item) => ({
    hora: new Date(item.data).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    valor: item.valor,
    dataCompleta: new Date(item.data).toLocaleString('pt-BR'),
  }))
}

function combinarHistorico(historico) {
  const mapa = new Map()
  for (const { chave } of configuracoesSensores) {
    for (const item of historico[chave] ?? []) {
      const data = new Date(item.data)
      const instante = Math.floor(data.getTime() / 1000)
      const ponto = mapa.get(instante) ?? {
        instante,
        hora: data.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        dataCompleta: data.toLocaleString('pt-BR'),
      }
      ponto[chave] = item.valor
      mapa.set(instante, ponto)
    }
  }
  return [...mapa.values()].sort((a, b) => a.instante - b.instante)
}

async function enviarAlerta(alerta) {
  try {
    const resposta = await fetch(URL_BACKEND, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alerta }),
    })
    if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`)
    return true
  } catch (error) {
    console.error('Erro ao enviar alerta ao ESP32:', error)
    return false
  }
}

function BalaoGrafico({ active, payload, unidade }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="chart-bubble">
      <strong>
        {formatarNumero(item.valor)}
        {unidade}
      </strong>
      <span>{item.dataCompleta}</span>
    </div>
  )
}

function GraficoHistorico({ chave, dados, unidade, cor }) {
  const dadosGrafico = useMemo(() => prepararGrafico(dados), [dados])
  if (dadosGrafico.length === 0) {
    return <p className="chart-empty">Aguardando medições históricas...</p>
  }
  const valores = dadosGrafico.map((item) => item.valor)
  const maximo = Math.max(...valores)
  const minimo = Math.min(...valores)
  const media = valores.reduce((soma, valor) => soma + valor, 0) / valores.length
  const pontoMaximo = dadosGrafico.find((item) => item.valor === maximo)
  const pontoMinimo = dadosGrafico.find((item) => item.valor === minimo)
  const idGradiente = `gradiente-${chave}`

  return (
    <>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dadosGrafico} margin={{ top: 28, right: 14, left: 14, bottom: 0 }}>
            <defs>
              <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cor} stopOpacity={0.28} />
                <stop offset="100%" stopColor={cor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#9aa0b4' }} tickLine={false} axisLine={false} minTickGap={36} />
            <YAxis hide domain={([min, max]) => {
              const folga = (max - min) * 0.18 || 1
              return [min - folga, max + folga]
            }} />
            <Tooltip content={<BalaoGrafico unidade={unidade} />} cursor={{ stroke: cor, strokeOpacity: 0.35, strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="valor" stroke={cor} strokeWidth={3} fill={`url(#${idGradiente})`} dot={false} activeDot={{ r: 7, fill: '#fff', stroke: cor, strokeWidth: 3 }} connectNulls />
            {pontoMaximo && <ReferenceDot x={pontoMaximo.hora} y={pontoMaximo.valor} r={7} fill="#fff" stroke="#ff6b6b" strokeWidth={3} />}
            {pontoMinimo && pontoMinimo !== pontoMaximo && <ReferenceDot x={pontoMinimo.hora} y={pontoMinimo.valor} r={7} fill="#fff" stroke="#8b5cf6" strokeWidth={3} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footer">
        <ul className="chart-legend">
          <li><i className="legend-max" />Maior valor: {formatarNumero(maximo)}{unidade}</li>
          <li><i className="legend-min" />Menor valor: {formatarNumero(minimo)}{unidade}</li>
        </ul>
        <div className="chart-average">
          <strong>{formatarNumero(media)}<span>{unidade}</span></strong>
          <p>Média das medições</p>
        </div>
      </div>
    </>
  )
}

function BalaoCombinado({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="chart-bubble combined">
      <span>{item.dataCompleta}</span>
      {configuracoesSensores.map(({ chave, titulo, unidade, cor }) =>
        item[chave] === undefined || item[chave] === null ? null : (
          <div className="bubble-row" key={chave}>
            <i style={{ background: cor }} />
            {titulo}
            <strong>{formatarNumero(item[chave])}{unidade}</strong>
          </div>
        ),
      )}
    </div>
  )
}

function GraficoCombinado({ historico }) {
  const dadosGrafico = useMemo(() => combinarHistorico(historico), [historico])
  if (dadosGrafico.length === 0) {
    return <p className="chart-empty">Aguardando medições históricas...</p>
  }
  const medias = configuracoesSensores.map((sensor) => {
    const valores = (historico[sensor.chave] ?? []).map((item) => item.valor)
    return {
      ...sensor,
      media: valores.length ? valores.reduce((soma, valor) => soma + valor, 0) / valores.length : null,
    }
  })

  return (
    <>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dadosGrafico} margin={{ top: 28, right: 14, left: 14, bottom: 0 }}>
            <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#9aa0b4' }} tickLine={false} axisLine={false} minTickGap={36} />
            {configuracoesSensores.map(({ chave }) => (
              <YAxis key={chave} yAxisId={chave} hide domain={([min, max]) => {
                const folga = (max - min) * 0.18 || 1
                return [min - folga, max + folga]
              }} />
            ))}
            <Tooltip content={<BalaoCombinado />} cursor={{ stroke: '#9aa0b4', strokeOpacity: 0.4, strokeDasharray: '4 4' }} />
            {configuracoesSensores.map(({ chave, cor }) => (
              <Line key={chave} yAxisId={chave} type="monotone" dataKey={chave} stroke={cor} strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#fff', stroke: cor, strokeWidth: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footer">
        <ul className="chart-legend">
          {medias.map(({ chave, titulo, unidade, cor, media }) => (
            <li key={chave}><i style={{ background: cor }} />{titulo}: {media === null ? '--' : `média ${formatarNumero(media)}${unidade}`}</li>
          ))}
        </ul>
        <p className="chart-note">Cada linha usa a própria escala, então a altura não compara sensores diferentes.</p>
      </div>
    </>
  )
}

function App() {
  const [awsIpInput, setAwsIpInput] = useState(() => localStorage.getItem('vinheria-aws-ip') || '')
  const [awsIpConfigurado, setAwsIpConfigurado] = useState(() => localStorage.getItem('vinheria-aws-ip') || '')
  const [mensagemAws, setMensagemAws] = useState('')

  const [sensores, setSensores] = useState({
    temperatura: null,
    umidade: null,
    luminosidade: null,
    estado: 'desconhecido',
  })

  const [historico, setHistorico] = useState({
    temperatura: [],
    umidade: [],
    luminosidade: [],
  })

  const [limites, setLimites] = useState(carregarLimites)
  const [erro, setErro] = useState('')
  const [erroHistorico, setErroHistorico] = useState('')
  const [mensagemLimites, setMensagemLimites] = useState('')

  const [nomeEmpresa, setNomeEmpresa] = useState(carregarNomeEmpresa)
  const [editandoEmpresa, setEditandoEmpresa] = useState(false)
  const [rascunhoEmpresa, setRascunhoEmpresa] = useState('')
  const [erroEmpresa, setErroEmpresa] = useState('')

  const [sensorGrafico, setSensorGrafico] = useState('temperatura')
  const [busca, setBusca] = useState('')

  const [dispositivos, setDispositivos] = useState([])
  const [carregandoDispositivos, setCarregandoDispositivos] = useState(true)
  const [formularioDispositivo, setFormularioDispositivo] = useState({ ...dispositivoInicial })
  const [dispositivoEditando, setDispositivoEditando] = useState(null)
  const [mensagemDispositivos, setMensagemDispositivos] = useState('')
  const [erroDispositivos, setErroDispositivos] = useState('')

  const ultimoAlertaEnviado = useRef(null)

  // Sincroniza automaticamente o IP salvo no localStorage com o back-end ao iniciar
  useEffect(() => {
    const savedIp = localStorage.getItem('vinheria-aws-ip')
    if (savedIp) {
      fetch('http://localhost:3001/config-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: savedIp }),
      }).catch(console.error)
    }
  }, [])

  async function aplicarAwsIp(e) {
    e.preventDefault()
    const ip = awsIpInput.trim()
    if (!ip) {
      setMensagemAws('Informe um IP válido.')
      return
    }
    try {
      const resposta = await fetch('http://localhost:3001/config-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.erro || 'Erro ao configurar IP')

      localStorage.setItem('vinheria-aws-ip', ip)
      setAwsIpConfigurado(ip)
      setMensagemAws('IP configurado com sucesso!')
      setTimeout(() => setMensagemAws(''), 3000)
    } catch (err) {
      setMensagemAws('Erro ao configurar IP no backend: ' + err.message)
    }
  }

  useEffect(() => {
    if (!awsIpConfigurado) return
    let ativo = true

    async function atualizarSensores() {
      try {
        const dados = await buscarSensores()
        if (ativo) {
          setSensores(dados)
          setErro('')
        }
      } catch (error) {
        if (ativo) {
          setErro('Não foi possível carregar os dados dos sensores. Verifique o IP da AWS.')
        }
        console.error(error)
      }
    }

    atualizarSensores()
    const intervalo = setInterval(atualizarSensores, 5000)

    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [awsIpConfigurado])

  useEffect(() => {
    if (!awsIpConfigurado) return
    let ativo = true

    async function atualizarHistorico() {
      try {
        const dados = await buscarHistorico()
        if (ativo) {
          setHistorico(dados)
          setErroHistorico('')
        }
      } catch (error) {
        if (ativo) {
          setErroHistorico('Não foi possível carregar o histórico.')
        }
        console.error(error)
      }
    }

    atualizarHistorico()
    const intervalo = setInterval(atualizarHistorico, 5000)

    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [awsIpConfigurado])

  useEffect(() => {
    localStorage.setItem('vinheria-limites', JSON.stringify(limites))
  }, [limites])

  useEffect(() => {
    try {
      localStorage.setItem('vinheria-empresa', nomeEmpresa)
    } catch (error) {
      console.error('Erro ao salvar empresa:', error)
    }
    document.title = `${nomeEmpresa} · Monitoramento IoT`
  }, [nomeEmpresa])

  useEffect(() => {
    let ativo = true

    async function carregarDispositivos() {
      try {
        const resposta = await fetch(URL_DISPOSITIVOS)
        if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`)
        const dados = await resposta.json()
        if (ativo) {
          setDispositivos(dados)
          setErroDispositivos('')
        }
      } catch (error) {
        if (ativo) {
          setErroDispositivos('Não foi possível carregar os dispositivos do backend.')
        }
        console.error(error)
      } finally {
        if (ativo) setCarregandoDispositivos(false)
      }
    }

    carregarDispositivos()
    return () => { ativo = false }
  }, [])

  function formatarValor(valor) {
    return valor === null || valor === undefined ? '--' : valor
  }

  function verificarAlerta(chave) {
    const valor = sensores[chave]
    const limite = limites[chave]

    if (
      valor === null ||
      valor === undefined ||
      !Number.isFinite(Number(valor)) ||
      !limite ||
      limite.minimo === '' ||
      limite.maximo === '' ||
      !Number.isFinite(Number(limite.minimo)) ||
      !Number.isFinite(Number(limite.maximo)) ||
      Number(limite.minimo) >= Number(limite.maximo)
    ) {
      return null
    }

    if (Number(valor) <= Number(limite.minimo)) {
      return { ativo: true, mensagem: `Atingiu ou ficou abaixo do mínimo (${limite.minimo})` }
    }
    if (Number(valor) >= Number(limite.maximo)) {
      return { ativo: true, mensagem: `Atingiu ou ultrapassou o máximo (${limite.maximo})` }
    }
    return { ativo: false, mensagem: 'Dentro dos limites' }
  }

  function posicaoNaFaixa(chave) {
    if (verificarAlerta(chave) === null) return null
    const { minimo, maximo } = limites[chave]
    const posicao = ((Number(sensores[chave]) - Number(minimo)) / (Number(maximo) - Number(minimo))) * 100
    return Math.min(100, Math.max(0, Math.round(posicao)))
  }

  useEffect(() => {
    if (!awsIpConfigurado) return
    const leiturasValidas = configuracoesSensores.every(({ chave }) => {
      const valor = sensores[chave]
      return valor !== null && valor !== undefined && Number.isFinite(Number(valor))
    })

    if (!leiturasValidas) return

    const ativos = configuracoesSensores.filter(({ chave }) => verificarAlerta(chave)?.ativo)
    const alertaAtual = ativos[0]?.chave ?? 'normal'

    if (alertaAtual === ultimoAlertaEnviado.current) return

    let cancelado = false
    async function atualizarAlertaRemoto() {
      const enviado = await enviarAlerta(alertaAtual)
      if (enviado && !cancelado) {
        ultimoAlertaEnviado.current = alertaAtual
      }
    }

    atualizarAlertaRemoto()
    return () => { cancelado = true }
  }, [sensores, limites, awsIpConfigurado])

  const indiceRisco = useMemo(() => {
    let temCritico = false
    let temAtencao = false
    let temDadosValidos = false
    const detalhes = []

    for (const { chave, titulo, unidade } of configuracoesSensores) {
      const valor = sensores[chave]
      const limite = limites[chave]

      if (valor === null || valor === undefined || !Number.isFinite(Number(valor)) || !limite) {
        detalhes.push({ chave, titulo, status: 'indisponivel', mensagem: 'Dados indisponíveis' })
        continue
      }

      temDadosValidos = true
      const v = Number(valor)
      const min = Number(limite.minimo)
      const max = Number(limite.maximo)
      const faixa = max - min
      const margem = faixa > 0 ? faixa * 0.1 : 1

      if (v < min || v > max) {
        temCritico = true
        detalhes.push({
          chave,
          titulo,
          status: 'critico',
          valor: v,
          unidade,
          limiteMin: min,
          limiteMax: max,
          mensagem: v < min ? `Abaixo do limite mínimo (${min}${unidade})` : `Acima do limite máximo (${max}${unidade})`,
        })
      } else if (v <= min + margem || v >= max - margem) {
        temAtencao = true
        detalhes.push({
          chave,
          titulo,
          status: 'atenção',
          valor: v,
          unidade,
          limiteMin: min,
          limiteMax: max,
          mensagem: `Próximo ao limite (${min} – ${max}${unidade})`,
        })
      } else {
        detalhes.push({
          chave,
          titulo,
          status: 'normal',
          valor: v,
          unidade,
          limiteMin: min,
          limiteMax: max,
          mensagem: 'Dentro dos limites',
        })
      }
    }

    let nivel = 'normal'
    if (!awsIpConfigurado || !temDadosValidos) nivel = 'indisponivel'
    else if (temCritico) nivel = 'critico'
    else if (temAtencao) nivel = 'atenção'

    return { nivel, detalhes }
  }, [sensores, limites, awsIpConfigurado])

  const relatorioExposicao = useMemo(() => {
    const resultado = {}
    const INTERVALO_MAXIMO_MS = 15 * 60 * 1000

    for (const { chave } of configuracoesSensores) {
      const lista = historico[chave] ?? []
      const limite = limites[chave]

      if (!lista.length || !limite || limite.minimo === '' || limite.maximo === '') {
        resultado[chave] = { tempoDentroMs: 0, tempoForaMs: 0, percentualDentro: null, ocorrencias: 0, valido: false }
        continue
      }

      const min = Number(limite.minimo)
      const max = Number(limite.maximo)
      let tempoDentroMs = 0, tempoForaMs = 0, ocorrencias = 0, estadoAnteriorFora = null, amostrasValidas = 0

      for (let i = 0; i < lista.length - 1; i++) {
        const atual = lista[i], proximo = lista[i + 1]
        const t1 = new Date(atual.data).getTime(), t2 = new Date(proximo.data).getTime()
        const duracao = t2 - t1

        if (isNaN(t1) || isNaN(t2) || duracao <= 0 || duracao > INTERVALO_MAXIMO_MS) continue

        amostrasValidas++
        const val = atual.valor
        const fora = val < min || val > max

        if (fora) {
          tempoForaMs += duracao
          if (estadoAnteriorFora === false || estadoAnteriorFora === null) ocorrencias++
          estadoAnteriorFora = true
        } else {
          tempoDentroMs += duracao
          estadoAnteriorFora = false
        }
      }

      const tempoTotal = tempoDentroMs + tempoForaMs
      const percentualDentro = tempoTotal > 0 ? Math.round((tempoDentroMs / tempoTotal) * 100) : null

      resultado[chave] = { tempoDentroMs, tempoForaMs, percentualDentro, ocorrencias, valido: amostrasValidas > 0 }
    }
    return resultado
  }, [historico, limites])

  const relatorioCondicoes = useMemo(() => {
    const resultado = {}
    for (const { chave } of configuracoesSensores) {
      const lista = historico[chave] ?? []
      const valoresValidos = lista.map((item) => Number(item.valor)).filter((v) => Number.isFinite(v))

      if (valoresValidos.length === 0) {
        resultado[chave] = { minimo: null, maximo: null, media: null, quantidade: 0 }
        continue
      }

      const min = Math.min(...valoresValidos)
      const max = Math.max(...valoresValidos)
      const soma = valoresValidos.reduce((acc, v) => acc + v, 0)
      const media = soma / valoresValidos.length

      resultado[chave] = { minimo: min, maximo: max, media, quantidade: valoresValidos.length }
    }
    return resultado
  }, [historico])

  function alterarLimite(chave, campo, valor) {
    setLimites((atuais) => ({
      ...atuais,
      [chave]: { ...atuais[chave], [campo]: valor === '' ? '' : Number(valor) },
    }))
    setMensagemLimites('')
  }

  function salvarLimites() {
    const invalidos = configuracoesSensores.some(({ chave }) => {
      const limite = limites[chave]
      return limite.minimo === '' || limite.maximo === '' || !Number.isFinite(limite.minimo) || !Number.isFinite(limite.maximo) || limite.minimo >= limite.maximo
    })

    if (invalidos) {
      setMensagemLimites('Verifique os valores: o mínimo deve ser menor que o máximo.')
      return
    }
    localStorage.setItem('vinheria-limites', JSON.stringify(limites))
    setMensagemLimites('Limites salvos com sucesso.')
  }

  function restaurarLimites() {
    setLimites({
      temperatura: { ...limitesPadrao.temperatura },
      umidade: { ...limitesPadrao.umidade },
      luminosidade: { ...limitesPadrao.luminosidade },
    })
    setMensagemLimites('Limites padrão restaurados.')
  }

  function iniciarEdicaoEmpresa() {
    setRascunhoEmpresa(nomeEmpresa)
    setErroEmpresa('')
    setEditandoEmpresa(true)
    document.getElementById('perfil')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function salvarEmpresa(event) {
    event.preventDefault()
    const nome = rascunhoEmpresa.trim().replace(/\s+/g, ' ')
    if (!nome) {
      setErroEmpresa('Informe o nome da empresa.')
      return
    }
    setNomeEmpresa(nome)
    setEditandoEmpresa(false)
    setErroEmpresa('')
  }

  function cancelarEdicaoEmpresa() {
    setEditandoEmpresa(false)
    setErroEmpresa('')
  }

  function alterarCampoDispositivo(event) {
    const { name, value } = event.target
    setFormularioDispositivo((atual) => ({ ...atual, [name]: value }))
    setErroDispositivos('')
    setMensagemDispositivos('')
  }

  async function salvarDispositivo(event) {
    event.preventDefault()
    const nome = formularioDispositivo.nome.trim()
    const id = formularioDispositivo.id.trim()
    const tipo = formularioDispositivo.tipo.trim()
    const local = formularioDispositivo.local.trim()

    if (!nome || !id || !tipo || !local) {
      setErroDispositivos('Preencha todos os campos do dispositivo.')
      setMensagemDispositivos('')
      return
    }

    const idDuplicado = dispositivos.some(
      (dispositivo) => dispositivo.id.toLowerCase() === id.toLowerCase() && dispositivo.id !== dispositivoEditando,
    )

    if (idDuplicado) {
      setErroDispositivos('Já existe um dispositivo com esse identificador.')
      setMensagemDispositivos('')
      return
    }

    const editando = dispositivoEditando !== null
    const url = editando ? `${URL_DISPOSITIVOS}/${encodeURIComponent(dispositivoEditando)}` : URL_DISPOSITIVOS
    const metodo = editando ? 'PUT' : 'POST'

    try {
      const resposta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, id, tipo, local }),
      })
      const dados = resposta.status === 204 ? null : await resposta.json()
      if (!resposta.ok) throw new Error(dados?.erro || `Erro HTTP ${resposta.status}`)

      if (editando) {
        setDispositivos((atuais) => atuais.map((d) => (d.id === dispositivoEditando ? dados : d)))
        setMensagemDispositivos('Dispositivo atualizado com sucesso.')
      } else {
        setDispositivos((atuais) => [...atuais, dados])
        setMensagemDispositivos('Dispositivo cadastrado com sucesso.')
      }
      setFormularioDispositivo({ ...dispositivoInicial })
      setDispositivoEditando(null)
      setErroDispositivos('')
    } catch (error) {
      setErroDispositivos(error.message || 'Não foi possível salvar o dispositivo.')
      setMensagemDispositivos('')
    }
  }

  function editarDispositivo(dispositivo) {
    setFormularioDispositivo({
      nome: dispositivo.nome,
      id: dispositivo.id,
      tipo: dispositivo.tipo,
      local: dispositivo.local,
    })
    setDispositivoEditando(dispositivo.id)
    setErroDispositivos('')
    setMensagemDispositivos('')
    document.getElementById('formulario-dispositivo')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function cancelarEdicaoDispositivo() {
    setFormularioDispositivo({ ...dispositivoInicial })
    setDispositivoEditando(null)
    setErroDispositivos('')
    setMensagemDispositivos('')
  }

  function abrirCadastroDispositivo() {
    cancelarEdicaoDispositivo()
    document.getElementById('formulario-dispositivo')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    document.getElementById('campo-nome')?.focus({ preventScroll: true })
  }

  async function excluirDispositivo(dispositivo) {
    const confirmou = window.confirm(`Deseja realmente excluir o dispositivo "${dispositivo.nome}"?`)
    if (!confirmou) return

    try {
      const resposta = await fetch(`${URL_DISPOSITIVOS}/${encodeURIComponent(dispositivo.id)}`, { method: 'DELETE' })
      if (!resposta.ok) {
        const dados = await resposta.json()
        throw new Error(dados.erro || `Erro HTTP ${resposta.status}`)
      }
      setDispositivos((atuais) => atuais.filter((item) => item.id !== dispositivo.id))
      if (dispositivoEditando === dispositivo.id) cancelarEdicaoDispositivo()
      setMensagemDispositivos('Dispositivo excluído com sucesso.')
      setErroDispositivos('')
    } catch (error) {
      setErroDispositivos(error.message || 'Não foi possível excluir o dispositivo.')
      setMensagemDispositivos('')
    }
  }

  function enviarBusca(event) {
    event.preventDefault()
    document.getElementById('dispositivos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function moverSensorGrafico(passo) {
    const indice = opcoesGrafico.findIndex(({ chave }) => chave === sensorGrafico)
    const proximo = (indice + passo + opcoesGrafico.length) % opcoesGrafico.length
    setSensorGrafico(opcoesGrafico[proximo].chave)
  }

  const alertasAtivos = configuracoesSensores.filter(({ chave }) => verificarAlerta(chave)?.ativo)
  const sensoresComLeitura = configuracoesSensores.filter(({ chave }) => verificarAlerta(chave) !== null).length
  const sensoresNormais = configuracoesSensores.filter(({ chave }) => verificarAlerta(chave)?.ativo === false).length
  const conformidade = sensoresComLeitura ? Math.round((sensoresNormais / sensoresComLeitura) * 100) : 0

  const termoBusca = busca.trim().toLowerCase()
  const dispositivosFiltrados = termoBusca
    ? dispositivos.filter((d) => [d.nome, d.id, d.tipo, d.local].some((c) => String(c ?? '').toLowerCase().includes(termoBusca)))
    : dispositivos

  const configuracaoGrafico = configuracoesSensores.find(({ chave }) => chave === sensorGrafico)

  return (
    <div className="dashboard">
      <main className="main-content" id="inicio">
        
        <div className="aws-config-banner">
          <div>
            <h3><i className='bx bx-server'></i> Configuração do Servidor AWS / MQTT</h3>
            <p>{awsIpConfigurado ? `Conectado ao IP: ${awsIpConfigurado}` : 'Nenhum IP configurado (começa vazio). Informe o IP da AWS abaixo:'}</p>
            {mensagemAws && <div className="aws-msg" style={{ color: mensagemAws.includes('sucesso') ? '#d1e7dd' : '#ffc8c8' }}>{mensagemAws}</div>}
          </div>
          <form className="aws-config-form" onSubmit={aplicarAwsIp}>
            <input
              type="text"
              placeholder="Ex: 3.94.168.155"
              value={awsIpInput}
              onChange={(e) => setAwsIpInput(e.target.value)}
            />
            <button type="submit">Aplicar IP</button>
          </form>
        </div>

        <header className="topbar">
          <div className="brand">
            <LogoMarca />
            <div>
              <h1>Olá, {nomeEmpresa}</h1>
              <p>Visão geral do monitoramento da sua vinheria</p>
            </div>
          </div>

          <div className="topbar-actions">
            <form className="search-box" role="search" onSubmit={enviarBusca}>
              <Icone nome="busca" tamanho={20} />
              <input
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar dispositivos"
                aria-label="Buscar dispositivos"
              />
            </form>

            <button
              type="button"
              className="round-button"
              onClick={iniciarEdicaoEmpresa}
              aria-label="Editar perfil da empresa"
            >
              <Icone nome="usuario" tamanho={22} />
            </button>
          </div>
        </header>

        {erro && (
          <p className="banner-erro" role="alert">
            {erro}
          </p>
        )}

        {alertasAtivos.length > 0 && (
          <div className="alert-panel" role="alert">
            <h3>
              <Icone nome="alerta" tamanho={20} />
              Atenção: limites atingidos ou ultrapassados
            </h3>
            {alertasAtivos.map(({ chave, titulo, unidade }) => (
              <p key={chave}>
                <strong>{titulo}:</strong> {verificarAlerta(chave)?.mensagem}.
                Medição atual: {formatarValor(sensores[chave])}
                {unidade}
              </p>
            ))}
          </div>
        )}

        <section className="overview-grid" id="sensores">
          <article className="profile-card" id="perfil">
            <div className="profile-head">
              <h2>Perfil da empresa</h2>
              {!editandoEmpresa && (
                <button
                  type="button"
                  className="round-button small"
                  onClick={iniciarEdicaoEmpresa}
                  aria-label="Alterar nome da empresa"
                  title="Alterar nome da empresa"
                >
                  <Icone nome="editar" tamanho={17} />
                </button>
              )}
            </div>

            <div className="profile-avatar" aria-hidden="true">
              <svg className="avatar-ring" viewBox="0 0 160 160">
                <circle className="ring-track" cx="80" cy="80" r={RAIO_ANEL} />
                <circle
                  className="ring-value"
                  cx="80"
                  cy="80"
                  r={RAIO_ANEL}
                  transform="rotate(-90 80 80)"
                  style={{
                    stroke: alertasAtivos.length > 0 ? '#ff6b4a' : '#2f6bff',
                    strokeDasharray: CIRCUNFERENCIA_ANEL,
                    strokeDashoffset:
                      CIRCUNFERENCIA_ANEL * (1 - conformidade / 100),
                  }}
                />
              </svg>

              <span className="avatar-core">{obterIniciais(nomeEmpresa)}</span>

              <span
                className={`avatar-badge ${alertasAtivos.length > 0 ? 'badge-alert' : ''}`}
              >
                <Icone
                  nome={alertasAtivos.length > 0 ? 'alerta' : 'check'}
                  tamanho={16}
                />
              </span>
            </div>

            {editandoEmpresa ? (
              <form className="company-form" onSubmit={salvarEmpresa}>
                <label>
                  Nome da empresa
                  <input
                    type="text"
                    value={rascunhoEmpresa}
                    onChange={(event) => {
                      setRascunhoEmpresa(event.target.value)
                      setErroEmpresa('')
                    }}
                    placeholder="Ex.: Vinheria Bella Vita"
                    maxLength={60}
                    autoFocus
                  />
                </label>

                {erroEmpresa && (
                  <p className="company-error" role="alert">
                    {erroEmpresa}
                  </p>
                )}

                <div className="company-actions">
                  <button type="submit" className="btn-primary">
                    Salvar nome
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={cancelarEdicaoEmpresa}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-name">
                <h3>{nomeEmpresa}</h3>
                <p>
                  {sensoresComLeitura > 0
                    ? `Conformidade: ${conformidade}%`
                    : 'Aguardando leituras'}
                </p>
              </div>
            )}

            <ul className="profile-stats">
              <li>
                <span className="stat-value stat-blue">
                  <Icone nome="chip" tamanho={17} />
                  <span>{dispositivos.length}</span>
                </span>
                <span className="stat-label">dispositivos</span>
              </li>

              <li>
                <span className="stat-value stat-green">
                  <Icone nome="check" tamanho={17} />
                  <span>{sensoresNormais}</span>
                </span>
                <span className="stat-label">normais</span>
              </li>

              <li>
                <span className="stat-value stat-coral">
                  <Icone nome="alerta" tamanho={17} />
                  <span>{alertasAtivos.length}</span>
                </span>
                <span className="stat-label">alertas</span>
              </li>
            </ul>
          </article>

          {configuracoesSensores.map(({ chave, titulo, unidade, icone }) => {
            const alerta = verificarAlerta(chave)

            return (
              <article
                className={`sensor-card sensor-${chave} ${alerta?.ativo ? 'sensor-alert' : ''}`}
                key={chave}
              >
                <div className="sensor-top">
                  <div>
                    <h3 className="sensor-title">{titulo}</h3>
                    <span
                      className={`sensor-status ${alerta?.ativo ? 'status-alert' : ''}`}
                    >
                      {alerta
                        ? alerta.ativo
                          ? 'Alerta'
                          : 'Normal'
                        : 'Sem leitura'}
                    </span>
                  </div>

                  <span className="sensor-icon">
                    <Icone nome={icone} tamanho={22} />
                  </span>
                </div>

                <div className="sensor-bottom">
                  <p className="sensor-value">
                    {formatarValor(sensores[chave])}
                    {unidade && <span>{unidade}</span>}
                  </p>

                  <p className="sensor-description">
                    {alerta?.mensagem ?? 'Aguardando medição válida'}
                  </p>
                </div>
              </article>
            )
          })}

          <div className="connection-bar">
            <div>
              <h3>Sensores conectados</h3>
              <p>
                {sensoresComLeitura} de {configuracoesSensores.length} com
                leitura válida. Atualiza a cada 5 s.
              </p>
            </div>

            <div className="connection-right">
              <div className="tracker-icons" aria-hidden="true">
                <span style={{ color: '#ff6b4a' }}>
                  <Icone nome="termometro" tamanho={22} />
                </span>
                <span style={{ color: '#2f6bff' }}>
                  <Icone nome="gota" tamanho={22} />
                </span>
                <span style={{ color: '#e0a416' }}>
                  <Icone nome="sol" tamanho={22} />
                </span>
              </div>

              <span className={`system-status ${erro ? 'offline' : ''}`}>
                <span className="status-dot" />
                {erro ? 'Sem conexão' : 'Monitorando'}
              </span>
            </div>
          </div>
        </section>

        <section className="history-section" id="historico">
          <div className="section-heading">
            <div>
              <h2>
                <i className='bx bx-history' style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--azul)' }}></i>
                Histórico 
              </h2>
              <p>Medições registradas pelo STH-Comet</p>
            </div>

            <span className="pill">Últimas 20 medições</span>
          </div>

          {erroHistorico && (
            <p className="banner-erro" role="alert">
              {erroHistorico}
            </p>
          )}

          <div className="chart-body">
            <div
              className="sensor-selector"
              role="group"
              aria-label="Escolher sensor do gráfico"
            >
              <button
                type="button"
                className="selector-arrow"
                onClick={() => moverSensorGrafico(-1)}
                aria-label="Sensor anterior"
              >
                <Icone nome="cima" tamanho={20} />
              </button>

              {opcoesGrafico.map(({ chave, rotulo, titulo }) => (
                <button
                  key={chave}
                  type="button"
                  className={`selector-option ${chave === sensorGrafico ? 'selected' : ''}`}
                  onClick={() => setSensorGrafico(chave)}
                  aria-pressed={chave === sensorGrafico}
                  aria-label={titulo}
                  title={titulo}
                >
                  {rotulo}
                </button>
              ))}

              <button
                type="button"
                className="selector-arrow"
                onClick={() => moverSensorGrafico(1)}
                aria-label="Próximo sensor"
              >
                <Icone nome="baixo" tamanho={20} />
              </button>
            </div>

            <div className="chart-panel">
              {sensorGrafico === CHAVE_TODOS ? (
                <GraficoCombinado key={CHAVE_TODOS} historico={historico} />
              ) : (
                <GraficoHistorico
                  key={sensorGrafico}
                  chave={sensorGrafico}
                  dados={historico[sensorGrafico]}
                  unidade={configuracaoGrafico.unidade}
                  cor={configuracaoGrafico.cor}
                />
              )}
            </div>
          </div>
        </section>

        <section className="info-cardenciais diferenciais-section" id="indice-risco">
          <div className="info-card risk-card">
            <div className="risk-header-row">
              <div>
                <h2>Índice de risco</h2>
                <p>Classificação operacional baseada nos limites configurados</p>
              </div>

              <span className={`risk-badge risk-[{indiceRisco.nivel}`}>
                <Icone nome="risco" tamanho={18} />
                {indiceRisco.nivel === 'normal' && 'Normal'}
                {indiceRisco.nivel === 'atenção' && 'Atenção (Margem)'}
                {indiceRisco.nivel === 'critico' && 'Crítico'}
                {indiceRisco.nivel === 'indisponivel' && 'Indisponível'}
              </span>
            </div>

            <ul className="risk-details-list">
              {indiceRisco.detalhes.map(
                ({ chave, titulo, status, valor, unidade, mensagem }) => (
                  <li
                    key={chave}
                    className={`risk-detail-item ${status === 'critico' ? 'is-alert' : ''}`}
                  >
                    <div className="risk-detail-head">
                      <span>{titulo}</span>
                      <span
                        style={{
                          color:
                            status === 'critico'
                              ? 'var(--vermelho)'
                              : status === 'atenção'
                                ? 'var(--laranja)'
                                : 'var(--verde)',
                          fontWeight: 700,
                        }}
                      >
                        {status.toUpperCase()}
                      </span>
                    </div>

                    <div className="risk-detail-value">
                      {formatarValor(valor)}
                      {unidade}
                    </div>

                    <div className="risk-detail-msg">{mensagem}</div>
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        <div className="reports-grid">
          <article className="report-card" id="relatorio-exposicao">
            <h3>
              <Icone nome="relatorio" tamanho={20} />
              Relatório de exposição 
            </h3>
            <p style={{ color: 'var(--tinta-suave)', fontSize: '14px' }}>
              Tempo estimado fora dos limites nas amostras históricas
            </p>

            <div style={{ display: 'grid', gap: '14px', marginTop: '6px' }}>
              {configuracoesSensores.map(({ chave, titulo }) => {
                const exp = relatorioExposicao[chave] || {}
                return (
                  <div key={chave} className="report-stat-box">
                    <strong>{titulo}</strong>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        marginTop: '4px',
                      }}
                    >
                      <span>Dentro: {formatarDuracao(exp.tempoDentroMs)}</span>
                      <span>Fora: {formatarDuracao(exp.tempoForaMs)}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        color: 'var(--tinta-suave)',
                        marginTop: '2px',
                      }}
                    >
                      <span>Conformidade: {exp.percentualDentro !== null ? `${exp.percentualDentro}%` : '--'}</span>
                      <span>Ocorrências: {exp.ocorrencias ?? 0}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="report-note">
              * Calculado a partir dos timestamps reais das amostras do STH-Comet.
            </p>
          </article>

          <article className="report-card" id="relatorio-condicoes">
            <h3>
              <Icone nome="relatorio" tamanho={20} />
              Relatório de condições 
            </h3>
            <p style={{ color: 'var(--tinta-suave)', fontSize: '14px' }}>
              Estatísticas calculadas sobre o histórico de medições
            </p>

            <div style={{ display: 'grid', gap: '14px', marginTop: '6px' }}>
              {configuracoesSensores.map(({ chave, titulo, unidade }) => {
                const cond = relatorioCondicoes[chave] || {}
                return (
                  <div key={chave} className="report-stat-box">
                    <strong>{titulo}</strong>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '6px',
                        marginTop: '4px',
                        fontSize: '13px',
                      }}
                    >
                      <div>
                        <span>Mín:</span> <strong>{formatarValor(cond.minimo)}{unidade}</strong>
                      </div>
                      <div>
                        <span>Máx:</span> <strong>{formatarValor(cond.maximo)}{unidade}</strong>
                      </div>
                      <div>
                        <span>Média:</span> <strong>{formatarValor(cond.media !== null ? Math.round(cond.media * 10) / 10 : null)}{unidade}</strong>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="report-note">
              * Considera apenas valores numéricos válidos nas últimas amostras do histórico.
            </p>
          </article>
        </div>

        <section className="info-card settings-card" id="configuracoes">
          <h2>
            <i className='bx bx-slider-alt' style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--azul)' }}></i>
            Limites e alertas
          </h2>
          <p>Configure os valores mínimo e máximo aceitos para cada sensor.</p>

          <div className="limits-form">
            <div className="limit-groups">
              {configuracoesSensores.map(({ chave, titulo, unidade }) => (
                <fieldset key={chave} className="limit-fieldset">
                  <legend>{titulo}</legend>

                  <label>
                    Mínimo ({unidade || 'valor'})
                    <input
                      type="number"
                      value={limites[chave].minimo}
                      onChange={(event) =>
                        alterarLimite(chave, 'minimo', event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Máximo ({unidade || 'valor'})
                    <input
                      type="number"
                      value={limites[chave].maximo}
                      onChange={(event) =>
                        alterarLimite(chave, 'maximo', event.target.value)
                      }
                    />
                  </label>
                </fieldset>
              ))}
            </div>

            <div className="limit-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={salvarLimites}
              >
                Salvar limites
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={restaurarLimites}
              >
                Restaurar padrão
              </button>
            </div>

            {mensagemLimites && (
              <p role="status" className="limit-message">
                {mensagemLimites}
              </p>
            )}
          </div>
        </section>

        <footer>
          {nomeEmpresa} · Sistema de monitoramento
          <br />
          Estado do dispositivo: {sensores.estado}
        </footer>
      </main>

      <aside className="side-panel">
        <section className="side-section" id="dispositivos">
          <div className="side-heading">
            <div>
              <h2>
                <i className='bx bx-devices' style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--azul)' }}></i>
                Dispositivos
              </h2>
              <p>
                {dispositivos.length}{' '}
                {dispositivos.length === 1 ? 'dispositivo cadastrado' : 'dispositivos cadastrados'}
              </p>
            </div>

            <button
              type="button"
              className="round-button"
              onClick={abrirCadastroDispositivo}
              aria-label="Cadastrar novo dispositivo"
              title="Cadastrar novo dispositivo"
            >
              <Icone nome="mais" tamanho={22} />
            </button>
          </div>

          {carregandoDispositivos ? (
            <p className="muted">Carregando dispositivos...</p>
          ) : dispositivos.length === 0 ? (
            <div className="empty-state">
              <h3>Nenhum dispositivo cadastrado</h3>
              <p>Preencha o formulário abaixo para adicionar o primeiro dispositivo.</p>
            </div>
          ) : dispositivosFiltrados.length === 0 ? (
            <div className="empty-state">
              <h3>Nenhum resultado</h3>
              <p>Nenhum dispositivo corresponde a “{busca.trim()}”.</p>
            </div>
          ) : (
            <ul className="device-list">
              {dispositivosFiltrados.map((dispositivo) => (
                <li className="device-item" key={dispositivo.id}>
                  <div className="device-main">
                    <h3>{dispositivo.nome}</h3>
                    <p className="device-meta">
                      <span className="device-type">{dispositivo.tipo}</span>
                      {dispositivo.local}
                    </p>
                    <code className="device-id">{dispositivo.id}</code>
                  </div>

                  <div className="device-row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => editarDispositivo(dispositivo)}
                      aria-label={`Editar ${dispositivo.nome}`}
                      title="Editar"
                    >
                      <Icone nome="editar" tamanho={17} />
                    </button>

                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => excluirDispositivo(dispositivo)}
                      aria-label={`Excluir ${dispositivo.nome}`}
                      title="Excluir"
                    >
                      <Icone nome="lixeira" tamanho={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="info-card device-form-card">
            <h3>
              {dispositivoEditando !== null ? 'Editar dispositivo' : 'Cadastrar dispositivo'}
            </h3>

            <form
              id="formulario-dispositivo"
              className="device-form"
              onSubmit={salvarDispositivo}
            >
              <label>
                Nome do dispositivo
                <input
                  id="campo-nome"
                  name="nome"
                  type="text"
                  value={formularioDispositivo.nome}
                  onChange={alterarCampoDispositivo}
                  placeholder="Ex.: Sensor da adega"
                  maxLength={80}
                  required
                />
              </label>

              <label>
                Identificador único
                <input
                  name="id"
                  type="text"
                  value={formularioDispositivo.id}
                  onChange={alterarCampoDispositivo}
                  placeholder="Ex.: lamp001"
                  maxLength={100}
                  disabled={dispositivoEditando !== null}
                  required
                />
              </label>

              <label>
                Tipo de dispositivo
                <select
                  name="tipo"
                  value={formularioDispositivo.tipo}
                  onChange={alterarCampoDispositivo}
                  required
                >
                  <option value="ESP32">ESP32</option>
                  <option value="Sensor">Sensor</option>
                  <option value="Gateway">Gateway</option>
                  <option value="Outro">Outro</option>
                </select>
              </label>

              <label>
                Localização
                <input
                  name="local"
                  type="text"
                  value={formularioDispositivo.local}
                  onChange={alterarCampoDispositivo}
                  placeholder="Ex.: Adega principal"
                  maxLength={100}
                  required
                />
              </label>

              {erroDispositivos && (
                <p className="device-message device-error" role="alert">
                  {erroDispositivos}
                </p>
              )}

              {mensagemDispositivos && (
                <p className="device-message" role="status">
                  {mensagemDispositivos}
                </p>
              )}

              <div className="device-actions">
                <button type="submit" className="btn-primary">
                  {dispositivoEditando !== null ? 'Salvar alterações' : 'Cadastrar dispositivo'}
                </button>

                {dispositivoEditando !== null && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={cancelarEdicaoDispositivo}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            </form>
          </div>

          <p className="device-storage-note">
            Os dispositivos são gerenciados pelo backend. Atualmente, os registros ficam em memória e são apagados quando o servidor reinicia.
          </p>
        </section>

        <section className="side-section" id="faixas">
          <div className="side-heading">
            <div>
              <h2>
                <i className='bx bx-bar-chart-alt-2' style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--azul)' }}></i>
                Faixas dos sensores
              </h2>
              <p>Posição da leitura entre o mínimo e o máximo</p>
            </div>
          </div>

          <ul className="range-list">
            {configuracoesSensores.map(({ chave, titulo, unidade }) => {
              const alerta = verificarAlerta(chave)
              const posicao = posicaoNaFaixa(chave)

              return (
                <li className="range-row" key={chave}>
                  <div className="range-label">
                    <span>{titulo}</span>
                    <small>
                      {limites[chave].minimo} – {limites[chave].maximo}
                      {unidade}
                    </small>
                  </div>

                  <div className="range-bar">
                    <div
                      className={`range-fill ${alerta?.ativo ? 'is-alert' : ''}`}
                      style={{ width: `${posicao ?? 0}%` }}
                    />
                  </div>

                  <span className="range-value">
                    {posicao === null ? '--' : `${posicao}%`}
                  </span>

                  <span
                    className={`range-icon ${
                      alerta === null
                        ? ''
                        : alerta.ativo
                          ? 'icon-alert'
                          : 'icon-ok'
                    }`}
                  >
                    <Icone
                      nome={
                        alerta === null
                          ? 'traco'
                          : alerta.ativo
                            ? 'alerta'
                            : 'check'
                      }
                      tamanho={14}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </aside>
    </div>
  )
}

export default App