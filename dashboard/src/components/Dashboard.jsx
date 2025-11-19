import { useState, useEffect, useRef } from 'react'
import mqtt from 'mqtt'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Logo from './Logo'
import './Dashboard.css'

function Dashboard({ onLogout }) {
  const [sensorData, setSensorData] = useState({
    temp_ida: 0,
    temp_retorno: 0,
    deltaT: 0,
    vazao_L_s: 0,
    potencia_kW: 0,
    energia_kWh: 0
  })
  const [historyData, setHistoryData] = useState([])
  const [condominio, setCondominio] = useState('Condomínio Residencial Primavera')
  const [isConnected, setIsConnected] = useState(false)
  const [setpoint, setSetpoint] = useState(65)
  const clientRef = useRef(null)
  const maxHistoryPoints = 50 // Máximo de pontos no histórico

  useEffect(() => {
    // Detecta se a página está sendo servida via HTTPS e usa o protocolo apropriado
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
    const port = window.location.protocol === 'https:' ? '8884' : '8000'
    const brokerUrl = `${protocol}broker.hivemq.com:${port}/mqtt`
    
    const client = mqtt.connect(brokerUrl, {
      clientId: 'dashboard_' + Math.random().toString(16).substr(2, 8),
      reconnectPeriod: 5000,
      connectTimeout: 10000
    })

    clientRef.current = client

    client.on('connect', () => {
      console.log('Conectado ao broker MQTT')
      setIsConnected(true)
      client.subscribe('carolinepaz/sensores', (err) => {
        if (err) {
          console.error('Erro ao subscrever:', err)
        } else {
          console.log('Subscrito ao tópico: carolinepaz/sensores')
        }
      })
    })

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString())
        const processedData = {
          temp_ida: data.temp_ida === -127 ? 0 : data.temp_ida,
          temp_retorno: data.temp_retorno === -127 ? 0 : data.temp_retorno,
          deltaT: data.deltaT || 0,
          vazao_L_s: data.vazao_L_s || 0,
          potencia_kW: data.potencia_kW || 0,
          energia_kWh: data.energia_kWh || 0
        }
        
        setSensorData(processedData)
        
        // Adiciona ao histórico com timestamp
        const timestamp = new Date().toLocaleTimeString('pt-BR')
        const historyPoint = {
          time: timestamp,
          temp_ida: processedData.temp_ida,
          temp_retorno: processedData.temp_retorno,
          deltaT: processedData.deltaT,
          vazao: processedData.vazao_L_s,
          potencia: processedData.potencia_kW,
          energia: processedData.energia_kWh,
          gas: (processedData.potencia_kW * 0.1)
        }
        
        setHistoryData(prev => {
          const newData = [...prev, historyPoint]
          return newData.slice(-maxHistoryPoints) // Mantém apenas os últimos N pontos
        })
        
        console.log('Dados recebidos:', processedData)
      } catch (error) {
        console.error('Erro ao parsear JSON:', error)
      }
    })

    client.on('error', (error) => {
      console.error('Erro MQTT:', error)
      setIsConnected(false)
    })

    client.on('close', () => {
      console.log('Conexão MQTT fechada')
      setIsConnected(false)
    })

    return () => {
      if (client) {
        client.end()
      }
    }
  }, [])

  const consumoGas = (sensorData.potencia_kW * 0.1).toFixed(4)

  // Calcula vazão acumulada (soma de todas as vazões do histórico)
  // Assumindo intervalo de 5 segundos entre cada medição (conforme código Arduino)
  const intervaloMedicao = 5 // segundos
  const vazaoAcumulada = historyData.reduce((total, ponto) => {
    return total + (ponto.vazao * intervaloMedicao) // vazão em L/s * segundos = litros
  }, 0)

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <Logo />
          <div className="header-title-section">
            <h1>Dashboard Comgas</h1>
            <div className="connection-status">
              <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
              <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="condominio-selector">
            <label>Condomínio:</label>
            <select 
              value={condominio} 
              onChange={(e) => setCondominio(e.target.value)}
              className="condominio-select"
            >
              <option value="Condomínio Residencial Primavera">Condomínio Residencial Primavera</option>
              <option value="Condomínio Solar dos Pássaros">Condomínio Solar dos Pássaros</option>
              <option value="Condomínio Vista Alegre">Condomínio Vista Alegre</option>
              <option value="Condomínio Jardim das Flores">Condomínio Jardim das Flores</option>
            </select>
          </div>
          <button onClick={onLogout} className="logout-button">
            Sair
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Cards de valores principais */}
        <div className="kpi-cards">
          <div className="kpi-card">
            <div className="kpi-label">Temperatura de Entrada</div>
            <div className="kpi-value">{sensorData.temp_retorno.toFixed(1)}°C</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Temperatura de Saída</div>
            <div className="kpi-value">{sensorData.temp_ida.toFixed(1)}°C</div>
          </div>
          <div className="kpi-card highlight">
            <div className="kpi-label">Consumo de Gás Natural</div>
            <div className="kpi-value">{consumoGas} m³/h</div>
          </div>
          <div className="kpi-card highlight">
            <div className="kpi-label">Potência Térmica</div>
            <div className="kpi-value">{sensorData.potencia_kW.toFixed(2)} kW</div>
          </div>
          <div className="kpi-card highlight">
            <div className="kpi-label">Energia Acumulada</div>
            <div className="kpi-value">{sensorData.energia_kWh.toFixed(2)} kWh</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Vazão Acumulada</div>
            <div className="kpi-value">{(vazaoAcumulada / 1000).toFixed(2)} m³</div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="charts-grid">
          {/* Gráfico de Temperaturas */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Temperaturas ao Longo do Tempo</h3>
              <div className="chart-info">
                <span className="info-badge">Setpoint: {setpoint}°C</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorTempIda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007CB6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#007CB6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTempRetorno" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B2E3" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00B2E3" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                  label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #007CB6',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="temp_ida" 
                  name="Temperatura de Saída" 
                  stroke="#007CB6" 
                  fillOpacity={1} 
                  fill="url(#colorTempIda)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="temp_retorno" 
                  name="Temperatura de Entrada" 
                  stroke="#00B2E3" 
                  fillOpacity={1} 
                  fill="url(#colorTempRetorno)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Vazão */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Vazão de Água</h3>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                  label={{ value: 'Vazão (L/s)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #00B2A9',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="vazao" 
                  name="Vazão (L/s)" 
                  stroke="#00B2A9" 
                  strokeWidth={3}
                  dot={{ fill: '#00B2A9', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Potência e Energia */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Potência e Energia</h3>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorPotencia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7FC241" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#7FC241" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEnergia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFD600" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FFD600" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                  label={{ value: 'Potência (kW)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                  label={{ value: 'Energia (kWh)', angle: 90, position: 'insideRight' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #7FC241',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="potencia" 
                  name="Potência (kW)" 
                  stroke="#7FC241" 
                  fillOpacity={1} 
                  fill="url(#colorPotencia)"
                  strokeWidth={2}
                />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="energia" 
                  name="Energia (kWh)" 
                  stroke="#FFD600" 
                  fillOpacity={1} 
                  fill="url(#colorEnergia)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Consumo de Gás */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Consumo de Gás Natural</h3>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                  label={{ value: 'Consumo (m³/h)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #004B87',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="gas" 
                  name="Consumo de Gás (m³/h)" 
                  fill="#004B87"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Delta T */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Diferença de Temperatura (ΔT)</h3>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                  label={{ value: 'ΔT (°C)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #F89C1B',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="deltaT" 
                  name="ΔT (°C)" 
                  stroke="#F89C1B" 
                  strokeWidth={3}
                  dot={{ fill: '#F89C1B', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
