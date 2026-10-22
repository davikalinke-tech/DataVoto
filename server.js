const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. CONEXÃO E CRIAÇÃO DO BANCO DE DADOS SQLITE3
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao SQLite3:', err.message);
    } else {
        console.log('📦 Banco de dados SQLite3 (database.db) conectado com sucesso.');
    }
});

db.run(`
    CREATE TABLE IF NOT EXISTS respostas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        faixaEtaria TEXT,
        bairro TEXT,
        rotina TEXT,
        rendaFamiliar TEXT,
        moradores INTEGER,
        trabalhadores INTEGER,
        certezaVoto TEXT,
        pautas TEXT,
        dataEnvio DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// 2. ROTAS DA API (BACKEND)

// Salvar resposta no SQLite3
app.post('/api/respostas', (req, res) => {
    const data = req.body;
    const query = `
        INSERT INTO respostas 
        (faixaEtaria, bairro, rotina, rendaFamiliar, moradores, trabalhadores, certezaVoto, pautas) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const pautasString = Array.isArray(data.pautas) ? data.pautas.join(', ') : data.pautas;

    db.run(query, [
        data.faixaEtaria,
        data.bairro,
        data.rotina,
        data.rendaFamiliar,
        Number(data.moradores),
        Number(data.trabalhadores),
        data.certezaVoto,
        pautasString
    ], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({ message: 'Sucesso', id: this.lastID });
        }
    });
});

// Buscar respostas para o Painel Admin
app.get('/api/respostas', (req, res) => {
    db.all("SELECT * FROM respostas", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const formatado = rows.map(r => ({
                ...r,
                pautas: r.pautas ? r.pautas.split(', ') : []
            }));
            res.status(200).json(formatado);
        }
    });
});

// 3. INTERFACE APLICAÇÃO WEB COMPLETA (FRONTEND)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR" class="h-full bg-slate-50">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DataVotoCesf - Colégio Sagrada Família</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        cesf: { navy: '#0f172a', blue: '#1e3a8a', royal: '#2563eb', gold: '#d97706', amber: '#f59e0b' }
                    }
                }
            }
        }
    </script>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <style>
        .tab-content { display: none; }
        .tab-content.active { display: block; }
    </style>
