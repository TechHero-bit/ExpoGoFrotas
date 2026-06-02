# Configuração de Deep Links com Supabase - LogiTrack

## 📌 Visão Geral

Este documento descreve como configurar e implementar deep links para autenticação no LogiTrack usando o custom scheme `logitrack://`.

---

## ✅ PARTE 1: CONFIGURAÇÃO DO PROJETO

### 1.1 Configuração para Expo (RECOMENDADO PARA SEU PROJETO)

O Expo facilita muito a configuração de deep links. Você apenas precisa adicionar a configuração no `app.json`:

#### Arquivo: `app.json`

```json
{
  "expo": {
    "name": "LogiTrack",
    "slug": "logitrack",
    "version": "1.0.0",
    "scheme": "logitrack",
    // ... resto das configurações
  }
}
```

**O que isso faz:**
- Registra o scheme `logitrack://` para iOS e Android
- Qualquer link como `logitrack://` será interceptado pelo seu app
- Você pode usar links como `logitrack://auth-callback?access_token=...`

---

### 1.2 Configuração para React Native CLI Nativo (Se NÃO usar Expo)

Se você estivesse usando React Native CLI puro (sem Expo), aqui está como fazer:

#### Para Android: `android/app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.logisticspro">
    
    <application>
        <activity
            android:name=".MainActivity"
            android:exported="true">
            
            <!-- Deep link configuration -->
            <intent-filter android:label="@string/app_name">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="logitrack" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

#### Para iOS: `ios/LogiTrack/Info.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Deep link configuration -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>com.logisticspro</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>logitrack</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

---

### 1.3 Configuração do Supabase (URL Configuration)

✅ **Você já fez isso**, mas aqui está o resumo:

1. Acesse seu projeto Supabase
2. Vá para **Authentication → URL Configuration**
3. Em **Site URL**, coloque: `logitrack://auth-callback`
4. Em **Redirect URLs**, adicione:
   - `logitrack://auth-callback`
   - `logitrack://` (para mais flexibilidade)
5. Salve as alterações

---

## 🚀 PARTE 2: IMPLEMENTAÇÃO DO CÓDIGO

### 2.1 Hook Customizado: `useDeepLink.js`

Este hook é responsável por:
- Escutar URLs de entrada (cold start e background)
- Extrair tokens do Supabase
- Chamar `setSession()` para autenticar
- Navegar para a tela correta

**Arquivo:** `src/hooks/useDeepLink.js`

```javascript
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

/**
 * Hook que intercepta deep links e processa autenticação
 * @param {function} onAuthSuccess - Callback executado após autenticação bem-sucedida
 * @param {function} onError - Callback executado em caso de erro
 */
export function useDeepLink(onAuthSuccess, onError) {
  useEffect(() => {
    // ✅ Passo 1: Lidar com URL quando app é aberto do zero (cold start)
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      
      if (url != null) {
        console.log('🔗 Deep Link recebido (Cold Start):', url);
        await processDeepLink(url);
      }
    };

    handleInitialURL();

    // ✅ Passo 2: Lidar com URLs quando app já está aberto (foreground/background)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('🔗 Deep Link recebido (Background/Foreground):', url);
      processDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Processa a URL recebida
   * Extrai os tokens do Supabase e faz login
   */
  const processDeepLink = async (url) => {
    try {
      // ✅ Passo 3: Extrair parâmetros da URL
      const parsed = Linking.parse(url);
      
      console.log('📍 URL Parseada:', parsed);
      
      // O Supabase envia os tokens assim:
      // logitrack://#access_token=eyJ...&refresh_token=eyJ...&type=recovery
      const { queryParams, fragment } = parsed;
      
      let accessToken = null;
      let refreshToken = null;
      let tokenType = null;

      // Verificar se há tokens no fragment (after #)
      if (fragment) {
        const params = new URLSearchParams(fragment);
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
        tokenType = params.get('type'); // pode ser 'recovery', 'signup', etc
      }
      
      // Verificar se há tokens na query string (after ?)
      if (!accessToken && queryParams) {
        accessToken = queryParams.access_token;
        refreshToken = queryParams.refresh_token;
        tokenType = queryParams.type;
      }

      if (accessToken && refreshToken) {
        console.log('✅ Tokens encontrados:', {
          accessToken: accessToken.substring(0, 20) + '...',
          refreshToken: refreshToken.substring(0, 20) + '...',
          tokenType
        });

        // ✅ Passo 4: Fazer login com os tokens
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('❌ Erro ao definir sessão:', error);
          onError?.(error);
          return;
        }

        console.log('✅ Autenticação bem-sucedida!', data);
        onAuthSuccess?.();
      } else {
        console.warn('⚠️ Tokens não encontrados na URL');
        onError?.(new Error('Tokens ausentes na URL'));
      }
    } catch (error) {
      console.error('❌ Erro ao processar deep link:', error);
      onError?.(error);
    }
  };
}
```

