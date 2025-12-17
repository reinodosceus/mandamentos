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
        const blogPosts = ref([]);
        const blogLoading = ref(false);
        
        // Dynamic Filters State
        const availableBlocks = ref([]);
        const availableTomos = ref([]);

        // Configuration
        // Updated URL to the new spreadsheet provided
        const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSxBhC6K7BQ01gz4_5uvGyhVaxMHAMXUVW4im-FqtAiKoudZEhBN5ebyX93w0xmAAB2yPe3uT1PhwYn/pub?output=csv';
        
        const RSS_URL = 'https://livrodosmandamentos.blogspot.com/feeds/posts/default?alt=rss'; 
        const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

        // Static Descriptions Database (to enhance dynamic filters)
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

        function isPositive(mpValue) {
            if (!mpValue) return true;
            const v = mpValue.toLowerCase();
            return v.includes('positivo') || v === 'p' || v.includes('obrigação');
        }

        // Data Fetching
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

                const id = getVal(['n° do mandamento', 'id', 'numero', 'nº do mandamento', 'mandamento', 'nº']);
                const rambam = getVal(['nº', 'rambam', 'numero rambam', 'nº rambam', 'ramban', 'ref rambam']);
                const mp = getVal(['m/p', 'tipo', 'p/n', 'modo', 'natureza']);
                const an = getVal(['a/n', 'atual', 'vigente', 'an']);
                const quem = getVal(['quem', 'sujeito', 'pessoa']);
                const onde = getVal(['onde', 'lugar', 'local']);
                
                const block = getVal(['bloco', 'categoria', 'assunto', 'tema', 'classificação']);
                const tomo = getVal(['tomo', 'livro', 'seção', 'secao', 'livro (rambam)']);

                const metaKeys = [
                    'n° do mandamento', 'id', 'numero', 'nº do mandamento', 'mandamento', 'nº',
                    'rambam', 'numero rambam', 'nº rambam', 'ramban', 'ref rambam',
                    'm/p', 'tipo', 'p/n', 'modo', 'natureza',
                    'a/n', 'atual', 'vigente', 'an',
                    'quem', 'sujeito', 'pessoa',
                    'onde', 'lugar', 'local',
                    'bloco', 'categoria', 'assunto', 'tema', 'classificação',
                    'tomo', 'livro', 'seção', 'secao', 'livro (rambam)'
                ];

                const content = keys
                    .filter(k => !metaKeys.includes(normalize(k)) && row[k]) // Only non-empty
                    .map(k => ({
                        label: k,
                        value: row[k]
                    }));

                return {
                    id: id || '?',
                    rambam: rambam || '-',
                    mp: mp || '-',
                    an: an || '-',
                    quem: quem || '-',
                    onde: onde || '-',
                    block: block ? block.trim() : 'Outros',
                    tomo: tomo ? tomo.trim() : 'Geral',
                    content: content,
                    type: mp
                };
            });

            commandments.value = processed;

            // Dynamically generate filters from data
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

        // Blog Fetching
        async function fetchBlog() {
            blogLoading.value = true;
            try {
                const response = await fetch(RSS2JSON_API + encodeURIComponent(RSS_URL));
                const data = await response.json();
                if (data.status === 'ok') {
                    blogPosts.value = data.items;
                }
            } catch (e) {
                console.error("Erro Blog:", e);
            } finally {
                blogLoading.value = false;
            }
        }

        // Charts
        let chartInstance1 = null;
        let chartInstance2 = null;

        function renderCharts() {
            setTimeout(() => {
                const ctx1 = document.getElementById('chartType');
                const ctx2 = document.getElementById('chartTomos');

                if (!ctx1 || !ctx2) return;

                if (chartInstance1) chartInstance1.destroy();
                if (chartInstance2) chartInstance2.destroy();

                const posCount = commandments.value.filter(c => isPositive(c.mp)).length;
                const negCount = commandments.value.length - posCount;

                chartInstance1 = new Chart(ctx1, {
                    type: 'doughnut',
                    data: {
                        labels: ['Positivos (Fazer)', 'Negativos (Não Fazer)'],
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

            }, 100);
        }

        watch(currentView, (newVal) => {
            if (newVal === 'graficos') {
                if (commandments.value.length === 0 && !loading.value) fetchData();
                else renderCharts();
            }
            if (newVal === 'blog' && blogPosts.value.length === 0) {
                fetchBlog();
            }
            if (newVal === 'lista' && commandments.value.length === 0 && !loading.value) {
                fetchData();
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
            activeMode,
            activeFilterList,
            selectedFilter,
            filteredCommandments,
            loading,
            errorMsg,
            fetchData,
            blogPosts,
            blogLoading,
            isPositive
        };
    }
}).mount('#app');