</head>
<body class="flex flex-col min-h-screen text-slate-800 bg-slate-50 antialiased">

    <!-- HEADER INSTITUCIONAL -->
    <header class="bg-cesf-navy text-white shadow-lg sticky top-0 z-40 border-b-4 border-cesf-gold">
        <div class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="w-11 h-11 bg-cesf-blue border-2 border-cesf-amber rounded-xl flex items-center justify-center text-amber-400 font-extrabold text-xl">
                    <i class="fa-solid fa-square-poll-vertical text-2xl"></i>
                </div>
                <div>
                    <span class="font-extrabold text-xl md:text-2xl tracking-tight text-white">DataVoto<span class="text-amber-400">Cesf</span></span>
                    <p class="text-xs text-slate-300 font-medium">Colégio Sagrada Família &bull; Campo Largo / PR</p>
                </div>
            </div>

            <nav class="flex space-x-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
                <button id="btn-tab-form" onclick="switchTab('form')" class="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-cesf-royal text-white flex items-center gap-2">
                    <i class="fa-solid fa-clipboard-question"></i> Formulário
                </button>
                <button id="btn-tab-admin" onclick="switchTab('admin')" class="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-2">
                    <i class="fa-solid fa-chart-pie"></i> Painel Admin
                </button>
            </nav>
        </div>
    </header>

    <main class="flex-grow max-w-7xl w-full mx-auto px-4 py-8">

        <!-- TAB 1: FORMULÁRIO DE PESQUISA -->
        <section id="tab-form" class="tab-content active">
            <div class="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-4xl mx-auto p-6 sm:p-10 space-y-8">
                <div class="border-b pb-4">
                    <h1 class="text-2xl font-bold text-slate-900">Pesquisa Socioeconômica & Eleitoral</h1>
                    <p class="text-xs text-slate-500 mt-1">Coleta anônima de dados salva diretamente no banco SQLite3.</p>
                </div>

                <form id="pesquisaForm" class="space-y-6" onsubmit="handleFormSubmit(event)">
                    <!-- Perfil -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-semibold mb-2">Faixa Etária *</label>
                            <select id="faixaEtaria" required class="w-full rounded-xl border p-3 bg-slate-50 text-sm">
                                <option value="" disabled selected>Selecione...</option>
                                <option value="16-24 anos">16 a 24 anos</option>
                                <option value="25-39 anos">25 a 39 anos</option>
                                <option value="40-59 anos">40 a 59 anos</option>
                                <option value="60+ anos">60 anos ou mais</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Bairro de Campo Largo *</label>
                            <select id="bairro" required class="w-full rounded-xl border p-3 bg-slate-50 text-sm">
                                <option value="" disabled selected>Selecione...</option>
                                <option value="Centro">Centro</option>
                                <option value="Ferraria">Ferraria</option>
                                <option value="Itaqui">Itaqui</option>
                                <option value="Rondinha">Rondinha</option>
                                <option value="Água Clara">Água Clara</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Rotina *</label>
                            <select id="rotina" required class="w-full rounded-xl border p-3 bg-slate-50 text-sm">
                                <option value="" disabled selected>Selecione...</option>
                                <option value="Apenas Estuda">Apenas Estuda</option>
                                <option value="Apenas Trabalha">Apenas Trabalha</option>
                                <option value="Estuda e Trabalha">Estuda e Trabalha</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Renda Familiar *</label>
                            <select id="rendaFamiliar" required class="w-full rounded-xl border p-3 bg-slate-50 text-sm">
                                <option value="" disabled selected>Selecione...</option>
                                <option value="Até 1 SM">Até 1 salário mínimo</option>
                                <option value="1 a 3 SM">1 a 3 salários mínimos</option>
                                <option value="3 a 5 SM">3 a 5 salários mínimos</option>
                                <option value="Acima de 5 SM">Acima de 5 salários mínimos</option>
                            </select>
                        </div>
                    </div>

                    <!-- Números -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <div>
                            <label class="block text-sm font-semibold mb-2">Total de Moradores *</label>
                            <input type="number" id="moradores" min="1" max="20" required placeholder="Ex: 4" class="w-full rounded-xl border p-3 bg-slate-50 text-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Moradores Trabalhadores *</label>
                            <input type="number" id="trabalhadores" min="0" max="20" required placeholder="Ex: 2" class="w-full rounded-xl border p-3 bg-slate-50 text-sm">
                        </div>
                    </div>

                    <!-- Eleitoral & Pautas -->
                    <div class="pt-4 border-t space-y-4">
                        <label class="block text-sm font-semibold">Certeza do Voto *</label>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label class="flex items-center p-3 border rounded-xl bg-slate-50 text-xs font-semibold cursor-pointer">
                                <input type="radio" name="certezaVoto" value="Candidato Definido" required class="mr-2"> Candidato Definido
                            </label>
                            <label class="flex items-center p-3 border rounded-xl bg-slate-50 text-xs font-semibold cursor-pointer">
                                <input type="radio" name="certezaVoto" value="Indeciso" required class="mr-2"> Indeciso
                            </label>
                            <label class="flex items-center p-3 border rounded-xl bg-slate-50 text-xs font-semibold cursor-pointer">
                                <input type="radio" name="certezaVoto" value="Branco/Nulo" required class="mr-2"> Branco / Nulo
                            </label>
                        </div>

                        <label class="block text-sm font-semibold pt-2">Pautas Prioritárias *</label>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <label class="flex items-center p-2.5 border rounded-xl bg-slate-50 text-xs cursor-pointer"><input type="checkbox" name="pautas" value="Saúde Pública" class="mr-2"> Saúde Pública</label>
                            <label class="flex items-center p-2.5 border rounded-xl bg-slate-50 text-xs cursor-pointer"><input type="checkbox" name="pautas" value="Educação" class="mr-2"> Educação</label>
                            <label class="flex items-center p-2.5 border rounded-xl bg-slate-50 text-xs cursor-pointer"><input type="checkbox" name="pautas" value="Segurança" class="mr-2"> Segurança</label>
                            <label class="flex items-center p-2.5 border rounded-xl bg-slate-50 text-xs cursor-pointer"><input type="checkbox" name="pautas" value="Transporte" class="mr-2"> Transporte</label>
                            <label class="flex items-center p-2.5 border rounded-xl bg-slate-50 text-xs cursor-pointer"><input type="checkbox" name="pautas" value="Asfalto" class="mr-2"> Asfalto</label>
                            <label class="flex items-center p-2.5 border rounded-xl bg-slate-50 text-xs cursor-pointer"><input type="checkbox" name="pautas" value="Emprego" class="mr-2"> Emprego</label>
                        </div>
                    </div>

                    <button type="submit" class="w-full py-4 bg-cesf-royal text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-paper-plane"></i> Salvar Resposta no Banco SQLite3
                    </button>
                </form>
            </div>
        </section>

        <!-- TAB 2: PAINEL ADMINISTRATIVO -->
        <section id="tab-admin" class="tab-content">
            <!-- Autenticação -->
            <div id="admin-auth" class="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                <div class="text-center mb-6">
                    <i class="fa-solid fa-lock text-3xl text-cesf-royal mb-2"></i>
                    <h2 class="text-xl font-bold text-slate-900">Painel Restrito</h2>
                    <p class="text-xs text-slate-500">Senha padrão: <span class="font-bold text-cesf-royal">admin123</span></p>
                </div>
                <form onsubmit="autenticarAdmin(event)" class="space-y-4">
                    <input type="password" id="senhaAdmin" placeholder="Digite a senha..." required class="w-full rounded-xl border p-3 bg-slate-50 text-sm outline-none">
                    <button type="submit" class="w-full py-3 bg-cesf-royal text-white font-bold rounded-xl text-sm">Acessar Painel</button>
                </form>
            </div>

            <!-- Dashboard -->
            <div id="admin-dashboard" class="hidden space-y-8">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-2xl shadow border">
                        <span class="text-xs font-bold text-slate-400 uppercase">Total Amostral</span>
                        <div id="stat-total" class="text-3xl font-extrabold text-slate-900 mt-1">0</div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl shadow border">
                        <span class="text-xs font-bold text-slate-400 uppercase">Média Moradores</span>
                        <div id="stat-moradores" class="text-3xl font-extrabold text-blue-600 mt-1">0.0</div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl shadow border">
                        <span class="text-xs font-bold text-slate-400 uppercase">Média Trabalhadores</span>
                        <div id="stat-trabalhadores" class="text-3xl font-extrabold text-emerald-600 mt-1">0.0</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="bg-white p-6 rounded-2xl shadow border">
                        <h3 class="text-sm font-bold text-slate-700 mb-4">Certeza do Voto</h3>
                        <canvas id="chartVoto"></canvas>
                    </div>
                    <div class="bg-white p-6 rounded-2xl shadow border">
                        <h3 class="text-sm font-bold text-slate-700 mb-4">Pautas Prioritárias</h3>
                        <canvas id="chartPautas"></canvas>
                    </div>
                </div>
            </div>
        </section>

    </main>

    <script>
        let chartVotoInstance = null;
        let chartPautasInstance = null;

        function switchTab(tab) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tab).classList.add('active');
            
            if (tab === 'form') {
                document.getElementById('btn-tab-form').className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-cesf-royal text-white flex items-center gap-2';
                document.getElementById('btn-tab-admin').className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-2';
            } else {
                document.getElementById('btn-tab-admin').className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-cesf-royal text-white flex items-center gap-2';
                document.getElementById('btn-tab-form').className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-2';
            }
        }

        async function handleFormSubmit(e) {
            e.preventDefault();
            const pautasSelecionadas = Array.from(document.querySelectorAll('input[name="pautas"]:checked')).map(cb => cb.value);

            const novaResposta = {
                faixaEtaria: document.getElementById('faixaEtaria').value,
                bairro: document.getElementById('bairro').value,
                rotina: document.getElementById('rotina').value,
                rendaFamiliar: document.getElementById('rendaFamiliar').value,
                moradores: Number(document.getElementById('moradores').value),
                trabalhadores: Number(document.getElementById('trabalhadores').value),
                certezaVoto: document.querySelector('input[name="certezaVoto"]:checked').value,
                pautas: pautasSelecionadas
            };

            try {
                const response = await fetch('/api/respostas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novaResposta)
                });

                if (response.ok) {
                    alert('Resposta salva com sucesso no banco SQLite3!');
                    document.getElementById('pesquisaForm').reset();
                }
            } catch (err) {
                alert('Erro ao conectar com o banco de dados.');
            }
        }

        function autenticarAdmin(e) {
            e.preventDefault();
            if (document.getElementById('senhaAdmin').value === 'admin123') {
                document.getElementById('admin-auth').classList.add('hidden');
                document.getElementById('admin-dashboard').classList.remove('hidden');
                carregarDashboard();
            } else {
                alert('Senha incorreta!');
            }
        }

        async function carregarDashboard() {
            try {
                const response = await fetch('/api/respostas');
                const respostas = await response.json();

                document.getElementById('stat-total').innerText = respostas.length;

                if (respostas.length > 0) {
                    const totalMoradores = respostas.reduce((acc, curr) => acc + Number(curr.moradores), 0);
                    const totalTrabalhadores = respostas.reduce((acc, curr) => acc + Number(curr.trabalhadores), 0);
                    document.getElementById('stat-moradores').innerText = (totalMoradores / respostas.length).toFixed(1);
                    document.getElementById('stat-trabalhadores').innerText = (totalTrabalhadores / respostas.length).toFixed(1);
                }

                // Gráfico Certeza do Voto
                const votos = {};
                respostas.forEach(r => votos[r.certezaVoto] = (votos[r.certezaVoto] || 0) + 1);

                if (chartVotoInstance) chartVotoInstance.destroy();
                chartVotoInstance = new Chart(document.getElementById('chartVoto'), {
                    type: 'pie',
                    data: {
                        labels: Object.keys(votos),
                        datasets: [{ data: Object.values(votos), backgroundColor: ['#2563eb', '#f59e0b', '#ef4444'] }]
                    }
                });

                // Gráfico Pautas
                const pautas = {};
                respostas.forEach(r => {
                    if (Array.isArray(r.pautas)) {
                        r.pautas.forEach(p => pautas[p] = (pautas[p] || 0) + 1);
                    }
                });

                if (chartPautasInstance) chartPautasInstance.destroy();
                chartPautasInstance = new Chart(document.getElementById('chartPautas'), {
                    type: 'bar',
                    data: {
                        labels: Object.keys(pautas),
                        datasets: [{ label: 'Votos', data: Object.values(pautas), backgroundColor: '#0f172a' }]
                    }
                });
            } catch (err) {
                console.error(err);
            }
        }
    </script>
</body>
</html>
    `);
});

// 4. INICIALIZAÇÃO DO SERVIDOR
app.listen(PORT, () => {
    console.log(`🚀 Aplicação DataVotoCesf com SQLite3 rodando em: http://localhost:${PORT}`);
});