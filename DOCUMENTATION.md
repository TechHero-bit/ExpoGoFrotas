# DOCUMENTATION.md

## 1. Visão Geral do Projeto e Linguagens Utilizadas

**Descrição do Sistema**: 
O LogiTrack é um aplicativo voltado para a Gestão de Frotas e Tarefas. O sistema possui fluxos dedicados tanto para **Administradores** (que gerenciam veículos, usuários e delegam tarefas) quanto para **Motoristas** (que recebem tarefas, realizam jornadas, check-ins e check-outs de veículos em campo).

**Linguagens e Runtimes**:
- **TypeScript / JavaScript (ES6+)**: Utilizado no desenvolvimento de toda a lógica mobile através da biblioteca React e do framework Expo (React Native).
- **SQL (PostgreSQL)**: Utilizado para a definição de schemas, criação de tabelas, políticas de segurança RLS (Row Level Security), automações via triggers e consultas no backend Supabase.
- **Groovy / Kotlin**: Utilizado nos scripts de configuração de build nativo do ecossistema Android (como `build.gradle` e `settings.gradle` gerados na integração de módulos nativos).

---

## 2. Bibliotecas e Dependências Principais

O ecossistema do projeto foi construído utilizando as seguintes bibliotecas principais (mapeadas no `package.json`):

### Core & Framework
- **react (19.1.0) & react-native (0.81.5)**: O núcleo de renderização da interface mobile.
- **expo (~54.0.35)**: Framework em torno do React Native, facilitando o fluxo de build e simplificando o acesso a APIs nativas do dispositivo.

### Navegação
- **@react-navigation/native**: Gestão base de navegação e estado de rotas.
- **@react-navigation/stack**: Pilha de navegação (transições de tela encadeadas).
- **@react-navigation/bottom-tabs**: Navegação em abas, utilizada no dashboard principal do aplicativo.

### Backend & Banco de Dados
- **@supabase/supabase-js**: Cliente JavaScript oficial do Supabase para gerenciamento de sessão, autenticação, storage e queries de dados.

### Componentes de UI & Formatação
- **@react-native-community/datetimepicker**: Seleção nativa de data e hora limite para tarefas e agendamentos.
- **@expo/vector-icons**: Iconografia do app, provendo acesso a catálogos variados de ícones.
- **expo-status-bar / expo-system-ui**: Controle da aparência e visibilidade das barras de status do sistema operacional.

### Mapas e Geolocalização
- **@maplibre/maplibre-react-native**: Renderização performática de mapas vetoriais, exibição de tiles e marcações geoespaciais.
- **expo-location**: Acesso nativo à geolocalização do dispositivo (importante para rastreio, check-ins e exibição da posição atual).
- **@turf/helpers & @turf/length**: Bibliotecas de processamento geoespacial utilizadas para cálculos matemáticos e de topologia no mapa.

---

## 3. Processo de Compilação e Build Android (`./gradlew`)

O processo de transformação do código JavaScript em um arquivo instalável (APK/AAB) envolve múltiplas etapas:

### Metro Bundler
O Metro atua como o bundler (empacotador) do ecossistema React Native. Durante um build de release, o Metro minifica e empacota todos os arquivos de código JavaScript/TypeScript e recursos visuais (assets) em um único arquivo de bundle chamado `index.android.bundle`. Este bundle é embarcado nativamente e rodará na engine JS do aparelho (como o Hermes).

### Camada Nativa (Bridge/Fabric)
A comunicação entre o código JavaScript e a UI nativa do Android ocorre pela camada de interoperabilidade (Bridge / Fabric). O JavaScript instrui a engine nativa sobre quais elementos visuais devem ser desenhados (ex: botões, inputs), e os eventos físicos (como toques ou atualizações do GPS) são enviados de volta assincronamente ao JavaScript.

### Comandos de Build via CLI
Para gerar os binários a partir da pasta `android` gerada:
- **`./gradlew assembleRelease`**: Compila o código nativo integrando o bundle otimizado JS, gerando um APK de produção minificado e assinado para uso final.
- **`./gradlew assembleDebug`**: Gera um APK destinado a testes e desenvolvimento. Este APK não embarca obrigatoriamente o código final, mas busca se conectar ao Metro Bundler em execução (via porta 8081) para o fluxo de "Hot Reload".
- **`./gradlew clean`**: Limpa o diretório de arquivos compilados, forçando o gradle a resolver novamente os caches e dependências nativas ao re-compilar.

### Fluxo do Gradle
O Gradle analisa os arquivos `build.gradle`. Ele aciona o plugin do React Native e a funcionalidade de autolinking do Expo para buscar todas as dependências no diretório `node_modules` que possuam código nativo (Java/Kotlin/C++). Os módulos nativos são compilados e anexados à casca do aplicativo. O aplicativo é então assinado e os APKs finais são disponibilizados na pasta `app/build/outputs/apk/`.

---

## 4. Arquitetura do Banco de Dados (Supabase / PostgreSQL)

A base de dados foi modelada de forma relacional para suportar com eficiência a gestão de recursos.

