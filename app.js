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
        // New CSV URL from the published sheet
        const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQv4q3ANfmKZp4gG5NDG9LaY2l4d3o5-bKH5akeg2uBPd1MgKRQjCc0JW6DgFLYWJV0mfCIzolq4hqe/pub?output=csv';
        
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
            return commandments.value.filter(cmd => {
                const target = activeMode.value === 'blocos' ? cmd.block : cmd.tomo;
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

        function isPositive(mpValue) {
            if (!mpValue) return true;
            const v = mpValue.toLowerCase();
            return v.includes('positivo') || v === 'p' || v.includes('obrigação');
        }

        // Data Fetching
        async function fetchData() {
            loading.value = true;
            try {
                Papa.parse(CSV_URL, {
                    download: true,
                    header: true,
                    complete: function(results) {
                        commandments.value = results.data.map(row => {
                            // Normalize keys for easier finding
                            const keys = Object.keys(row);
                            const normalize = k => k.trim().toLowerCase();
                            const getVal = (candidates) => {
                                const key = keys.find(k => candidates.includes(normalize(k)));
                                return key ? row[key] : '';
                            };

                            // Map specific reference columns
                            const id = getVal(['n° do mandamento', 'id', 'numero', 'nº do mandamento']);
                            const rambam = getVal(['nº', 'rambam', 'numero rambam', 'nº rambam']);
                            const mp = getVal(['m/p', 'tipo', 'p/n']);
                            const an = getVal(['a/n', 'atual', 'vigente']);
                            const quem = getVal(['quem', 'sujeito', 'pessoa']);
                            const onde = getVal(['onde', 'lugar', 'local']);
                            
                            // Filter columns (Metadata for Logic)
                            const block = getVal(['bloco', 'categoria', 'assunto', 'tema']);
                            const tomo = getVal(['tomo', 'livro', 'seção']);

                            // Content columns (Everything else goes into boxes)
                            // We exclude the keys we already mapped to Metadata or Filters
                            const metaKeys = [
                                'n° do mandamento', 'id', 'numero', 'nº do mandamento',
                                'nº', 'rambam', 'numero rambam', 'nº rambam',
                                'm/p', 'tipo', 'p/n',
                                'a/n', 'atual', 'vigente',
                                'quem', 'sujeito', 'pessoa',
                                'onde', 'lugar', 'local',
                                'bloco', 'categoria', 'assunto', 'tema',
                                'tomo', 'livro', 'seção'
                            ];

                            const content = keys
                                .filter(k => !metaKeys.includes(normalize(k)))
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
                                block: block || '',
                                tomo: tomo || '',
                                content: content,
                                type: mp // For chart compatibility
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
            blogLoading,
            isPositive
        };
    }
}).mount('#app');