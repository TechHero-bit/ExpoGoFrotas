# 🚚 Logistics Pro — App Mobile

App mobile para gerenciamento de jornadas de técnicos em campo, desenvolvido em React Native com Expo.

---

## 📱 Telas

| Tela | Descrição |
|------|-----------|
| **Dashboard** | Tela inicial com botão "Iniciar Jornada" |
| **Check-in do Veículo** | Localização, selfie, foto da placa, combustível e KM |
| **Jornada em Progresso** | Timer em tempo real, destino e ações de rota |
| **Checkout do Veículo** | Observações, selfie final, foto do veículo e encerramento |

---

## 🚀 Como rodar com Expo Go

### Pré-requisitos

1. **Node.js** (v18 ou superior): https://nodejs.org
2. **Expo CLI**:
   ```bash
   npm install -g expo-cli
   ```
3. **App Expo Go** no seu celular:
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

---

### Instalação

```bash
# 1. Entre na pasta do projeto
cd LogisticsPro

# 2. Instale as dependências
npm install

# 3. Inicie o servidor Expo
npx expo start
```

### Rodando no celular

1. Abra o app **Expo Go** no seu celular
2. Escaneie o **QR Code** que aparece no terminal ou no browser
3. O app vai carregar automaticamente no seu celular ✅

> ⚠️ **Importante**: o celular e o computador precisam estar na **mesma rede Wi-Fi**.

---

## 🏗️ Estrutura do projeto

```
LogisticsPro/
├── App.js                        # Navegação principal
├── app.json                      # Configuração Expo
├── package.json
└── src/
    ├── theme.js                  # Cores, espaçamentos, border radius
    ├── components/
    │   └── BottomTabBar.js       # Barra de navegação inferior
    └── screens/
        ├── DashboardScreen.js         # Tela 1: Dashboard
        ├── VehicleCheckinScreen.js    # Tela 2: Check-in
        ├── JourneyInProgressScreen.js # Tela 3: Jornada
        └── VehicleCheckoutScreen.js   # Tela 4: Checkout
```

---

## 🎨 Identidade Visual

- **Cor primária**: Vermelho escuro `#8B0000`
- **Fundo**: Branco
- **Tipografia**: System font nativa
- **Ícones**: `@expo/vector-icons` (Ionicons)

---

## 🛠️ Tecnologias

- **React Native** + **Expo SDK 51**
- **React Navigation** (Stack Navigator)
- **expo-camera** e **expo-image-picker**
- **@expo/vector-icons**

---

## 📦 Build para produção (opcional)

Para gerar um APK ou enviar para as lojas, use o EAS Build:

```bash
npm install -g eas-cli
eas login
eas build --platform android
```