### Tabela: tarefas
- **Campos**: `id` (serial), `titulo` (varchar), `descricao` (text), `status` (varchar), `localizacao` (varchar), `veiculo_id` (int4), `atribuido_a` (uuid), `agendado_em` (timestamptz), `data_limite` (timestamptz).
- **Máquina de estados**: O campo de status é gerido em estágios lógicos: *Pendente* ➔ *Em Andamento* ➔ *Finalizado / Interrompido*.

### Tabela: usuarios / profiles
- **auth.users**: Tabela restrita do Supabase que armazena os metadados de autenticação e senhas criptografadas.
- **usuarios (esquema public)**: Tabela contendo os dados estendidos vinculados ao UUID do usuário. Controla o nível de acesso (Admin ou Motorista). Há um *Trigger PostgreSQL* (`lidar_com_novo_usuario`) que espelha os novos registros do `auth.users` diretamente para a tabela `usuarios`.

### Tabela: veiculos, checkins, checkouts e jornadas
- **Jornadas**: Agregam veículos e motoristas num ciclo de viagem, com pontos de origem e destino e o registro exato dos horários.
- **Check-ins e Check-outs**: Processos vitais onde se inserem o nível de combustível, a quilometragem atualizada e as URI's das fotos comprobatórias. Mantêm relações de Foreign Key recursivas para fácil consulta no veículo de "qual foi o seu último check-in".

### Políticas de Segurança (RLS - Row Level Security)
O Supabase utiliza políticas ao nível de banco de dados (Policies) para blindar as requisições, filtrando os dados antes de chegarem à API:
- **Motoristas (Drivers)**: As políticas interceptam a chamada de requisição, comparando o ID do token de autenticação (`auth.uid()`) com os campos de associação (como `atribuido_a` em tarefas ou `motorista_id` em jornadas). Isso assegura que o motorista só leia ou altere as tarefas delegadas a ele.
- **Administradores (Admins)**: As políticas validam a coluna `role = 'admin'`. Quando atendida a condição, a política permite o acesso global (SELECT, UPDATE, INSERT, DELETE) a qualquer registro no sistema.

---

## 5. Integrações, APIs e Serviços

O projeto interage com as seguintes ferramentas para suprir dados dinâmicos:

### Supabase REST & Realtime API (PostgREST)
Toda a comunicação do banco relacional é feita via `supabase-js`, consumindo a API REST gerada automaticamente pelo motor PostgREST. A API abstrai o SQL e provê métodos para operações CRUD, integrados na camada de serviços do app.

### Supabase Auth API
Lida com as credenciais de usuários e o fluxo de renovação de tokens JWT (JSON Web Tokens). A sessão é mantida de forma assíncrona no aparelho local utilizando a biblioteca `@react-native-async-storage/async-storage`.

### API de Mapas e Geolocalização
- **Geocodificação (LocationIQ)**: O app consome a API REST da *LocationIQ* para converter endereços digitados em texto (ex: rua, bairro) em coordenadas espaciais válidas (`latitude` e `longitude`).
- **Serviço de Roteamento (OSRM)**: O aplicativo consome a API open-source pública do *Open Source Routing Machine (OSRM)* para criar a linha do trajeto viário entre Origem e Destino. A API também devolve distâncias em km e o cálculo de ETA (Tempo Estimado de Chegada), posteriormente processados em polígonos (GeoJSON) no mapa.

---

## 6. Estrutura de Pastas e Boas Práticas

O repositório é projetado seguindo um padrão modular. O núcleo do código vive no diretório `src`:

- **`/src/screens`**: Telas completas que são empilhadas pelo Navigation Router (ex: `DashboardScreen`, `RideDetailsScreen`, `VehicleCheckinScreen`).
- **`/src/components`**: Peças de interface reutilizáveis (como componentes de barra inferior, inputs de endereço ou wrappers visuais de segurança como o `AdminGuard`).
- **`/src/services`**: Acesso à dados e serviços externos encapsulado (`dbService.js` interage com banco de dados; `osrmService.js` faz as chamadas ao serviço de rotas).
- **`/src/contexts`**: Provedores de Contexto do React (Context API) para manter o estado global da aplicação.
- **`/src/hooks`**: Hooks customizados utilizados em todo o aplicativo.
- **`/src/utils`**: Utilitários matemáticos ou literais que operam sem estado.

### Boas Práticas Adotadas
1. **Separação de Camadas (SoC)**: Nenhum componente visual do React realiza a instrução HTTP diretamente. Funções assíncronas chamam serviços que resolvem dados para a UI, mantendo os componentes mais limpos.
2. **Uso Flexível de Temas**: Padronização através do arquivo `theme.js`, onde se hospedam tokens, configurações de paleta de cor, espaçamentos e estilos tipográficos repetitivos.
3. **Controle de Acesso em Tela**: Utilização de componentes de High-Order (HOC) ou Wrappers como `AdminGuard.js`, que encobre componentes filhos e só autoriza sua renderização se o hook de usuário confirmar um perfil administrativo.
