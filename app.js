const { createApp, ref, computed, onMounted, watch } = Vue;

createApp({
    setup() {
        // State
        const currentView = ref('home');
        const mobileMenuOpen = ref(false);
        const activeMode = ref('blocos'); // 'blocos' or 'tomos'
        const selectedFilter = ref('');
        const commandments = ref([]);
        const loading = ref(false);
        const errorMsg = ref('');
        
        // Detail View State
        const selectedCommandment = ref(null);
        
        // Dynamic Filters State
        const availableBlocks = ref([]);
        const availableTomos = ref([]);

        // --- LEIS (As 4 Leis) State ---
        const leisBlocks = ref([]);
        const selectedLeiBlock = ref(null);
        const leisLoading = ref(false);
        const leisErrorMsg = ref('');

        // Configuration
        const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSxBhC6K7BQ01gz4_5uvGyhVaxMHAMXUVW4im-FqtAiKoudZEhBN5ebyX93w0xmAAB2yPe3uT1PhwYn/pub?output=csv';
        const LEIS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6pkB0ujNMhxo8ORrpX87kcrQ9B25VQcCn5K0PAyzmJOb1M1k62bXL0n1zoAbI8_9BhBVRctYfWbeB/pub?output=csv';

        // Static Descriptions Database
        const descriptionsDB = {
            'Deus': 'Mandamentos sobre a natureza divina e fé.',
            'Lei': 'Estudo e respeito à Torah.',
            'Sinais e Símbolos': 'Mezuzá, Tsitsit, Tefilin, etc.',
            'Oração e Benção': 'Vida de oração e gratidão.',
            'Amor e Fraternidade': 'Relações interpessoais.',
            'Gentios': 'Relação com as nações.',
            'Casamento, divórcio e Família': 'Estrutura familiar.',
            'Relações íntimas': 'Santidade no relacionamento.',
            'Dias Santos': 'Shabat e Festas.',
            'Alimentação': 'Kashrut e leis dietéticas.',
            'Atos de dignidade': 'Comportamento honrado.',
            'Funcionários, Servos e Escravos': 'Leis trabalhistas bíblicas.',
            'Votos, Promessas e Juramentos': 'Palavra e compromisso.',
            'Ano Sabático e Jubileu': 'Descanso da terra e economia.',
            'Tribunal e Processo Judicial': 'Justiça e julgamento.',
            'Danos e Prejuízos': 'Responsabilidade civil.',
            'Propriedade': 'Direitos de posse.',
            'Crimes': 'Delitos graves.',
            'Castigo e Restituição': 'Penalidades.',
            'Profecia': 'Verdadeiros e falsos profetas.',
            'Idolatria e Idólatras': 'Afastamento de deuses estranhos.',
            'Agricultura e Cuidado Animal': 'Trato com a criação.',
            'Roupas': 'Shatnez e vestimentas.',
            'Primogênito': 'Consagração dos primeiros.',
            'Sacerdotes e Levitas': 'Serviço sagrado.',
            'Ofertas, Dízimos e Impostos': 'Contribuições sagradas.',
            'Templo, Santuário e Objetos Sagrados': 'Local de habitação Divina.',
            'Sacrifício e Ofertas': 'Sistema sacrificial.',
            'Rito de Pureza e Impureza': 'Leis de Tahará.',
            'Leproso e Lepra': 'Tsaraat e purificação.',
            'Rei': 'Liderança de Israel.',
            'Nazireu': 'Votos especiais de santidade.',
            'Guerras': 'Conduta militar.',
            'Conhecimento (Mada)': 'Fundamentos da Torah.',
            'Amor (Ahavá)': 'Leis sobre o amor a Deus.',
            'Tempos (Zemanim)': 'Shabat e Festas.',
            'Mulheres (Nashim)': 'Casamento e família.',
            'Santidade (Kedushá)': 'Alimentos e pureza sexual.',
            'Compromissos (Haflaá)': 'Votos e juramentos.',
            'Sementes (Zeraim)': 'Leis agrícolas.',
            'Serviço (Avodá)': 'O Templo e oferendas.',
            'Sacrifícios (Korbanot)': 'Oferendas particulares.',
            'Pureza (Tahorá)': 'Pureza ritual.',
            'Danos (Nezikim)': 'Danos civis e criminais.',
            'Aquisição (Kinyan)': 'Compra e venda.',
            'Juízos (Mishpatim)': 'Leis civis.',
            'Juízes (Shoftim)': 'Tribunais, reis e guerras.'
        };

        // Logic
        const activeFilterList = computed(() => {
            return activeMode.value === 'blocos' ? availableBlocks.value : availableTomos.value;
        });

        const filteredCommandments = computed(() => {
            if (!selectedFilter.value) return [];
            return commandments.value.filter(cmd => {
                const target = activeMode.value === 'blocos' ? cmd.block : cmd.tomo;
                return target && target.trim() === selectedFilter.value;
            });
        });

        function selectMode(mode) {
            activeMode.value = mode;
            currentView.value = 'filtro';
        }

        function filterCommandments(filterName) {
            selectedFilter.value = filterName;
            currentView.value = 'lista';
        }

        function openDetail(cmd) {
            selectedCommandment.value = cmd;
            currentView.value = 'detalhe';
            window.scrollTo(0, 0);
        }

        // --- LEIS Logic ---
        function openLeiBlock(block) {
            selectedLeiBlock.value = block;
            currentView.value = 'leis_detalhe';
            window.scrollTo(0, 0);
        }

        function isPositive(mpValue) {
            if (!mpValue) return false;
            const v = mpValue.toLowerCase().trim();
            return v === 'm';
        }

        function formatLeiTitleHtml(title) {
            if (!title) return '';
            let html = title;
            // Replace arrows with icons
            // ↑ for UP (Elevação)
            html = html.replace(/↑/g, '<i class="fa-solid fa-arrow-up text-green-400 ml-2"></i>');
            // ↓ for DOWN (Queda/Baixo)
            html = html.replace(/↓/g, '<i class="fa-solid fa-arrow-down text-red-400 ml-2"></i>');
            return html;
        }

        // Data Fetching: Mandamentos
        async function fetchData() {
            loading.value = true;
            errorMsg.value = '';
            
            try {
                const response = await fetch(CSV_URL + '&t=' + Date.now());
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                
                const csvText = await response.text();
                
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function(results) {
                        if (results.data && results.data.length > 0) {
                            processData(results.data);
                        } else {
                            errorMsg.value = 'A planilha retornou vazia. Verifique a publicação no Google Sheets.';
                        }
                        loading.value = false;
                    },
                    error: function(err) {
                        console.error("Erro CSV Parse:", err);
                        errorMsg.value = 'Erro ao processar dados da planilha: ' + err.message;
                        loading.value = false;
                    }
                });
            } catch (error) {
                console.error("Erro Fetch:", error);
                errorMsg.value = 'Falha na conexão com a planilha. ' + error.message;
                loading.value = false;
            }
        }

        function processData(data) {
            const processed = data.map(row => {
                const keys = Object.keys(row);
                const normalize = k => k ? k.trim().toLowerCase() : '';
                
                const getVal = (candidates) => {
                    const key = keys.find(k => candidates.includes(normalize(k)));
                    return key ? row[key] : '';
                };

                // Identificadores e Títulos
                const rawId = getVal(['n° do mandamento', 'id', 'numero', 'nº do mandamento', 'nº', 'ordem']);
                const rawTitle = getVal(['mandamento', 'titulo', 'nome', 'descrição', 'assunto']);
                
                const id = rawId || '?';
                const title = rawTitle || (rawId ? `Mandamento ${rawId}` : 'Detalhes');

                const nr_geral = getVal(['n° geral', 'numero geral', 'nº geral', 'nr geral', 'geral', 'ordem']);
                const rambam = getVal(['nº', 'rambam', 'numero rambam', 'nº rambam', 'ramban', 'ref rambam']);
                const mp = getVal(['m/p', 'tipo', 'p/n', 'modo', 'natureza', 'b/m']);
                const an = getVal(['a/n', 'atual', 'vigente', 'an']);
                const quem = getVal(['quem', 'sujeito', 'pessoa']);
                const onde = getVal(['onde', 'lugar', 'local']);
                
                const ref_livro = getVal(['livro', 'livro bíblia', 'livro biblia', 'sefer']);
                const ref_text = getVal(['ref', 'referência', 'referencia', 'citação', 'citacao']);
                const ref_cap = getVal(['capítulo', 'capitulo', 'cap', 'cap.', 'c.', 'c', 'ch', 'chapter', 'perek', 'capitulos', 'capítulo bíblico', 'capitulo biblico']);
                const ref_ver = getVal(['versículo', 'versiculo', 'ver', 'vers', 'ver.', 'vers.', 'v.', 'v', 'verse', 'pasuk', 'versiculos', 'versículo bíblico', 'versiculo biblico']);
                
                const block = getVal(['bloco', 'categoria', 'assunto', 'tema', 'classificação']);
                const tomo = getVal(['tomo', 'livro (rambam)', 'seção', 'secao']);

                // Campos estruturais usados no cabeçalho
                const headerKeys = [
                    'n° do mandamento', 'id', 'numero', 'nº do mandamento', 'mandamento', 'nº',
                    'n° geral', 'numero geral', 'nº geral', 'nr geral', 'geral', 'ordem',
                    'rambam', 'numero rambam', 'nº rambam', 'ramban', 'ref rambam',
                    'm/p', 'tipo', 'p/n', 'modo', 'natureza', 'b/m',
                    'a/n', 'atual', 'vigente', 'an',
                    'quem', 'sujeito', 'pessoa',
                    'onde', 'lugar', 'local',
                    'bloco', 'categoria', 'assunto', 'tema', 'classificação',
                    'tomo', 'livro', 'seção', 'secao', 'livro (rambam)',
                    'capítulo', 'capitulo', 'cap', 'cap.', 'c.', 'c', 'ch', 'chapter', 'perek', 'capitulos', 'capítulo bíblico', 'capitulo biblico',
                    'versículo', 'versiculo', 'ver', 'vers', 'ver.', 'vers.', 'v.', 'v', 'verse', 'pasuk', 'versiculos', 'versículo bíblico', 'versiculo biblico',
                    'referência', 'livro bíblia', 'ref', 'livro biblia', 'sefer', 'referencia', 'citação', 'citacao'
                ];

                const hiddenInListKeys = [
                    'comentario', 'comentário', 'brit hadasha', 'brit', 'brit_hadasha', 'novo testamento',
                    'comentario de rambam', 'comentário de rambam', 'comentario rambam', 'comentário rambam'
                ];

                const detailContent = keys
                    .filter(k => !headerKeys.includes(normalize(k)) && row[k]) 
                    .map(k => ({
                        label: k,
                        value: row[k]
                    }));

                const listContent = detailContent.filter(item => 
                    !hiddenInListKeys.includes(normalize(item.label))
                );

                return {
                    id: id,
                    title: title,
                    nr_geral: nr_geral || '-',
                    rambam: rambam || '-',
                    mp: mp || '-',
                    an: an || '-',
                    quem: quem || '-',
                    onde: onde || '-',
                    ref_livro: ref_livro || '',
                    ref_text: ref_text || '',
                    ref_cap: ref_cap || '',
                    ref_ver: ref_ver || '',
                    block: block ? block.trim() : 'Outros',
                    tomo: tomo ? tomo.trim() : 'Geral',
                    content: listContent,
                    detailContent: detailContent,
                    type: mp
                };
            });

            commandments.value = processed;

            const uniqueBlocks = [...new Set(processed.map(c => c.block).filter(b => b))].sort();
            const uniqueTomos = [...new Set(processed.map(c => c.tomo).filter(t => t))].sort();

            availableBlocks.value = uniqueBlocks.map(title => ({
                title,
                desc: descriptionsDB[title] || 'Categoria temática de mandamentos.'
            }));

            availableTomos.value = uniqueTomos.map(title => ({
                title,
                desc: descriptionsDB[title] || 'Livro da Mishneh Torah.'
            }));
            
            if (currentView.value === 'graficos') renderCharts();
        }

        // Data Fetching: Leis
        async function fetchLeisData() {
            leisLoading.value = true;
            leisErrorMsg.value = '';
            
            try {
                // Cache bust
                const response = await fetch(LEIS_CSV_URL + '&t=' + Date.now());
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                
                const csvText = await response.text();
                
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function(results) {
                        try {
                            if (results.data && results.data.length > 0) {
                                processLeisData(results.data);
                            } else {
                                leisErrorMsg.value = 'A planilha de Leis está vazia ou não pôde ser lida.';
                            }
                        } catch (e) {
                            console.error("Erro no processamento de Leis:", e);
                            leisErrorMsg.value = 'Erro ao estruturar dados: ' + e.message;
                        } finally {
                            leisLoading.value = false;
                        }
                    },
                    error: function(err) {
                        console.error("Erro CSV Leis:", err);
                        leisErrorMsg.value = 'Erro ao processar Leis: ' + err.message;
                        leisLoading.value = false;
                    }
                });
            } catch (error) {
                console.error("Erro Fetch Leis:", error);
                leisErrorMsg.value = 'Falha ao carregar Leis: ' + error.message;
                leisLoading.value = false;
            }
        }

        function processLeisData(data) {
            // Robust normalization for header matching
            const normalize = str => {
                if (!str) return '';
                return str.toString()
                          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                          .toLowerCase()
                          .replace(/&/g, 'e') 
                          .replace(/\+/g, 'e')
                          .replace(/['"´`]/g, '') // Removes quotes for D'us -> dus
                          .replace(/[^a-z0-9]/g, "");
            };

            const blocks = [];
            
            if (data.length > 0) {
                const csvKeys = Object.keys(data[0]);
                
                // Identify Column D (index 3) for Title
                // Safe access in case sheet is smaller, though unlikely for this task
                const titleKey = csvKeys.length > 3 ? csvKeys[3] : null;
                
                // Themes expected by the user (Display Titles)
                const targetThemes = [
                    "D'us", "Leis", "Sinais & Simbolos", "Orações", "Amor", "Gentios", 
                    "Família", "Relações Proíbidas", "Dias Santos", "Alimentação", 
                    "Dignidade", "Servos", "Promessas", "Shemitá e Jubileu", "Tribunal", 
                    "Prejuizos", "Propriedade", "Crimes", "Castigo/Restituição", 
                    "Profecia", "Idolatria", "Agricultura", "Roupas", "Primogênito", 
                    "Levitas", "Ofertas", "Templo", "Sacrifícios", "Pureza", 
                    "Lepra", "Rei", "Nazireu", "Guerras"
                ];

                targetThemes.forEach(themeDisplay => {
                    const themeKeyNorm = normalize(themeDisplay);
                    
                    // Find matching key in CSV headers using robust matching
                    const exactKey = csvKeys.find(k => {
                        const kNorm = normalize(k);
                        return kNorm === themeKeyNorm || 
                               (kNorm.includes(themeKeyNorm) && themeKeyNorm.length > 3) ||
                               (themeKeyNorm.includes(kNorm) && kNorm.length > 3);
                    });

                    if (exactKey) {
                        // Collect rows for this column
                        const rows = [];
                        data.forEach(row => {
                            const val = row[exactKey];
                            // Capture the Title from Column D for this specific row
                            const titleVal = titleKey ? row[titleKey] : '';

                            if (val && typeof val === 'string' && val.trim().length > 0) {
                                rows.push({ 
                                    title: titleVal ? titleVal.trim() : '',
                                    content: [{
                                        label: 'Ensino',
                                        value: val.trim(),
                                        showLabel: false,
                                        isRef: false
                                    }]
                                });
                            }
                        });

                        if (rows.length > 0) {
                            blocks.push({
                                title: themeDisplay,
                                rows: rows,
                                count: rows.length
                            });
                        }
                    }
                });
            }
            
            if (blocks.length === 0) {
                const foundKeys = data.length > 0 ? Object.keys(data[0]).slice(0, 5).join(', ') + '...' : 'nenhuma';
                leisErrorMsg.value = `Nenhum bloco de Lei foi encontrado. As colunas da planilha não corresponderam aos temas. Colunas detectadas: ${foundKeys}`;
            } else {
                leisBlocks.value = blocks;
            }
        }

        // Charts Logic
        let chartInstance1 = null;
        let chartInstance2 = null;
        let chartInstance3 = null;
        let chartInstance4 = null;

        function renderCharts() {
            setTimeout(() => {
                const ctx1 = document.getElementById('chartType');
                const ctx2 = document.getElementById('chartTomos');
                const ctx3 = document.getElementById('chartQuem');
                const ctx4 = document.getElementById('chartOnde');

                // Chart 1: Boas vs Más Obras (Positivo vs Negativo)
                if (ctx1) {
                    if (chartInstance1) chartInstance1.destroy();
                    const posCount = commandments.value.filter(c => isPositive(c.mp)).length;
                    const negCount = commandments.value.length - posCount;

                    chartInstance1 = new Chart(ctx1, {
                        type: 'doughnut',
                        data: {
                            labels: ['Boas Obras (M)', 'Más Obras (P)'],
                            datasets: [{
                                data: [posCount, negCount],
                                backgroundColor: ['#d4af37', '#1e1b4b'],
                                borderColor: '#ffffff',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            plugins: { legend: { labels: { color: 'white' } } }
                        }
                    });
                }

                // Chart 2: Distribuição por Tomos (Existing)
                if (ctx2) {
                    if (chartInstance2) chartInstance2.destroy();
                    const tomoCounts = {};
                    commandments.value.forEach(c => {
                        const t = c.tomo || 'Outros';
                        tomoCounts[t] = (tomoCounts[t] || 0) + 1;
                    });
                    
                    const sortedTomos = Object.entries(tomoCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);

                    chartInstance2 = new Chart(ctx2, {
                        type: 'bar',
                        data: {
                            labels: sortedTomos.map(i => i[0]),
                            datasets: [{ 
                                label: 'Top 5 Tomos',
                                data: sortedTomos.map(i => i[1]),
                                backgroundColor: 'rgba(212, 175, 55, 0.6)',
                                borderColor: '#d4af37',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            scales: {
                                y: { beginAtZero: true, ticks: { color: 'gray' } },
                                x: { ticks: { color: 'gray' } }
                            },
                            plugins: { legend: { labels: { color: 'white' } } }
                        }
                    });
                }

                // Chart 3: Quem (Homens, Mulheres, Ambos)
                if (ctx3) {
                    if (chartInstance3) chartInstance3.destroy();
                    
                    let counts = { 'Homens': 0, 'Mulheres': 0, 'Ambos': 0 };

                    commandments.value.forEach(c => {
                        const t = c.quem ? c.quem.toLowerCase() : '';
                        if (t.includes('ambos') || t.includes('todos') || t.includes('israel') || t.includes('povo') || t.includes('cada um')) {
                            counts['Ambos']++;
                        } else if (t.includes('mulher') || t.includes('esposa')) {
                            counts['Mulheres']++;
                        } else if (t.includes('homem') || t.includes('sacerdote') || t.includes('judeu') || t.includes('marido') || t.includes('pai')) {
                            counts['Homens']++;
                        } else {
                            counts['Ambos']++; // Default
                        }
                    });

                    chartInstance3 = new Chart(ctx3, {
                        type: 'pie',
                        data: {
                            labels: ['Homens', 'Mulheres', 'Ambos'],
                            datasets: [{ 
                                data: [counts['Homens'], counts['Mulheres'], counts['Ambos']],
                                backgroundColor: ['#3b82f6', '#ec4899', '#d4af37'],
                                borderColor: '#ffffff',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            plugins: { 
                                legend: { 
                                    labels: { color: 'white' },
                                    position: 'bottom'
                                } 
                            }
                        }
                    });
                }

                // Chart 4: Onde (Locais de Cumprimento)
                if (ctx4) {
                    if (chartInstance4) chartInstance4.destroy();
                    
                    const counts = {};
                    commandments.value.forEach(c => {
                        let t = c.onde ? c.onde.trim() : 'Não informado';
                        // Normalização simples
                        t = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
                        if (t === '-' || t === '') t = 'Não informado';
                        
                        counts[t] = (counts[t] || 0) + 1;
                    });

                    // Ordenar por quantidade e pegar Top 6
                    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 6);

                    chartInstance4 = new Chart(ctx4, {
                        type: 'bar',
                        data: {
                            labels: sorted.map(i => i[0]),
                            datasets: [{ 
                                label: 'Mandamentos',
                                data: sorted.map(i => i[1]),
                                backgroundColor: 'rgba(16, 185, 129, 0.6)', // Emerald Green
                                borderColor: '#10b981',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            indexAxis: 'y', // Barras horizontais para facilitar leitura de nomes de lugares
                            scales: {
                                y: { ticks: { color: 'gray' } },
                                x: { beginAtZero: true, ticks: { color: 'gray' } }
                            },
                            plugins: { legend: { display: false } }
                        }
                    });
                }

            }, 100);
        }

        watch(currentView, (newVal) => {
            if (newVal === 'graficos') {
                if (commandments.value.length === 0 && !loading.value) fetchData();
                else renderCharts();
            }
            if (newVal === 'lista' && commandments.value.length === 0 && !loading.value) {
                fetchData();
            }
            if (newVal === 'leis' && leisBlocks.value.length === 0 && !leisLoading.value) {
                fetchLeisData();
            }
        });

        onMounted(() => {
            fetchData();
        });

        return {
            currentView,
            mobileMenuOpen,
            selectMode,
            filterCommandments,
            openDetail,
            selectedCommandment,
            activeMode,
            activeFilterList,
            selectedFilter,
            filteredCommandments,
            loading,
            errorMsg,
            fetchData,
            isPositive,
            // Leis Exports
            leisBlocks,
            selectedLeiBlock,
            openLeiBlock,
            leisLoading,
            leisErrorMsg,
            formatLeiTitleHtml
        };
    }
}).mount('#app');