### 2.2 Hook Alternativo (Versão Simplificada)

Se preferir uma versão mais simples sem os callbacks:

**Arquivo:** `src/hooks/useDeepLinkSimplified.js`

```javascript
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

export function useDeepLinkSimplified() {
  useEffect(() => {
    const checkDeepLink = async () => {
      // Cold start
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleAuth(initialUrl);
      }
    };

    checkDeepLink();

    // Listen for deep link while app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuth(url);
    });

    return () => subscription.remove();
  }, []);

  const handleAuth = async (url) => {
    const { fragment } = Linking.parse(url);
    
    if (!fragment) return;

    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
    }
  };
}
```

---

### 2.3 Integração no App.js

**Arquivo:** `App.js`

```javascript
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useDeepLink } from './src/hooks/useDeepLink'; // ✅ Importar hook
import { supabase } from './src/services/supabase';

// ... suas outras importações

export default function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Usar o hook de deep link aqui
  useDeepLink(
    () => {
      // Callback de sucesso: recarregar sessão
      loadSession();
    },
    (error) => {
      // Callback de erro
      console.error('Erro na autenticação via deep link:', error);
      Alert.alert('Erro', 'Falha ao autenticar. Tente novamente.');
    }
  );

  // Carregar sessão atual
  const loadSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setSession(data?.session);
    } catch (error) {
      console.error('Erro ao carregar sessão:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();

    // Listener para mudanças de autenticação
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Estado de autenticação mudou:', event);
        setSession(session);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationContainer>
          {!session ? (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="SignIn" component={SignInScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </Stack.Navigator>
          ) : (
            <AppTabs userRole={session.user.user_metadata?.role} />
          )}
        </NavigationContainer>
        <StatusBar barStyle="dark-content" />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
```

---

### 2.4 Serviço de Autenticação Melhorado

**Arquivo:** `src/services/authService.js`

```javascript
import { supabase } from './supabase';

export async function signUp({ nome, telefone, email, password }) {
  try {
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, telefone },
        // ✅ Redirecionar para deep link após confirmar email
        emailRedirectTo: 'logitrack://auth-callback'
      }
    });

    if (response.error) {
      throw response.error;
    }

    return response.data;
  } catch (error) {
    console.error('Erro no signup:', error);
    throw error;
  }
}

export async function signIn({ email, password }) {
  try {
    const response = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (response.error) {
      throw response.error;
    }

    return response.data;
  } catch (error) {
    console.error('Erro no signin:', error);
    throw error;
  }
}

export async function signOut() {
  try {
    const response = await supabase.auth.signOut();
    if (response.error) {
      throw response.error;
    }
    return response;
  } catch (error) {
    console.error('Erro no logout:', error);
    throw error;
  }
}

export async function getCurrentSession() {
  try {
    const response = await supabase.auth.getSession();
    if (response.error) {
      throw response.error;
    }
    return response.data?.session ?? null;
  } catch (error) {
    console.error('Erro ao obter sessão:', error);
    throw error;
  }
}

/**
 * Função auxiliar para fazer login com tokens (usada após deep link)
 */
export async function setSessionFromTokens(accessToken, refreshToken) {
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) {
      throw error;
    }

    return data?.session ?? null;
  } catch (error) {
    console.error('Erro ao definir sessão:', error);
    throw error;
  }
}
```

---

## 📱 Como Testar

### Teste Local (Expo)

1. **Inicie o servidor Expo:**
   ```bash
   npx expo start
   ```

2. **No emulador Android, use adb para simular um deep link:**
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "logitrack://auth-callback?access_token=test&refresh_token=test" com.logisticspro
   ```

3. **No simulador iOS, use xcrun:**
   ```bash
   xcrun simctl openurl booted "logitrack://auth-callback?access_token=test&refresh_token=test"
   ```

### Teste em Produção

1. Usuário faz signup no app ou clica em "Esqueci minha senha"
2. Supabase envia e-mail com link de confirmação
3. Link aponta para `logitrack://auth-callback#access_token=...`
4. App intercepta o link
5. Hook extrai tokens e faz login automático
6. Usuário é redirecionado para o dashboard

---

## 🔒 Segurança

- ✅ Os tokens são transmitidos apenas no contexto do seu app (scheme logitrack://)
- ✅ O Supabase valida tokens automaticamente
- ✅ Tokens expiram em 1 hora (configurável)
- ✅ Refresh tokens permitem renovar sem login novo

---

## 📚 Referências

- [Expo Linking Documentation](https://docs.expo.dev/guides/linking/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking)

