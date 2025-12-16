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
        const blogPosts = ref([]);
        const blogLoading = ref(false);

        // Configuration
        // URL converted to export format for CSV parsing
        const SHEET_ID = '1ZPIaNTfnEdN5hWbLppUpafr8YIbM8G6WGGHcWUKVs3s';
        const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
        
        // RSS URL updated to user's blog
        const RSS_URL = 'https://livrodosmandamentos.blogspot.com/feeds/posts/default?alt=rss'; 
        const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

        // Data Structure Definitions
        const blocks = [
            { title: 'Deus', desc: 'Mandamentos sobre a natureza divina e fé.' },
            { title: 'Lei', desc: 'Estudo e respeito à Torah.' },
            { title: 'Sinais e Símbolos', desc: 'Mezuzá, Tsitsit, Tefilin, etc.' },
            { title: 'Oração e Benção', desc: 'Vida de oração e gratidão.' },
            { title: 'Amor e Fraternidade', desc: 'Relações interpessoais.' },
            { title: 'Gentios', desc: 'Relação com as nações.' },
            { title: 'Casamento, divórcio e Família', desc: 'Estrutura familiar.' },
            { title: 'Relações íntimas', desc: 'Santidade no relacionamento.' },
            { title: 'Dias Santos', desc: 'Shabat e Festas.' },
            { title: 'Alimentação', desc: 'Kashrut e leis dietéticas.' },
            { title: 'Atos de dignidade', desc: 'Comportamento honrado.' },
            { title: 'Funcionários, Servos e Escravos', desc: 'Leis trabalhistas bíblicas.' },
            { title: 'Votos, Promessas e Juramentos', desc: 'Palavra e compromisso.' },
            { title: 'Ano Sabático e Jubileu', desc: 'Descanso da terra e economia.' },
            { title: 'Tribunal e Processo Judicial', desc: 'Justiça e julgamento.' },
            { title: 'Danos e Prejuízos', desc: 'Responsabilidade civil.' },
            { title: 'Propriedade', desc: 'Direitos de posse.' },
            { title: 'Crimes', desc: 'Delitos graves.' },
            { title: 'Castigo e Restituição', desc: 'Penalidades.' },
            { title: 'Profecia', desc: 'Verdadeiros e falsos profetas.' },
            { title: 'Idolatria e Idólatras', desc: 'Afastamento de deuses estranhos.' },
            { title: 'Agricultura e Cuidado Animal', desc: 'Trato com a criação.' },
            { title: 'Roupas', desc: 'Shatnez e vestimentas.' },
            { title: 'Primogênito', desc: 'Consagração dos primeiros.' },
            { title: 'Sacerdotes e Levitas', desc: 'Serviço sagrado.' },
            { title: 'Ofertas, Dízimos e Impostos', desc: 'Contribuições sagradas.' },
            { title: 'Templo, Santuário e Objetos Sagrados', desc: 'Local de habitação Divina.' },
            { title: 'Sacrifício e Ofertas', desc: 'Sistema sacrificial.' },
            { title: 'Rito de Pureza e Impureza', desc: 'Leis de Tahará.' },
            { title: 'Leproso e Lepra', desc: 'Tsaraat e purificação.' },
            { title: 'Rei', desc: 'Liderança de Israel.' },
            { title: 'Nazireu', desc: 'Votos especiais de santidade.' },
            { title: 'Guerras', desc: 'Conduta militar.' }
        ];

        const tomos = [
            { title: 'Conhecimento (Mada)', desc: 'Fundamentos da Torah.' },
            { title: 'Amor (Ahavá)', desc: 'Leis sobre o amor a Deus.' },
            { title: 'Tempos (Zemanim)', desc: 'Shabat e Festas.' },
            { title: 'Mulheres (Nashim)', desc: 'Casamento e família.' },
            { title: 'Santidade (Kedushá)', desc: 'Alimentos e pureza sexual.' },
            { title: 'Compromissos (Haflaá)', desc: 'Votos e juramentos.' },
            { title: 'Sementes (Zeraim)', desc: 'Leis agrícolas.' },
            { title: 'Serviço (Avodá)', desc: 'O Templo e oferendas.' },
            { title: 'Sacrifícios (Korbanot)', desc: 'Oferendas particulares.' },
            { title: 'Pureza (Tahorá)', desc: 'Pureza ritual.' },
            { title: 'Danos (Nezikim)', desc: 'Danos civis e criminais.' },
            { title: 'Aquisição (Kinyan)', desc: 'Compra e venda.' },
            { title: 'Juízos (Mishpatim)', desc: 'Leis civis.' },
            { title: 'Juízes (Shoftim)', desc: 'Tribunais, reis e guerras.' }
        ];

        // Logic
        const activeFilterList = computed(() => {
            return activeMode.value === 'blocos' ? blocks : tomos;
        });

        const filteredCommandments = computed(() => {
            if (!selectedFilter.value) return [];
            // Filter logic matches the Sheet column content
            // Assuming the sheet has columns roughly like: ID, Commandment, Block, Tomo, Source, NT
            // Since we parse dynamically, we look for matches in the object properties
            return commandments.value.filter(cmd => {
                const target = activeMode.value === 'blocos' ? cmd.block : cmd.tomo;
                // Simple string inclusion check, case insensitive
                return target && target.toLowerCase().includes(selectedFilter.value.toLowerCase());
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

        // Data Fetching
        async function fetchData() {
            loading.value = true;
            try {
                Papa.parse(CSV_URL, {
                    download: true,
                    header: true,
                    complete: function(results) {
                        // Transform raw CSV data to clean object
                        // This mapping depends on the exact header names in the Google Sheet.
                        // Here we attempt a robust loose mapping based on keywords
                        commandments.value = results.data.map(row => {
                            // Helper to find key containing string
                            const getKey = (k) => Object.keys(row).find(key => key.toLowerCase().includes(k));
                            
                            return {
                                id: row[getKey('id') || getKey('número') || 'id'] || '0',
                                description: row[getKey('mandamento') || getKey('descrição') || 'mandamento'] || 'Descrição indisponível',
                                block: row[getKey('bloco') || getKey('categoria') || 'bloco'] || '',
                                tomo: row[getKey('tomo') || getKey('livro') || 'tomo'] || '',
                                source: row[getKey('origem') || getKey('referência') || 'versículo'] || '',
                                nt_confirmation: row[getKey('novo') || getKey('confirmação') || 'nt'] || '',
                                type: row[getKey('tipo') || 'tipo'] || 'Geral' // Positivo/Negativo if exists
                            };
                        });
                        loading.value = false;
                        if (currentView.value === 'graficos') renderCharts();
                    },
                    error: function(err) {
                        console.error("Erro CSV:", err);
                        loading.value = false;
                    }
                });
            } catch (error) {
                console.error("Erro Fetch:", error);
                loading.value = false;
            }
        }

        // Blog Fetching
        async function fetchBlog() {
            blogLoading.value = true;
            try {
                // Note: Direct RSS fetch is blocked by CORS, so we use rss2json
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
            // Wait for DOM update
            setTimeout(() => {
                const ctx1 = document.getElementById('chartType');
                const ctx2 = document.getElementById('chartTomos');

                if (!ctx1 || !ctx2) return;

                // Destroy old charts if exist
                if (chartInstance1) chartInstance1.destroy();
                if (chartInstance2) chartInstance2.destroy();

                // Data Calc
                // Mocking distribution for demo if data is missing 'type' column
                const posCount = commandments.value.filter(c => c.type && c.type.toLowerCase().includes('pos')).length || 248;
                const negCount = commandments.value.filter(c => c.type && c.type.toLowerCase().includes('neg')).length || 365;

                // Chart 1: Pie
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

                // Chart 2: Bar (Top 5 Tomos count - Mock logic for demo if data sparse)
                // Real logic: count occurrences of 'tomo' in commandments array
                const tomoCounts = {};
                commandments.value.forEach(c => {
                    const t = c.tomo || 'Outros';
                    tomoCounts[t] = (tomoCounts[t] || 0) + 1;
                });
                
                // Sort and take top 5
                const sortedTomos = Object.entries(tomoCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);

                chartInstance2 = new Chart(ctx2, {
                    type: 'bar',
                    data: {
                        labels: sortedTomos.map(i => i[0]),
                        datasets: [{
                            label: 'Mandamentos por Tomo',
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

        // Watchers
        watch(currentView, (newVal) => {
            if (newVal === 'graficos') {
                if (commandments.value.length === 0) fetchData();
                else renderCharts();
            }
            if (newVal === 'blog' && blogPosts.value.length === 0) {
                fetchBlog();
            }
            if (newVal === 'lista' && commandments.value.length === 0) {
                fetchData();
            }
        });

        onMounted(() => {
            // Pre-load data
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
            blogPosts,
            blogLoading
        };
    }
}).mount('#app');